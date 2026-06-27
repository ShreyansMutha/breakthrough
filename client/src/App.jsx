import { useEffect, useState } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import Board from './components/Board';

const RANDOM_NAMES = [
  'Pixel', 'Nova', 'Echo', 'Blitz', 'Mochi',
  'Ziggy', 'Flick', 'Hex', 'Jazz', 'Karma',
  'Luna', 'Neon', 'Onyx', 'Pulse', 'Quirk',
  'Rune', 'Spark', 'Tide', 'Vibe', 'Wisp',
  'Zen', 'Arc', 'Bolt', 'Frost', 'Jade',
];

function randomName(used = []) {
  const pool = RANDOM_NAMES.filter((n) => !used.includes(n));
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  return 'Player' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function loadSaved() {
  try {
    const raw = localStorage.getItem('qr');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function save({ code, name }) {
  try { localStorage.setItem('qr', JSON.stringify({ code, name })); } catch {}
}

function clearSaved() {
  try { localStorage.removeItem('qr'); } catch {}
}

export default function App() {
  const [room, setRoom] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [error, setError] = useState('');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const onRoomUpdate = (r) => {
      setRoom(r);
      if (r?.state?.winner === null) setOpponentLeft(false);
    };
    const onOpponentLeft = () => setOpponentLeft(true);
    socket.on('roomUpdate', onRoomUpdate);
    socket.on('opponentLeft', onOpponentLeft);
    return () => {
      socket.off('roomUpdate', onRoomUpdate);
      socket.off('opponentLeft', onOpponentLeft);
    };
  }, []);

  useEffect(() => {
    const saved = loadSaved();
    if (!saved || !saved.code || !saved.name) return;
    setReconnecting(true);

    const onError = () => { setReconnecting(false); clearSaved(); };
    const timeout = setTimeout(() => { socket.off('connect_error', onError); setReconnecting(false); }, 5000);
    socket.on('connect_error', onError);

    socket.emit('rejoin', { name: saved.name, code: saved.code }, (res) => {
      clearTimeout(timeout);
      socket.off('connect_error', onError);
      setReconnecting(false);
      if (res.ok) {
        setPlayerIndex(res.playerIndex);
        setRoom(res);
      } else {
        clearSaved();
      }
    });
  }, []);

  const createRoom = (name, playerCount = 2) => {
    setError('');
    const finalName = name?.trim() || randomName();
    socket.emit('createRoom', { name: finalName, playerCount }, (res) => {
      if (res.ok) {
        setPlayerIndex(res.playerIndex);
        setRoom(res);
        save({ code: res.code, name: finalName });
      } else {
        setError(res.error || 'Could not create room');
      }
    });
  };

  const joinRoom = (name, code) => {
    setError('');
    const finalName = name?.trim() || randomName();
    socket.emit('joinRoom', { name: finalName, code }, (res) => {
      if (res.ok) {
        setPlayerIndex(res.playerIndex);
        setRoom(res);
        save({ code: res.code, name: finalName });
      } else {
        setError(res.error || 'Could not join room');
      }
    });
  };

  const spectateRoom = (name, code) => {
    setError('');
    const finalName = name?.trim() || 'Spectator';
    socket.emit('joinAsSpectator', { name: finalName, code }, (res) => {
      if (res.ok) {
        setIsSpectator(true);
        setPlayerIndex(null);
        setRoom(res);
      } else {
        setError(res.error || 'Could not spectate');
      }
    });
  };

  const sendMove = (move) => {
    socket.emit('move', { code: room.code, move }, (res) => {
      setError(res.ok ? '' : res.error || 'Illegal move');
    });
  };

  const rematch = () => {
    setOpponentLeft(false);
    socket.emit('rematch', { code: room.code });
  };

  const addBot = (difficulty) => {
    socket.emit('addBot', { code: room.code, difficulty }, (res) => {
      if (!res.ok) setError(res.error || 'Could not add bot');
    });
  };

  const leave = () => {
    setRoom(null);
    setPlayerIndex(null);
    setIsSpectator(false);
    setOpponentLeft(false);
    setReconnecting(false);
    setError('');
    clearSaved();
    setTimeout(() => location.reload(), 2000);
  };

  if (reconnecting) {
    return (
      <div className="screen">
        <div className="panel center">
          <p className="tagline">Reconnecting…</p>
          <div className="overlay-actions" style={{ marginTop: 16 }}>
            <button className="btn" onClick={leave}>Leave</button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return <Lobby onCreate={createRoom} onJoin={joinRoom} onSpectate={spectateRoom} error={error} />;
  }

  return (
    <Board
      room={room}
      playerIndex={playerIndex}
      isSpectator={isSpectator}
      onMove={sendMove}
      onRematch={rematch}
      onLeave={leave}
      onAddBot={addBot}
      error={error}
      opponentLeft={opponentLeft}
    />
  );
}
