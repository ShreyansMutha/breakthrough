import { socket } from './socket';

let localStream = null;
let peerConnections = {};
let peerAudio = {};
let _micEnabled = true;
let _speakerEnabled = true;
let _listeners = [];
let _code = '';
let _myPi = -1;

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

export function toggleMic() {
  _micEnabled = !_micEnabled;
  if (localStream) {
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
  const pc = createPeerConnection(remotePi);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-signal', { code: _code, to: remotePi, data: { type: 'offer', sdp: pc.localDescription } });
}

export async function initVoice(code, myPi, playerCount) {
  if (!navigator.mediaDevices?.getUserMedia) return false;

  _code = code;
  _myPi = myPi;

  socket.off('voice-signal');
  socket.off('voice-joined');
  socket.off('voice-left');

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
    if (_myPi < from) {
      await initiateOffer(from);
    } else {
      createPeerConnection(from);
    }
  });

  socket.on('voice-left', ({ from }) => {
    closePeer(from);
  });

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    return false;
  }

  socket.emit('voice-join', { code: _code, pi: _myPi });
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
  _code = '';
  _myPi = -1;
  notify();
}
