import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  joinRoom,
  rejoinRoom,
  getRoom,
  resetRoom,
  removeRoom,
  findRoomBySocket,
  joinAsSpectator,
  removeSpectator,
} from './rooms.js';
import { applyMove, initialState } from './quoridor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

function publicState(room) {
  return {
    code: room.code,
    playerCount: room.playerCount,
    started: room.started,
    players: room.players.map((p) => p.name),
    spectators: room.spectators.map((s) => s.name),
    state: room.state,
    rematchReady: room.rematchReady || Array.from({ length: room.playerCount || 2 }, () => false),
  };
}

function broadcast(room) {
  io.to(room.code).emit('roomUpdate', publicState(room));
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, playerCount = 2 } = {}, cb) => {
    const room = createRoom(
      { id: socket.id, name: name?.trim() || 'Player 1' },
      playerCount,
    );
    socket.join(room.code);
    socket.data.code = room.code;
    socket.data.playerIndex = 0;
    cb?.({ ok: true, playerIndex: 0, ...publicState(room) });
  });

  socket.on('joinRoom', ({ name, code } = {}, cb) => {
    const normalized = (code || '').toUpperCase().trim();
    const room = getRoom(normalized);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    const cleanName = name?.trim() || 'Player';
    if (room.players.some((p) => p.name === cleanName))
      return cb?.({ ok: false, error: 'Name already taken' });
    const res = joinRoom(normalized, { id: socket.id, name: cleanName });
    if (res.error) return cb?.({ ok: false, error: res.error });
    socket.join(normalized);
    socket.data.code = normalized;
    socket.data.playerIndex = res.playerIndex;
    cb?.({ ok: true, playerIndex: res.playerIndex, ...publicState(res.room) });
    broadcast(res.room);
  });

  socket.on('rejoin', ({ name, code } = {}, cb) => {
    const normalized = (code || '').toUpperCase().trim();
    const cleanName = name?.trim() || 'Player';
    const res = rejoinRoom(normalized, { id: socket.id, name: cleanName });
    if (res.error) return cb?.({ ok: false, error: res.error });
    socket.join(normalized);
    socket.data.code = normalized;
    socket.data.playerIndex = res.playerIndex;
    const room = res.room;
    if (room.state && room.state.disconnected) {
      room.state.disconnected[res.playerIndex] = false;
    }
    cb?.({ ok: true, playerIndex: res.playerIndex, ...publicState(room) });
    broadcast(room);
  });

  socket.on('move', ({ code, move } = {}, cb) => {
    const room = getRoom(code);
    if (!room) return cb?.({ ok: false, error: 'Room not found' });
    if (!room.started) return cb?.({ ok: false, error: 'Game has not started' });

    const pi = socket.data.playerIndex;
    if (pi === undefined) return cb?.({ ok: false, error: 'You are not in this room' });

    const result = applyMove(room.state, pi, move);
    if (!result.ok) return cb?.({ ok: false, error: result.error });

    cb?.({ ok: true });
    broadcast(room);
  });

  socket.on('rematch', ({ code } = {}) => {
    const room = getRoom(code);
    if (!room) return;
    const pi = socket.data.playerIndex;
    if (pi === undefined) return;
    if (!room.rematchReady) room.rematchReady = Array.from({ length: room.playerCount }, () => false);
    room.rematchReady[pi] = true;

    const allReady = room.players.every((p, i) => {
      const s = io.sockets.sockets.get(p.id);
      const connected = s && s.connected;
      return !connected || room.rematchReady[i];
    });

    if (allReady) {
      room.state = initialState(room.playerCount);
      room.state.disconnected = room.players.map((p) => {
        const s = io.sockets.sockets.get(p.id);
        return !(s && s.connected);
      });
      let t = 0;
      while (room.state.disconnected[t] && t < room.state.playerCount) t++;
      if (t < room.state.playerCount) room.state.turn = t;
      room.rematchReady = Array.from({ length: room.playerCount }, () => false);
    }
    broadcast(room);
  });

  socket.on('joinAsSpectator', ({ name, code } = {}, cb) => {
    const normalized = (code || '').toUpperCase().trim();
    const cleanName = name?.trim() || 'Spectator';
    const res = joinAsSpectator(normalized, socket, cleanName);
    if (res.error) return cb?.({ ok: false, error: res.error });
    socket.join(normalized);
    socket.data.code = normalized;
    socket.data.isSpectator = true;
    cb?.({ ok: true, spectatorIndex: res.spectatorIndex, ...publicState(res.room) });
    broadcast(res.room);
  });

  socket.on('chatMessage', ({ code, text } = {}) => {
    const room = getRoom(code);
    if (!room) return;
    const text2 = text?.trim()?.slice(0, 200);
    if (!text2) return;
    if (socket.data.isSpectator) {
      const spec = room.spectators.find((s) => s.id === socket.id);
      io.to(code).emit('chatMessage', { playerIndex: -1, name: spec?.name || 'Spectator', text: text2 });
    } else {
      const pi = socket.data.playerIndex;
      if (pi === undefined) return;
      const name = room.players[pi]?.name || 'Unknown';
      io.to(code).emit('chatMessage', { playerIndex: pi, name, text: text2 });
    }
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    const pi = room.players.findIndex(p => p.id === socket.id);
    if (pi !== -1) {
      if (room.state) {
        room.state.disconnected[pi] = true;
        io.to(room.code).emit('opponentLeft');

        if (room.state.winner === null) {
          let next = room.state.turn;
          if (next === pi) {
            next = (pi + 1) % room.state.playerCount;
            while (room.state.disconnected[next] && next !== pi) {
              next = (next + 1) % room.state.playerCount;
            }
            room.state.turn = next;
          }
        }
      }
      broadcast(room);

      setTimeout(() => {
        const stillHasPlayers = room.players.some((p) => {
          const s = io.sockets.sockets.get(p.id);
          return s && s.connected;
        });
        if (!stillHasPlayers) {
          removeRoom(room.code);
        }
      }, 30000);
    } else {
      removeSpectator(room.code, socket.id);
      broadcast(room);
    }
  });
});

// In production, serve the built client files
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3005;
httpServer.listen(PORT, () => console.log(`Breakthrough server listening on :${PORT}`));
