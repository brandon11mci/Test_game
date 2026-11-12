# Bullet Survivors

A playable 1–8 player online cooperative browser survival game. React + TypeScript + Vite provide the lobby and HUD, Phaser 3 renders the arena, Socket.IO carries WebSocket traffic, and a persistent Node.js 24 server owns the entire simulation. SQLite stores cumulative player records.

## Easiest setup (no server configuration)

Open the public game's **Create or connect a server** button, or visit:
https://bullet-survivors-dead-sector.yummyether10.chatgpt.site/?setup=1

The wizard includes these three options:

### On your own computer

1. Install **Node.js 24 or later** from https://nodejs.org/en/download.
2. Download and unzip the complete project.
3. Double-click **Start-Windows.cmd** on Windows or **Start-Mac.command** on macOS. On Linux, run `sh Start-Linux.sh`. If macOS blocks the downloaded script, open Terminal in the project folder and use `npm run setup`.
4. The launcher installs dependencies, builds, starts the server, and opens **http://localhost:3001**. Keep the launcher window open. Press Ctrl+C to stop.

Alternatively, from a terminal inside the project:

```sh
npm run setup
```

The first setup needs internet access and takes a few minutes. The launcher also prints your computer's LAN addresses for friends on the same Wi-Fi. Allow port 3001 through your firewall if needed. `localhost` links work only on the computer running the server. Use the online option for friends elsewhere.

### Online with friends (Render)

1. Download and unzip this source project.
2. Create an empty **public GitHub repository** at https://github.com/new. Use GitHub's “uploading an existing file” page to upload the **contents** of the project folder. `render.yaml` and `package.json` must be at the top level. Commit the upload.
3. Paste your repository URL in the game's setup wizard and select **Deploy on Render**. This opens Render with your repository's blueprint selected. Sign in, review the plan, and deploy it. **The persistent-disk blueprint requires a paid plan.** Creating the repository and approving the host are steps you complete in your own accounts.
4. Wait for **Live**, then open Render's public HTTPS service address. The same service runs both your game and server; no connection settings are needed. Create a squad and share its invite link.

The blueprint already accepts connections from the original public frontend. To use your server from that frontend, choose **I have a server**, paste your Render address, test it, and choose **Connect & play**. This checks a real WebSocket handshake before saving. Invite links then point to your server's own game address, so your friends need no extra configuration.

For private GitHub repositories, create a Render Blueprint from its dashboard and authorize repository access instead of using the public-repository deploy link.

### Already have Docker?

```sh
docker compose up --build -d
```

Open http://localhost:3001. Data is saved in a Docker volume. Stop with `docker compose down`; keep the volume to keep statistics. Internet play still needs a public HTTPS host or reverse proxy.

## Run locally

Requirements: **Node.js 24 or later**, npm, and a modern browser with WebGL or Canvas support. Node's built-in SQLite is used; no database service or native module compilation is required.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Enter a callsign, select a weapon, create a public or private squad, and click **Deploy squad**. Friends enter the six-character code or open the invitation link. Public squads appear automatically. A solo match is fully supported. Open different browsers or browser profiles for different identities; tabs in one browser share a reconnect identity.

The development client proxies `/socket.io` and `/api` to port 3001. When accessing from another device, use the frontend computer's LAN address and allow port 5173 through your firewall. Invitation URLs use the current frontend origin.

## How to play

- Move with **WASD** or **arrow keys**. On touch devices, drag inside the arena.
- Weapons fire automatically at the nearest target within range. Hold the mouse button inside the arena to aim manually.
- Choose an assault rifle, five-pellet shotgun, or grenade launcher with area damage.
- Collect green XP shards and medical kits. Leveling grants a choice of damage, mobility, health, firing speed, or pickup-radius upgrades in the squad panel. Combat continues while choosing.
- Stay alive for **10 minutes**. A stronger wave begins every 30 seconds; waves 5, 10, 15, and 20 spawn a boss. The squad wins on reaching 10 minutes.
- Death switches the camera to a surviving teammate. Late arrivals spectate and become players on the next run.
- The host starts or restarts the run. Host ownership passes to another connected active player on disconnect. No friendly fire.
- Sound can be enabled from the musical-note button; click inside the arena to unlock browser audio.

## Verify and build

```sh
npm test
npm run build
npm start
```

Production runs at **http://localhost:3001** and serves both the built frontend and WebSocket backend. `npm run build` checks TypeScript, emits `dist/client`, and compiles the backend to `dist/server/src/index.js`.

Tests cover simulation movement and boundaries, XP, upgrades, grenade splash, health invulnerability, defeat/victory, boss waves, host migration, replay, and a real Socket.IO integration test with eight simultaneous clients, a ninth-client rejection, private-room filtering, spectator entry, reconnect identity, and invalid client input. The network integration test temporarily uses port 32197.

## Deploy together on a persistent Node host

This is the simplest deployment: one Node service serves both the frontend and backend. The server must support persistent processes and WebSocket upgrades. A short-lived serverless function or static-only host cannot run it.

