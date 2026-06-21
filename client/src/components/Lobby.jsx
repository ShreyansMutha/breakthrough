import { useState } from 'react';

const PRESETS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function Lobby({ onCreate, onJoin, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [playerCount, setPlayerCount] = useState(2);

  return (
    <div className="screen lobby">
      <div className="panel">
        <h1 className="title">Breakthrough</h1>
        <p className="tagline">
          Race your pawn to the far side. Drop walls to trap your rivals — but never seal
          their only path. First one across wins.
        </p>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={16}
            placeholder="e.g. Shreyans"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Players</span>
          <div className="preset-row">
            {PRESETS.map((n) => (
              <button
                key={n}
                className={`preset-btn ${playerCount === n ? 'sel' : ''}`}
                onClick={() => setPlayerCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        <button className="btn primary block" onClick={() => onCreate(name, playerCount)}>
          Create a room
        </button>

        <div className="divider"><span>or join a friend</span></div>

        <div className="join-row">
          <input
            className="code-input"
            value={code}
            maxLength={4}
            placeholder="CODE"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onJoin(name, code)}
          />
          <button className="btn" onClick={() => onJoin(name, code)}>
            Join
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
