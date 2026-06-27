export const COLORS = [
  '#ff5a5f', '#3da9fc', '#ffd166', '#06d6a0', '#c98bdb',
  '#f78c6b', '#8be9fd', '#ff86c8', '#50fa7b', '#ffb86c',
];

export function boardSize(playerCount) {
  if (playerCount === 2) return 9;
  if (playerCount === 3) return 11;
  return 13;
}

export function wallsPerPlayer(playerCount) {
  return Math.max(3, 10 - Math.floor((playerCount - 2) * 1.2));
}

function sideAssignments(total) {
  if (total <= 4) {
    if (total === 2) return [1, 0, 1, 0];
    if (total === 3) return [1, 1, 1, 0];
    return [1, 1, 1, 1];
  }
  const base = Math.ceil(total / 4);
  const extra = total - base * 4;
  const counts = [base, base, base, base];
  const order = [0, 2, 1, 3];
  for (let i = 0; i < extra; i++) counts[order[i]]++;
  return counts;
}

function playerSide(pi, total) {
  const counts = sideAssignments(total);
  let acc = 0;
  for (let s = 0; s < 4; s++) {
    if (pi < acc + counts[s]) return s;
    acc += counts[s];
  }
  return 0;
}

function spawnFor(pi, total, size) {
  const counts = sideAssignments(total);
  let side = 0, acc = 0;
  for (let s = 0; s < 4; s++) {
    if (pi < acc + counts[s]) { side = s; break; }
    acc += counts[s];
  }
  const center = Math.floor((size - 1) / 2);
  switch (side) {
    case 0: return { r: 0, c: center };
    case 1: return { r: center, c: size - 1 };
    case 2: return { r: size - 1, c: center };
    case 3: return { r: center, c: 0 };
  }
}

export function goalRow(pi, total) {
  const side = playerSide(pi, total);
  const size = boardSize(total);
  switch (side) {
    case 0: return size - 1;
    case 1: return undefined;
    case 2: return 0;
    case 3: return undefined;
  }
}

function goalCol(pi, total) {
  const side = playerSide(pi, total);
  const size = boardSize(total);
  switch (side) {
    case 0: return undefined;
    case 1: return 0;
    case 2: return undefined;
    case 3: return size - 1;
  }
}

export function initialState(playerCount) {
  const pc = Math.max(2, Math.min(playerCount || 2, 4));
  const size = boardSize(pc);
  return {
    size,
    playerCount: pc,
    pawns: Array.from({ length: pc }, (_, i) => spawnFor(i, pc, size)),
    walls: [],
    wallsLeft: Array.from({ length: pc }, () => wallsPerPlayer(pc)),
    turn: 0,
    winner: null,
    disconnected: Array.from({ length: pc }, () => false),
  };
}

function inBounds(r, c, size) {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function wallSet(walls) {
  const s = new Set();
  for (const w of walls) s.add(`${w.orientation},${w.r},${w.c}`);
  return s;
}

export function isBlocked(wset, r1, c1, r2, c2) {
  if (r1 === r2) {
    const c = Math.min(c1, c2);
    return wset.has(`V,${r1},${c}`) || wset.has(`V,${r1 - 1},${c}`);
  }
  const r = Math.min(r1, r2);
  return wset.has(`H,${r},${c1}`) || wset.has(`H,${r},${c1 - 1}`);
}

function perp(dr, dc) {
  return dc === 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
}

export function legalPawnMoves(state, pi) {
  const { size, pawns, walls } = state;
  const wset = wallSet(walls);
  const me = pawns[pi];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const moves = [];
  for (const [dr, dc] of dirs) {
    const nr = me.r + dr;
    const nc = me.c + dc;
    if (!inBounds(nr, nc, size)) continue;
    if (isBlocked(wset, me.r, me.c, nr, nc)) continue;

    const blocking = pawns.findIndex((p, i) => i !== pi && p.r === nr && p.c === nc);
    if (blocking !== -1) {
      const jr = nr + dr;
      const jc = nc + dc;
      if (inBounds(jr, jc, size) && !isBlocked(wset, nr, nc, jr, jc)) {
        moves.push({ r: jr, c: jc });
      } else {
        for (const [pr, pc] of perp(dr, dc)) {
          const sr = nr + pr;
          const sc = nc + pc;
          if (inBounds(sr, sc, size) && !isBlocked(wset, nr, nc, sr, sc)
            && !pawns.some((p) => p.r === sr && p.c === sc)) {
            moves.push({ r: sr, c: sc });
          }
        }
      }
    } else {
      moves.push({ r: nr, c: nc });
    }
  }
  return moves;
}

function isCornerTile(r, c, playerCount) {
  if (playerCount <= 2) return false;
  const size = boardSize(playerCount);
  return (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
}

export function hasPath(walls, pawn, goalR, goalC, size, playerCount) {
  const wset = wallSet(walls);
  const visited = new Set();
  const stack = [pawn];
  while (stack.length) {
    const { r, c } = stack.pop();
    if (r === goalR || c === goalC) return true;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc, size)) continue;
      if (isBlocked(wset, r, c, nr, nc)) continue;
      if (playerCount > 2 && isCornerTile(nr, nc, playerCount)) continue;
      if (!visited.has(`${nr},${nc}`)) stack.push({ r: nr, c: nc });
    }
  }
  return false;
}

