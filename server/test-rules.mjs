import {
  initialState,
  legalPawnMoves,
  canPlaceWall,
  applyMove,
} from './src/quoridor.js';

let pass = 0;
let fail = 0;
const ok = (name, cond) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.log('  FAIL:', name);
  }
};

// For 2 players, player 0 starts at top (0,5), player 1 at bottom (8,5), size=9

// 1. Starting moves for player 0 at (0,5): down, left, right (up is off-board)
let s = initialState();
const m0 = legalPawnMoves(s, 0);
ok('p0 has 3 starting moves', m0.length === 3);
ok('p0 can move down to (1,5)', m0.some((x) => x.r === 1 && x.c === 5));
ok('p0 cannot move off-board up', !m0.some((x) => x.r < 0));

// 2. Wall placement + overlap rejection
s = initialState();
ok('H wall at (4,4) valid', canPlaceWall(s, 'H', 4, 4));
s.walls.push({ orientation: 'H', r: 4, c: 4 });
ok('overlapping H wall at (4,5) rejected', !canPlaceWall(s, 'H', 4, 5));
ok('overlapping H wall at (4,3) rejected', !canPlaceWall(s, 'H', 4, 3));
ok('crossing V wall at (4,4) rejected', !canPlaceWall(s, 'V', 4, 4));
ok('non-conflicting V wall at (4,5) ok', canPlaceWall(s, 'V', 4, 5));

// 3. Wall blocks movement
s = initialState();
s.walls.push({ orientation: 'H', r: 0, c: 5 }); // blocks (0,5)<->(1,5)
const mBlocked = legalPawnMoves(s, 0);
ok('wall blocks downward move', !mBlocked.some((x) => x.r === 1 && x.c === 5));
ok('p0 still has left/right', mBlocked.length === 2);

// 4. Jump over adjacent opponent
s = initialState();
s.pawns[0] = { r: 4, c: 4 };
s.pawns[1] = { r: 3, c: 4 };
const mj = legalPawnMoves(s, 0);
ok('can jump straight over opponent to (2,4)', mj.some((x) => x.r === 2 && x.c === 4));
ok('cannot land on opponent square', !mj.some((x) => x.r === 3 && x.c === 4));

// 5. Diagonal jump when straight jump is wall-blocked
s = initialState();
s.pawns[0] = { r: 4, c: 4 };
s.pawns[1] = { r: 3, c: 4 };
s.walls.push({ orientation: 'H', r: 2, c: 4 }); // blocks (3,4)<->(2,4)
const md = legalPawnMoves(s, 0);
ok('straight jump now blocked', !md.some((x) => x.r === 2 && x.c === 4));
ok('diagonal side-step left available', md.some((x) => x.r === 3 && x.c === 3));
ok('diagonal side-step right available', md.some((x) => x.r === 3 && x.c === 5));

// 6. Path rule: a wall may never fully seal a player off
s = initialState();
s.pawns[1] = { r: 0, c: 0 };
s.walls.push({ orientation: 'H', r: 0, c: 0 }); // wall just below the corner
ok('sealing the corner (V at 0,0) is rejected', !canPlaceWall(s, 'V', 0, 0));

// 7. Turn order + win detection via applyMove
s = initialState();
ok('p1 cannot move on p0 turn', !applyMove(s, 1, { type: 'pawn', r: 1, c: 5 }).ok);
ok('p0 valid move accepted', applyMove(s, 0, { type: 'pawn', r: 1, c: 5 }).ok);
ok('turn passed to p1', s.turn === 1);

s = initialState();
s.pawns[0] = { r: 7, c: 5 };
s.pawns[1] = { r: 5, c: 0 };
s.turn = 0;
const rw = applyMove(s, 0, { type: 'pawn', r: 8, c: 5 });
ok('p0 reaching row 8 wins', rw.ok && s.winner === 0);

console.log(`\nRules engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