1. Put this directory in a Git repository and connect it to Render, Railway, Fly.io, a VPS, or another persistent Node 24 host.
2. Build command: `npm ci --include=dev && npm run build`.
3. Start command: `npm start`.
4. Set `NODE_ENV=production`, `CLIENT_ORIGIN=https://your-game-domain.example`, and `DATA_DIR=/var/data/bullet-survivors` (or your mounted persistent disk path).
5. Mount a persistent writable disk at that data directory. SQLite creates its schema automatically. Do not commit the database.
6. The platform should supply `PORT`; otherwise it defaults to 3001. Terminate TLS at the host's reverse proxy and forward WebSocket upgrades.
7. Point your domain at the host, visit it over HTTPS, create a squad, and verify two independent browsers can play together.

A `render.yaml` blueprint is included. Its persistent disk requires a paid Render service; its own HTTPS origin is accepted automatically, and the original public frontend is preconfigured in `CLIENT_ORIGIN`. No host account or paid service has been provisioned by this project.

### Docker

```sh
docker build -t bullet-survivors .
docker run --rm -p 3001:3001 \
  -e CLIENT_ORIGIN=http://localhost:3001 \
  -e DATA_DIR=/app/data \
  -v bullet-survivors-data:/app/data bullet-survivors
```

For a public server set `CLIENT_ORIGIN` to its HTTPS frontend origin and place it behind a TLS reverse proxy. A health endpoint is available at `/api/health`.

## Deploy frontend and backend separately

Build the frontend with its public backend origin baked in:

```sh
VITE_SERVER_URL=https://your-node-server.example npm run build
```

Upload **`dist/client/`** to a static host such as Netlify, Cloudflare Pages, or Vercel. No history routing rewrite is needed: room links use `?room=ABC123`. The backend service still runs `npm start`, with `CLIENT_ORIGIN` set to the frontend's exact HTTPS origin (comma-separated origins supported). Use HTTPS for both sides to avoid mixed-content WebSocket blocking. Do not include a trailing slash in an origin.

You may also select a backend URL using the connection settings button in the browser. This setting is saved in that browser only and takes effect after reload. Same-origin hosting needs no setting. Static hosting of this frontend by itself does **not** provide a multiplayer server.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Backend HTTP/WebSocket port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed frontend origins, comma separated |
| `DATA_DIR` | `data` | Writable SQLite directory; persist in production |
| `VITE_SERVER_URL` | Current origin | Frontend backend origin, set during build |

## Architecture and trust boundary

- `client/src/App.tsx`: React lobby, room browser, loadouts, squad HUD, upgrades, records, help.
- `client/src/Game.tsx`: Phaser rendering, camera interpolation, radar, procedural audio, keyboard/pointer/touch input. It renders snapshots and sends input intent only.
- `server/src/engine.ts`: 30 Hz authoritative simulation, enemies, projectiles, area damage, movement, pickups, XP, levels, wave progression, and run results.
- `server/src/index.ts`: WebSocket lifecycle, schema validation and event-rate limits, public lobby discovery, private-room access, reconnect identity, SQLite persistence, static hosting.
- `shared/game.ts`: Shared protocol types, world settings, weapon and upgrade identifiers.
- `tests/`: Simulation and real network integration tests.

Snapshots broadcast at 15 Hz. Player speed, bullet damage, pickups, health and XP are never accepted from the client. Inputs are finite, bounded, normalized and rate limited. The server allows at most 8 identities in a room, including spectators. Room codes use cryptographically random hexadecimal characters. Private rooms are absent from discovery; knowledge of the room code grants entry.

Reconnect uses a random UUID stored in localStorage. It identifies the player on this browser and recovers their active character and inventory; a second connection with the same identity replaces the earlier socket. This is guest identity, not account authentication. Clearing browser data resets identity and access to its records. Statistics are stored when the run ends and refresh on the next room join.

Disconnected characters stop moving and firing, remain vulnerable, and count as active for 60 seconds. If no surviving eligible players remain, the match ends. A disconnected player can rejoin a surviving match; eliminated players remain eliminated. Empty or abandoned rooms are removed after two minutes of inactivity. Explicitly leaving releases the slot and abandons that character.

## Operational limits

Run **one server instance**: room state is in memory, while only player records persist in SQLite. Server restarts end active matches. Multiple independent instances would need shared matchmaking, sticky sessions, and explicit simulation ownership; a Socket.IO adapter alone would not solve that. The intended scale is small cooperative sessions, with caps of 100 rooms, 280 concurrent enemies and 600 pickups per room. Load test on your target host before increasing those limits.

Use a single persistent disk for the SQLite writer. Back up `stats.sqlite` using SQLite's online backup API or stop the service before copying it (WAL mode is enabled). Guest records and localStorage identity are the only progression; there is no account system, shop, or permanent combat advantage.

Procedural vector graphics and synthesized audio are included; no image downloads or game assets are needed. Google Fonts enhance the lobby when available; local fallbacks remain usable offline.

## Delivery verification

TypeScript, production compilation, seven engine tests, and one real WebSocket integration test have passed in the build environment. Browser visual QA could not run because the managed browser-control tool was unavailable. Internet deployment of the persistent Node service requires a host account and has not been performed. The included source is runnable locally and ready for the documented deployment paths.
