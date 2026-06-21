import { io } from 'socket.io-client';

const URL = 'http://localhost:3001';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const ok = (name, cond) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.log('  FAIL:', name);
  }
};
const emit = (sock, ev, payload) =>
  new Promise((res) => sock.emit(ev, payload, res));
const waitConnect = (sock) =>
  new Promise((res) => {
    if (sock.connected) res();
    else sock.once('connect', res);
  });

const safety = setTimeout(() => {
  console.log('SAFETY TIMEOUT — aborting');
  process.exit(1);
}, 15000);
safety.unref?.();

const a = io(URL, { forceNew: true });
const b = io(URL, { forceNew: true });

let aUpdate = null;
let bUpdate = null;
a.on('roomUpdate', (r) => { aUpdate = r; });
b.on('roomUpdate', (r) => { bUpdate = r; });

await waitConnect(a);
await waitConnect(b);

// Host creates a room
const created = await emit(a, 'createRoom', { name: 'Alice' });
ok('createRoom ok', created.ok && created.playerIndex === 0);
ok('room code is 4 chars', /^[A-Z2-9]{4}$/.test(created.code));
ok('room not started with 1 player', created.started === false);
const code = created.code;

// Second player joins
const joined = await emit(b, 'joinRoom', { name: 'Bob', code });
ok('joinRoom ok as player 1', joined.ok && joined.playerIndex === 1);
ok('room started after join', joined.started === true);

await wait(150); // let broadcasts land
ok('host received roomUpdate on join', aUpdate && aUpdate.started === true);
ok('host sees both player names', aUpdate && aUpdate.players.join(',') === 'Alice,Bob');

// Joining a full room should fail
const c = io(URL, { forceNew: true });
await waitConnect(c);
const full = await emit(c, 'joinRoom', { name: 'Carol', code });
ok('joining full room rejected', !full.ok && /full/i.test(full.error));

// Bad room code (still on the open socket)
const bad = await emit(c, 'joinRoom', { name: 'X', code: 'ZZZZ' });
ok('joining unknown room rejected', !bad.ok);
c.close();

// Player 1 cannot move on player 0's turn
const wrongTurn = await emit(b, 'move', { code, move: { type: 'pawn', r: 1, c: 4 } });
ok('out-of-turn move rejected', !wrongTurn.ok);

// Player 0 makes a legal pawn move
const mv1 = await emit(a, 'move', { code, move: { type: 'pawn', r: 7, c: 4 } });
ok('p0 pawn move accepted', mv1.ok);
await wait(120);
ok('both clients see p0 at (7,4)', aUpdate.state.pawns[0].r === 7 && bUpdate.state.pawns[0].r === 7);
ok('turn passed to p1', aUpdate.state.turn === 1);

// Player 1 places a wall
const mv2 = await emit(b, 'move', { code, move: { type: 'wall', orientation: 'H', r: 4, c: 4 } });
ok('p1 wall placement accepted', mv2.ok);
await wait(120);
ok('wall visible to both', aUpdate.state.walls.length === 1 && bUpdate.state.walls.length === 1);
ok('p1 walls decremented to 9', aUpdate.state.wallsLeft[1] === 9);
ok('turn back to p0', aUpdate.state.turn === 0);

// Illegal pawn move rejected
const mv3 = await emit(a, 'move', { code, move: { type: 'pawn', r: 0, c: 0 } });
ok('illegal teleport rejected', !mv3.ok);

console.log(`\nEnd-to-end: ${pass} passed, ${fail} failed`);
a.close();
b.close();
process.exit(fail ? 1 : 0);
