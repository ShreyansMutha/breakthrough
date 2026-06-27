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

export function playerSide(pi, total) {
  const counts = sideAssignments(total);
  let acc = 0;
  for (let s = 0; s < 4; s++) {
    if (pi < acc + counts[s]) return s;
    acc += counts[s];
  }
  return 0;
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

export function goalCol(pi, total) {
  const side = playerSide(pi, total);
  const size = boardSize(total);
  switch (side) {
    case 0: return undefined;
    case 1: return 0;
    case 2: return undefined;
    case 3: return size - 1;
  }
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
  const size = state.size || boardSize(state.playerCount || 2);
  const { pawns, walls } = state;
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
  const playerCount = state.playerCount || 2;
  const size = state.size || boardSize(playerCount);
  const { walls, pawns } = state;
  if (r < 0 || r > size - 2 || c < 0 || c > size - 2) return false;

  const wset = wallSet(walls);
  if (wset.has(`H,${r},${c}`) || wset.has(`V,${r},${c}`)) return false;

  if (orientation === 'H') {
    if (wset.has(`H,${r},${c - 1}`) || wset.has(`H,${r},${c + 1}`)) return false;
  } else {
    if (wset.has(`V,${r - 1},${c}`) || wset.has(`V,${r + 1},${c}`)) return false;
  }

  const newWalls = [...walls, { orientation, r, c }];
  for (let i = 0; i < playerCount; i++) {
    const gr = goalRow(i, playerCount);
    const gc = goalCol(i, playerCount);
    if (!hasPath(newWalls, pawns[i], gr, gc, size, playerCount)) return false;
  }
  return true;
}
