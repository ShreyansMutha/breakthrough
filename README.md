# Quoridor — Multiplayer (prototype)

A real-time, two-player [Quoridor](https://en.wikipedia.org/wiki/Quoridor) game.
Move your pawn to the opposite side of the 9×9 board while dropping walls to slow
your opponent — but you can never completely seal off their path to the goal.

- **Server** — Node + Express + Socket.IO. Authoritative: it owns the game state
  and validates every move (turn order, legal pawn moves & jumps, wall overlaps,
  and the "always a path" rule via BFS).
- **Client** — React + Vite + socket.io-client. Renders the board, highlights legal
  moves, previews wall placement, and shows live turn / wall counts.

## Run it locally

Open **two terminals**.

**1. Server**
```bash
cd quoridor/server
npm install
npm run dev        # http://localhost:3001
```

**2. Client**
```bash
cd quoridor/client
npm install
npm run dev        # http://localhost:5173
```

Open `http://localhost:5173` in two browser tabs (or two devices on your network).
In tab 1 click **Create a room** and share the 4-letter code. In tab 2 enter the
code and **Join**. Play!

> To play across devices, point the client at your machine's LAN IP by setting
> `VITE_SERVER_URL` (e.g. create `client/.env.local` with
> `VITE_SERVER_URL=http://192.168.1.50:3001`).

## How to play

- On your turn, either **Move** your pawn one square (orthogonally), or place a
  **Wall** (↔ horizontal / ↕ vertical) between squares.
- Pawns may **jump** over an adjacent opponent; if a wall blocks the straight jump,
  you may step diagonally instead.
- Each player has **10 walls**. A wall can never fully block a player from reaching
  their goal row.
- First pawn to reach the opposite edge wins. 🏆

## Project layout
```
quoridor/
├── server/
│   └── src/
│       ├── index.js      # Socket.IO server + event handlers
│       ├── rooms.js      # room codes & lifecycle
│       └── quoridor.js   # authoritative rules engine
└── client/
    └── src/
        ├── App.jsx       # screens + socket wiring
        ├── socket.js     # socket.io-client instance
        ├── quoridor.js   # rules mirror (UI hints only)
        └── components/
            ├── Lobby.jsx
            └── Board.jsx
```