export function canPlaceWall(state, orientation, r, c) {
  const { size, walls, pawns } = state;
  if (r < 0 || r > size - 2 || c < 0 || c > size - 2) return false;

  const wset = wallSet(walls);
  if (wset.has(`H,${r},${c}`) || wset.has(`V,${r},${c}`)) return false;

  if (orientation === 'H') {
    if (wset.has(`H,${r},${c - 1}`) || wset.has(`H,${r},${c + 1}`)) return false;
  } else {
    if (wset.has(`V,${r - 1},${c}`) || wset.has(`V,${r + 1},${c}`)) return false;
  }

  const newWalls = [...walls, { orientation, r, c }];
  for (let i = 0; i < state.playerCount; i++) {
    const gr = goalRow(i, state.playerCount);
    const gc = goalCol(i, state.playerCount);
    if (!hasPath(newWalls, pawns[i], gr, gc, size, state.playerCount)) return false;
  }
  return true;
}

export function applyMove(state, pi, move) {
  if (state.winner !== null) return { ok: false, error: 'Game is over' };
  if (state.turn !== pi) return { ok: false, error: 'Not your turn' };

  if (move.type === 'pawn') {
    const legal = legalPawnMoves(state, pi);
    if (!legal.some((m) => m.r === move.r && m.c === move.c)) {
      return { ok: false, error: 'Illegal pawn move' };
    }
    state.pawns[pi] = { r: move.r, c: move.c };
    const gr = goalRow(pi, state.playerCount);
    const gc = goalCol(pi, state.playerCount);
    if (move.r === gr || move.c === gc) state.winner = pi;
  } else if (move.type === 'wall') {
    if (state.wallsLeft[pi] <= 0) return { ok: false, error: 'No walls left' };
    if (!canPlaceWall(state, move.orientation, move.r, move.c)) {
      return { ok: false, error: 'Invalid wall placement' };
    }
    state.walls.push({ orientation: move.orientation, r: move.r, c: move.c });
    state.wallsLeft[pi] -= 1;
  } else {
    return { ok: false, error: 'Unknown move type' };
  }

  if (state.winner === null) {
    let next = (pi + 1) % state.playerCount;
    while (state.disconnected?.[next] && next !== pi) {
      next = (next + 1) % state.playerCount;
    }
    state.turn = next;
  }
  return { ok: true };
}

function shortestPath(walls, startR, startC, goalR, goalC, size, playerCount) {
  const wset = wallSet(walls);
  const visited = new Set();
  const queue = [{ r: startR, c: startC, dist: 0 }];
  while (queue.length) {
    const { r, c, dist } = queue.shift();
    if (r === goalR || c === goalC) return dist;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc, size)) continue;
      if (isBlocked(wset, r, c, nr, nc)) continue;
      if (playerCount > 2 && isCornerTile(nr, nc, playerCount)) continue;
      if (!visited.has(`${nr},${nc}`)) queue.push({ r: nr, c: nc, dist: dist + 1 });
    }
  }
  return Infinity;
}

function getLegalWallMoves(state) {
  const { size } = state;
  const moves = [];
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      for (const orientation of ['H', 'V']) {
        if (canPlaceWall(state, orientation, r, c)) {
          moves.push({ type: 'wall', orientation, r, c });
        }
      }
    }
  }
  return moves;
}

function wallBlockScore(w, state, pi) {
  const opp = state.pawns[pi];
  const side = playerSide(pi, state.playerCount);
  const dr = Math.abs(w.r - opp.r), dc = Math.abs(w.c - opp.c);
  switch (side) {
    case 0:
      if (w.orientation === 'H' && w.r >= opp.r && dr <= 3 && dc <= 2) return (4 - dr - dc * 0.5) * 2;
      if (w.orientation === 'V' && dr <= 1 && w.c <= opp.c + 1 && w.c >= opp.c - 1) return 2;
      return 0;
    case 1:
      if (w.orientation === 'V' && w.c <= opp.c && dc <= 3 && dr <= 2) return (4 - dc - dr * 0.5) * 2;
      if (w.orientation === 'H' && dc <= 1 && w.r >= opp.r - 1 && w.r <= opp.r + 1) return 2;
      return 0;
    case 2:
      if (w.orientation === 'H' && w.r <= opp.r && dr <= 3 && dc <= 2) return (4 - dr - dc * 0.5) * 2;
      if (w.orientation === 'V' && dr <= 1 && w.c <= opp.c + 1 && w.c >= opp.c - 1) return 2;
      return 0;
    case 3:
      if (w.orientation === 'V' && w.c >= opp.c && dc <= 3 && dr <= 2) return (4 - dc - dr * 0.5) * 2;
      if (w.orientation === 'H' && dc <= 1 && w.r >= opp.r - 1 && w.r <= opp.r + 1) return 2;
      return 0;
  }
}

