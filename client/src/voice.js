import { socket } from './socket';

let localStream = null;
let peerConnections = {};
let peerAudio = {};
let _micEnabled = true;
let _speakerEnabled = true;
let _listeners = [];

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

function createPeerConnection(remotePi, code) {
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
      socket.emit('voice-signal', { code, to: remotePi, data: { type: 'ice', candidate: event.candidate } });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      pc.close();
      delete peerConnections[remotePi];
      delete peerAudio[remotePi];
    }
  };

  peerConnections[remotePi] = pc;
  return pc;
}

export async function initVoice(code, myPi, playerCount) {
  if (!navigator.mediaDevices?.getUserMedia) return false;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    return false;
  }

  socket.on('voice-signal', async ({ from, to, data }) => {
    if (to !== myPi) return;

    if (!peerConnections[from]) {
      createPeerConnection(from, code);
    }

    const pc = peerConnections[from];

    try {
      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice-signal', { code, to: from, data: { type: 'answer', sdp: pc.localDescription } });
      } else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'ice') {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch {}
  });

  const remoteIndices = Array.from({ length: playerCount }, (_, i) => i).filter(i => i !== myPi);

  for (const pi of remoteIndices) {
    if (myPi < pi) {
      const pc = createPeerConnection(pi, code);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice-signal', { code, to: pi, data: { type: 'offer', sdp: pc.localDescription } });
    }
  }

  notify();
  return true;
}

export function destroyVoice() {
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  Object.values(peerAudio).forEach(el => {
    el.pause();
    el.srcObject = null;
  });
  peerAudio = {};
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  socket.off('voice-signal');
  notify();
}
