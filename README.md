# Breakthrough

A real-time multiplayer board game for 2–10 players. Race your pawn across a dynamically-sized board while placing walls to block your rivals — but never seal off their path completely.

- **Server** — Node + Express + Socket.IO. Authoritative game state with full move validation (turn order, pawn jumps, wall overlaps, always-a-path guarantee via BFS).
- **Client** — React + Three.js (React Three Fiber) + Vite. Full 3D board with animated characters, nametags, orbit/follow cameras, and wall preview.

## Quick Start

```bash
npm install
npm run dev        # runs server (:3005) + client (:3000) concurrently
```

Open `http://localhost:3000` in multiple browser tabs. Create a room, share the 4-letter code, and play.

### Manual start

```bash
# Terminal 1 — server
cd server && npm install && npm run dev

# Terminal 2 — client
cd client && npm install && npm run dev
```

## How to play

- On your turn, **Move** your pawn one square (orthogonally), or **place a wall** to block paths.
- Pawns **jump** over an adjacent opponent; if a wall blocks the straight jump, step diagonally instead.
- Wall count scales with player count (fewer walls in larger games).
- Board size grows with more players (9×9 up to 25×25).
- First pawn to reach their goal edge wins.

## Deploy

```bash
npm run build       # builds client to client/dist/
npm start           # serves API + built client on :3005
```

Deploy as a single Node.js process on Railway, Render, or Fly.io.

## Project layout

```
Breakthrough/
├── server/src/
│   ├── index.js      # Socket.IO server + event handlers
│   ├── rooms.js      # room codes & lifecycle
│   └── quoridor.js   # authoritative rules engine
├── client/src/
│   ├── App.jsx       # screens + socket wiring + reconnection
│   ├── socket.js     # socket.io-client instance
│   ├── quoridor.js   # rules mirror (UI hints only)
│   └── components/
│       ├── Lobby.jsx
│       ├── Board.jsx
│       └── BoardScene.jsx
└── package.json      # root scripts (dev / build / start)
```
