import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { legalPawnMoves, canPlaceWall } from '../quoridor';
import BoardScene from './BoardScene';

function dirsForPlayer(pi) {
  const side = pi % 4;
  switch (side) {
    case 0: return { forward: [-1, 0], back: [1, 0], left: [0, -1], right: [0, 1] };
    case 1: return { forward: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] };
    case 2: return { forward: [1, 0], back: [-1, 0], left: [0, 1], right: [0, -1] };
    case 3: return { forward: [0, 1], back: [0, -1], left: [1, 0], right: [-1, 0] };
  }
}

const VIEWS = [
  { id: 'board', label: 'Board' },
  { id: 'fp', label: '3rd' },
];
const ACTIONS = [
  { id: 'move', label: 'Move' },
  { id: 'wallH', label: '↔' },
  { id: 'wallV', label: '↕' },
];

export default function Board({ room, playerIndex, onMove, onRematch, onLeave, error, opponentLeft }) {
  const [mode, setMode] = useState('move');
  const [view, setView] = useState('board');
  const [hover, setHover] = useState(null);

  const { state, started, players, code } = room;
  const myTurn = started && state.turn === playerIndex && state.winner === null;
  const wallsLeft = started ? state.wallsLeft[playerIndex] : 0;
  const moves = myTurn && mode === 'move' ? legalPawnMoves(state, playerIndex) : [];

  const DIR = dirsForPlayer(playerIndex);

  const tryStep = (sem) => {
    if (!myTurn || mode !== 'move') return;
    const [dr, dc] = DIR[sem];
    const me = state.pawns[playerIndex];
    const target = moves.find((m) =>
      dr !== 0
        ? m.c === me.c && Math.sign(m.r - me.r) === Math.sign(dr)
        : m.r === me.r && Math.sign(m.c - me.c) === Math.sign(dc)
    );
    if (target) onMove({ type: 'pawn', r: target.r, c: target.c });
  };

  const stepRef = useRef(tryStep);
  stepRef.current = tryStep;

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      let sem = null;
      if (k === 'arrowup' || k === 'w') sem = 'forward';
      else if (k === 'arrowdown' || k === 's') sem = 'back';
      else if (k === 'arrowleft' || k === 'a') sem = 'left';
      else if (k === 'arrowright' || k === 'd') sem = 'right';
      if (sem) { e.preventDefault(); stepRef.current(sem); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const orientation = mode === 'wallH' ? 'H' : 'V';
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
          <span className="hud-room">{code}</span>
          <button className="hud-pill" onClick={onLeave}>Leave</button>
        </div>
      </div>

      <div className="hud-panel">
        <div className="hud-panel-row">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`hud-pill ${view === v.id ? 'sel' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="hud-panel-row">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className={`hud-pill ${mode === a.id ? 'sel' : ''}`}
              onClick={() => a.id === 'move' ? setMode('move') : chooseWall(a.id)}
              disabled={a.id !== 'move' && (!myTurn || wallsLeft === 0)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="hud-error">{error}</div>}

      {(state.winner !== null || opponentLeft) && (
        <div className="overlay">
          <div className="panel center">
            {opponentLeft ? (
              <>
                <h1 className="title">Player left</h1>
                <p className="tagline">Someone disconnected.</p>
                <button className="btn primary" onClick={onLeave}>Back to lobby</button>
              </>
            ) : (
              <>
                <h1 className="title">{state.winner === playerIndex ? 'You win!' : `${players[state.winner]} wins!`}</h1>
                <p className="tagline">{state.winner === playerIndex ? 'You crossed the board first.' : `${players[state.winner]} got across first.`}</p>
                <div className="overlay-actions">
                  <button className="btn primary" onClick={onRematch}>Rematch</button>
                  <button className="btn ghost" onClick={onLeave}>Leave</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