function wallConnectsToEdgeOrWall(w, state) {
  const { size, walls } = state;
  const wset = wallSet(walls);
  let connections = 0;
  if (w.orientation === 'H') {
    if (w.c === 0 || w.c === size - 2) connections += 2;
    if (wset.has(`H,${w.r},${w.c - 1}`)) connections++;
    if (wset.has(`H,${w.r},${w.c + 1}`)) connections++;
    if (wset.has(`V,${w.r},${w.c}`) || wset.has(`V,${w.r - 1},${w.c}`)) connections++;
    if (wset.has(`V,${w.r},${w.c + 1}`) || wset.has(`V,${w.r - 1},${w.c + 1}`)) connections++;
  } else {
    if (w.r === 0 || w.r === size - 2) connections += 2;
    if (wset.has(`V,${w.r - 1},${w.c}`)) connections++;
    if (wset.has(`V,${w.r + 1},${w.c}`)) connections++;
    if (wset.has(`H,${w.r},${w.c}`) || wset.has(`H,${w.r},${w.c - 1}`)) connections++;
    if (wset.has(`H,${w.r + 1},${w.c}`) || wset.has(`H,${w.r + 1},${w.c - 1}`)) connections++;
  }
  return connections;
}

function findBestWall(state, pi, difficulty) {
  const walls = getLegalWallMoves(state);
  if (!walls.length) return null;
  const gr = goalRow(pi, state.playerCount);
  const gc = goalCol(pi, state.playerCount);

  let bestWall = null, bestScore = -Infinity;
  for (const w of walls) {
    const testWalls = [...state.walls, { orientation: w.orientation, r: w.r, c: w.c }];
    const myDist = shortestPath(testWalls, state.pawns[pi].r, state.pawns[pi].c, gr, gc, state.size, state.playerCount);
    if (myDist === Infinity) continue;

    let score = 0;
    const connects = wallConnectsToEdgeOrWall(w, state);
    score += connects * 2;

    for (let i = 0; i < state.playerCount; i++) {
      if (i === pi) continue;
      const block = wallBlockScore(w, state, i);
      score += block;
      if (difficulty !== 'easy') {
        const orig = shortestPath(state.walls, state.pawns[i].r, state.pawns[i].c, goalRow(i, state.playerCount), goalCol(i, state.playerCount), state.size, state.playerCount);
        const after = shortestPath(testWalls, state.pawns[i].r, state.pawns[i].c, goalRow(i, state.playerCount), goalCol(i, state.playerCount), state.size, state.playerCount);
        score += (after - orig) * 1.5;
      }
    }

    const myOrig = shortestPath(state.walls, state.pawns[pi].r, state.pawns[pi].c, gr, gc, state.size, state.playerCount);
    const myPenalty = Math.max(0, myDist - myOrig);
    score -= myPenalty;
    score += Math.random() * (difficulty === 'easy' ? 4 : difficulty === 'medium' ? 2 : 0.5);

    if (score > bestScore) { bestScore = score; bestWall = w; }
  }

  if (!bestWall) return null;
  return bestWall;
}

function findBestPawnMove(state, pi) {
  const pawnMoves = legalPawnMoves(state, pi);
  if (!pawnMoves.length) return null;
  const gr = goalRow(pi, state.playerCount);
  const gc = goalCol(pi, state.playerCount);
  const best = pawnMoves.reduce((best, m) => {
    const dist = shortestPath(state.walls, m.r, m.c, gr, gc, state.size, state.playerCount);
    if (!best || dist < best.dist) return { ...m, dist };
    return best;
  }, null);
  return { type: 'pawn', r: best.r, c: best.c };
}

export function getBotMove(state, pi, difficulty) {
  if (state.wallsLeft[pi] > 0) {
    const wall = findBestWall(state, pi, difficulty);
    if (wall && (difficulty === 'hard' || difficulty === 'medium' || (difficulty === 'easy' && Math.random() < 0.75))) {
      if (difficulty === 'easy') {
        const blockScore = Math.max(...Array.from({ length: state.playerCount }, (_, i) => i === pi ? 0 : wallBlockScore(wall, state, i)));
        if (blockScore > 0 || Math.random() < 0.4) return wall;
      } else {
        return wall;
      }
    }
  }
  return findBestPawnMove(state, pi);
}
