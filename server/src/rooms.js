import { initialState } from './quoridor.js';

const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

export function createRoom(host, playerCount = 2) {
  const code = genCode();
  const pc = Math.max(2, Math.min(playerCount, 4));
  const room = {
    code,
    playerCount: pc,
    players: [host],
    spectators: [],
    state: null,
    started: false,
    rematchReady: Array.from({ length: pc }, () => false),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code);
}

export function joinRoom(code, player) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= room.playerCount) return { error: 'Room is full' };
  room.players.push(player);
  if (room.players.length === room.playerCount) {
    room.started = true;
    room.state = initialState(room.playerCount);
  }
  return { room, playerIndex: room.players.length - 1 };
}

export function rejoinRoom(code, player) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  const existing = room.players.findIndex((p) => p.name === player.name);
  if (existing !== -1) {
    room.players[existing].id = player.id;
    return { room, playerIndex: existing, reconnected: true };
  }
  if (room.players.length >= room.playerCount) return { error: 'Room is full' };
  room.players.push(player);
  return { room, playerIndex: room.players.length - 1 };
}

export function resetRoom(code) {
  const room = rooms.get(code);
  if (room) {
    room.state = initialState(room.playerCount);
    room.started = true;
    room.winner = null;
    room.rematchReady = Array.from({ length: room.playerCount }, () => false);
  }
  return room;
}

export function removeRoom(code) {
  rooms.delete(code);
}

export function joinAsSpectator(code, socket, name) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  room.spectators.push({ id: socket.id, name });
  return { room, spectatorIndex: room.spectators.length - 1 };
}

export function removeSpectator(code, socketId) {
  const room = rooms.get(code);
  if (!room) return;
  room.spectators = room.spectators.filter((s) => s.id !== socketId);
}

export function addBotToRoom(code, difficulty) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= room.playerCount) return { error: 'Room is full' };
  const botNames = { easy: 'Easy Bot', medium: 'Medium Bot', hard: 'Hard Bot' };
  const bot = {
    id: `bot-${code}-${room.players.length}-${Date.now()}`,
    name: botNames[difficulty] || 'Bot',
    bot: true,
    botDifficulty: difficulty,
  };
  const pi = room.players.length;
  room.players.push(bot);
  if (room.players.length === room.playerCount) {
    room.started = true;
    room.state = initialState(room.playerCount);
  }
  return { playerIndex: pi, room };
}

export function removeBotForJoin(code) {
  const room = rooms.get(code);
  if (!room) return null;
  const botIdx = room.players.findIndex((p) => p.bot);
  if (botIdx === -1) return null;
  const removed = room.players.splice(botIdx, 1);
  return removed[0];
}

export function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId)) return room;
    if (room.spectators.some((s) => s.id === socketId)) return room;
  }
  return null;
}
