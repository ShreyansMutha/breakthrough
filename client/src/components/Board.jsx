import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { legalPawnMoves, canPlaceWall, COLORS, playerSide } from '../quoridor';

function wallOrientation(mode, pi, pc) {
  const side = playerSide(pi, pc);
  const base = mode === 'wallH' ? 'H' : 'V';
  return (side === 1 || side === 3) ? (base === 'H' ? 'V' : 'H') : base;
}
import BoardScene from './BoardScene';

const ACTIONS = [
  { id: 'move', icon: '♟' },
  { id: 'wallH', icon: '▬' },
  { id: 'wallV', icon: '▯' },
];

export default function Board({ room, playerIndex, onMove, onRematch, onLeave, error, opponentLeft }) {
  const [mode, setMode] = useState('move');
  const [view, setView] = useState('board');
  const [hover, setHover] = useState(null);
  const toggleView = () => setView(v => v === 'board' ? 'fp' : 'board');

  const { state, started, players, code, rematchReady } = room;
  const myTurn = started && state.turn === playerIndex && state.winner === null;
  const wallsLeft = started ? state.wallsLeft[playerIndex] : 0;
  const moves = myTurn && mode === 'move' ? legalPawnMoves(state, playerIndex) : [];
  const iRematched = rematchReady?.[playerIndex];

  if (!started) {
    const need = state ? state.playerCount : (room.playerCount || 2);
    const waiting = `Waiting for players (${players.length}/${need})…`;
    return (
      <div className="screen">
        <div className="panel center">
          <h1 className="title">Breakthrough</h1>
          <p className="tagline">{waiting}</p>
          <p className="tagline">Share this code so friends can join:</p>
          <div className="code-badge">{code}</div>
          <button className="btn" onClick={onLeave}>Leave</button>
        </div>
      </div>
    );
  }

  const legalSet = new Set(moves.map((m) => `${m.r},${m.c}`));
  const orientation = wallOrientation(mode, playerIndex, state.playerCount);
  const wallValid = !!hover && wallsLeft > 0 && canPlaceWall(state, orientation, hover.r, hover.c);

  const handleCellClick = (r, c) => {
    if (myTurn && mode === 'move' && legalSet.has(`${r},${c}`))
      onMove({ type: 'pawn', r, c });
  };
  const handleWallPlace = (r, c) => {
    if (!myTurn || mode === 'move') return;
    if (wallsLeft > 0 && canPlaceWall(state, orientation, r, c)) {
      onMove({ type: 'wall', orientation, r, c });
      setHover(null);
    }
  };
  const chooseWall = (m) => { setMode(m); setView('board'); };

  return (
    <div className="screen game" style={{ padding: 0, minHeight: '100vh', background: '#0f1320' }}>
      <div className="scene-wrap-full">
        <Canvas
          style={{ width: '100vw', height: '100vh', display: 'block' }}
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, (state.size || 9) * 2.5, (state.size || 9) * 2.5], fov: 40 }}
          onPointerMissed={() => setHover(null)}
        >
          <BoardScene
            state={state}
            playerIndex={playerIndex}
            names={players}
            mode={mode}
            view={view}
            legalSet={legalSet}
            onCellClick={handleCellClick}
            onWallPlace={handleWallPlace}
            hover={hover}
            setHover={setHover}
            orientation={orientation}
            wallValid={wallValid}
          />
        </Canvas>
      </div>

      <div className="hud-top">
        <div className="hud-left-group">
          <button className="hud-pill" onClick={toggleView}>
            {view === 'board' ? 'Board' : 'Person'}
          </button>
          <span className="hud-room">{code}</span>
          <button className="hud-pill" onClick={onLeave}>Leave</button>
        </div>
      </div>

      <div className="hud-panel">
        <div className="hud-panel-row">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className={`hud-action-btn ${mode === a.id ? 'sel' : ''}`}
              onClick={() => a.id === 'move' ? setMode('move') : chooseWall(a.id)}
              disabled={a.id !== 'move' && (!myTurn || wallsLeft === 0)}
            >
              <span className="icon">{a.icon}</span>
          </button>
          ))}
        </div>
      </div>

      {started && (
        <div className="hud-players">
          {players.map((name, i) => {
            const clr = COLORS[i % COLORS.length];
            const left = state.disconnected?.[i];
            return (
              <div key={i} className={`hud-player${state.turn === i && !left ? ' turn' : ''}`} style={{ opacity: left ? 0.35 : 1 }}>
                <span className="hud-swatch" style={{ background: left ? '#64748b' : clr }} />
                <span className="hud-pname">{left ? `${name} (left)` : name}</span>
                <span className="hud-walls" style={{ color: left ? '#64748b' : 'var(--wall)' }}>{state.wallsLeft?.[i] ?? 0}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="hud-error">{error}</div>}

      {state.winner !== null ? (
        <div className="overlay">
          <div className="panel center">
            <h1 className="title">{state.winner === playerIndex ? 'You win!' : `${players[state.winner]} wins!`}</h1>
            <p className="tagline">{state.winner === playerIndex ? 'You crossed the board first.' : `${players[state.winner]} got across first.`}</p>
            <div className="overlay-actions">
              {iRematched ? (
                <p className="tagline" style={{ margin: 0 }}>Waiting for others to rematch…</p>
              ) : (
                <button className="btn primary" onClick={onRematch}>Rematch</button>
              )}
              <button className="btn ghost" onClick={onLeave}>Leave</button>
            </div>
          </div>
        </div>
      ) : opponentLeft ? (
        <div className="overlay">
          <div className="panel center">
            <h1 className="title">Player left</h1>
            <p className="tagline">Someone disconnected.</p>
            <button className="btn primary" onClick={onLeave}>Back to lobby</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
