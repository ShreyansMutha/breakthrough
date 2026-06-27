import { socket } from './socket';

let localStream = null;
let peerConnections = {};
let peerAudio = {};
let _micEnabled = false;
let _speakerEnabled = true;
let _listeners = [];
let _code = '';
let _myPi = -1;
let _voiceActivated = false;

const STORAGE_KEY = 'breakthrough_voice_activated';

function notify() {
  _listeners.forEach(fn => fn(getState()));
}

export function getState() {
  return {
    micEnabled: _micEnabled,
    speakerEnabled: _speakerEnabled,
    supported: !!navigator.mediaDevices?.getUserMedia,
    active: !!localStream,
  };
}

export function subscribe(fn) {
  _listeners.push(fn);
  fn(getState());
  return () => { _listeners = _listeners.filter(f => f !== fn); };
}

export async function toggleMic() {
  if (!localStream) {
    const ok = await activateVoice();
    if (!ok) {
      notify();
      return;
    }
    _micEnabled = true;
    localStream.getAudioTracks().forEach(t => t.enabled = true);
  } else {
    _micEnabled = !_micEnabled;
    localStream.getAudioTracks().forEach(t => t.enabled = _micEnabled);
  }
  notify();
}

export function toggleSpeaker() {
  _speakerEnabled = !_speakerEnabled;
  Object.values(peerAudio).forEach(el => el.muted = !_speakerEnabled);
  notify();
}

function closePeer(remotePi) {
  if (peerConnections[remotePi]) {
    peerConnections[remotePi].close();
    delete peerConnections[remotePi];
  }
  if (peerAudio[remotePi]) {
    peerAudio[remotePi].pause();
    peerAudio[remotePi].srcObject = null;
    delete peerAudio[remotePi];
  }
}

function createPeerConnection(remotePi) {
  closePeer(remotePi);

  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  const audio = new Audio();
  audio.autoplay = true;
  audio.muted = !_speakerEnabled;
  peerAudio[remotePi] = audio;

  pc.ontrack = (event) => {
    audio.srcObject = event.streams[0];
    audio.play().catch(() => {});
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice-signal', { code: _code, to: remotePi, data: { type: 'ice', candidate: event.candidate } });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') {
      closePeer(remotePi);
    }
  };

  peerConnections[remotePi] = pc;
  return pc;
}

async function initiateOffer(remotePi) {
  if (peerConnections[remotePi]) return;
  const pc = createPeerConnection(remotePi);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-signal', { code: _code, to: remotePi, data: { type: 'offer', sdp: pc.localDescription } });
}

async function activateVoice() {
  if (localStream) return true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.getAudioTracks().forEach(t => t.enabled = _micEnabled);
  } catch {
    return false;
  }
  _voiceActivated = true;
  localStorage.setItem(STORAGE_KEY, 'true');
  socket.emit('voice-join', { code: _code });
  notify();
  return true;
}

function setupSocketListeners() {
  socket.off('voice-signal');
  socket.off('voice-joined');
  socket.off('voice-left');
  socket.off('voice-room-state');

  socket.on('voice-signal', async ({ from, to, data }) => {
    if (to !== _myPi) return;
    if (!peerConnections[from]) createPeerConnection(from);
    const pc = peerConnections[from];
    try {
      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice-signal', { code: _code, to: from, data: { type: 'answer', sdp: pc.localDescription } });
      } else if (data.type === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else if (data.type === 'ice') {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch {}
  });

  socket.on('voice-joined', async ({ from }) => {
    if (from === _myPi) return;
    if (peerConnections[from]) return;
    if (_myPi < from) {
      await initiateOffer(from);
    } else {
      createPeerConnection(from);
    }
  });

  socket.on('voice-room-state', ({ participants }) => {
    for (const pi of participants) {
      if (pi === _myPi) continue;
      if (peerConnections[pi]) continue;
      if (_myPi < pi) {
        initiateOffer(pi);
      } else {
        createPeerConnection(pi);
      }
    }
  });

  socket.on('voice-left', ({ from }) => {
    closePeer(from);
  });
}

export async function initVoice(code, myPi, playerCount) {
  if (!navigator.mediaDevices?.getUserMedia) return false;

  _code = code;
  _myPi = myPi;
  _voiceActivated = localStorage.getItem(STORAGE_KEY) === 'true';

  setupSocketListeners();

  if (_voiceActivated) {
    const ok = await activateVoice();
    if (!ok) {
      _voiceActivated = false;
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  notify();
  return true;
}

export function destroyVoice() {
  Object.keys(peerConnections).forEach(pi => closePeer(parseInt(pi)));
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  socket.off('voice-signal');
  socket.off('voice-joined');
  socket.off('voice-left');
  socket.off('voice-room-state');
  _code = '';
  _myPi = -1;
  notify();
}
