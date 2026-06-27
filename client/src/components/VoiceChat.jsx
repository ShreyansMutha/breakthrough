import { useState, useEffect } from 'react';
import { subscribe, toggleMic, toggleSpeaker } from '../voice';

export default function VoiceChat({ isSpectator }) {
  const [state, setState] = useState({ supported: false, active: false, micEnabled: false, speakerEnabled: true });

  useEffect(() => {
    return subscribe(setState);
  }, []);

  if (!state.supported || isSpectator) return null;

  return (
    <div className="voice-wrap">
      <button
        className={`voice-btn${state.micEnabled ? ' on' : ' off'}`}
        onClick={toggleMic}
        title={state.micEnabled ? 'Mute mic' : 'Unmute mic'}
      >
        {state.micEnabled ? '🎤' : '🔇'}
      </button>
      <button
        className={`voice-btn${state.speakerEnabled ? ' on' : ' off'}`}
        onClick={toggleSpeaker}
        title={state.speakerEnabled ? 'Mute speaker' : 'Unmute speaker'}
        disabled={!state.active}
      >
        {state.speakerEnabled ? '🔊' : '🔇'}
      </button>
    </div>
  );
}
