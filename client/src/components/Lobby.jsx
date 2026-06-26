import { useState } from 'react';

const PRESETS = [2, 3, 4];

const RANDOM_NAMES = [
  'Pixel', 'Nova', 'Echo', 'Blitz', 'Mochi',
  'Ziggy', 'Flick', 'Hex', 'Jazz', 'Karma',
  'Luna', 'Neon', 'Onyx', 'Pulse', 'Quirk',
  'Rune', 'Spark', 'Tide', 'Vibe', 'Wisp',
  'Zen', 'Arc', 'Bolt', 'Frost', 'Jade',
];

function randomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

export default function Lobby({ onCreate, onJoin, onSpectate, error }) {
  const [name, setName] = useState(randomName);
  const [code, setCode] = useState('');
  const [playerCount, setPlayerCount] = useState(2);

  return (
    <div className="screen lobby">
      <div className="lobby-card">
        <div className="lobby-header">
          <h1 className="lobby-title">Breakthrough</h1>
          <p className="lobby-desc">
            Race your pawn to the far side. Drop walls to trap your rivals, but never seal
            their only path. First one across wins.
          </p>
        </div>

        <div className="lobby-body">
          <div className="lobby-section">
            <label className="lobby-label">Your name</label>
            <input
              className="lobby-input"
              value={name}
              maxLength={16}
              placeholder="e.g. Shreyans"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="lobby-section">
            <label className="lobby-label">Players</label>
            <div className="lobby-presets">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  className={`lobby-preset ${playerCount === n ? 'sel' : ''}`}
                  onClick={() => setPlayerCount(n)}
                >{n}</button>
              ))}
            </div>
          </div>

          <button className="lobby-create" onClick={() => onCreate(name, playerCount)}>
            Create a room
          </button>

          <div className="lobby-divider"><span>or join a friend</span></div>

          <div className="lobby-join">
            <input
              className="lobby-code"
              value={code}
              maxLength={4}
              placeholder="CODE"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && onJoin(name, code)}
            />
            <button className="lobby-join-btn" onClick={() => onJoin(name, code)}>
              Join
            </button>
            <button className="lobby-join-btn spectate" onClick={() => onSpectate?.(name, code)}>
              👁
            </button>
          </div>
        </div>

        {error && <p className="lobby-error">{error}</p>}
      </div>
    </div>
  );
}
