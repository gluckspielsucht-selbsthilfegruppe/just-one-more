# Just One More

A browser-based, real-time push-your-luck card game for 2–8 players. Draw another card, bank your points, or risk the whole round on roulette. Built from the candidate v1.0 in [game-rules.md](game-rules.md).

## Quick start

Run one of these options from the project directory:

- **Docker** (requires Docker with Compose): `docker compose up --build -d`.
- **Node.js** (requires Node.js 22.12+ and npm): `npm ci && npm run dev`.

Open **http://localhost:3000**, then choose **Create a table** to play with friends or **Play a practice game** to try it with bots. Friends on the same Wi-Fi use your computer's LAN IP instead of `localhost`.

**Playing over the internet?** With Docker, run:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml up --build tunnel
```

Everyone, including you, opens the `https://….trycloudflare.com` URL printed in the terminal. Create a table there and share its invitation link. Keep the terminal open and your computer awake while playing. See [Quick Tunnel details](#play-over-the-internet-with-a-quick-tunnel).

To stop: press **Ctrl+C** for Node.js or the foreground tunnel; run `docker compose down` for local Docker, or `docker compose -f compose.yaml -f compose.tunnel.yaml down` for both the app and tunnel. Saved Docker data is retained.

## Start playing

Requires **Node.js 22.12 or later** and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. Choose **Create a table**, enter a nickname, and invite your friends. For a solo demonstration, **Play a practice game** immediately starts a four-seat game with three bots. No account, API key, database setup, or paid service is required.

The server prints a network URL, such as `http://192.168.1.42:3000`. Other devices on the **same local network** open that URL. Create your table from the network URL to copy an invitation link that works for everyone. The five-character room code also works from any browser connected to the same server. Each player uses a separate device, browser profile, or private browsing session; tabs in the same profile share an identity.

Use **production mode** for a presentation:

```sh
npm run build
npm start
```

Both modes serve the website and WebSocket connection from one port. The production build bundles its fonts, icons, and all assets locally; gameplay has no third-party service dependency.

## Run with Docker

Requires Docker with the Compose plugin. Node.js and npm are not required on the host.

For a hosting plan that limits Dockerfiles to two stages, select `Dockerfile.small` as the Dockerfile path in the host's build settings. It builds the same production app in two stages. To build it locally, run `docker build -f Dockerfile.small -t just-one-more:small .`.

```sh
docker compose up --build -d
```

Open **http://localhost:3000**. The container runs the production app and serves HTTP and WebSockets on the same port. For friends on your local network, use the **host computer's LAN IP**, such as `http://192.168.1.42:3000`; the network address printed inside the container belongs to Docker and is not the invitation address.

```sh
docker compose ps          # includes the HTTP health-check status
docker compose logs -f app
docker compose down        # stop and remove the container; keep saved data
```

To use another host port, run `PORT=8080 docker compose up --build -d` and open `http://localhost:8080`. The internal port remains 3000. If you put the app behind HTTPS, set `COOKIE_SECURE=true` when starting Compose; use the default `false` for local HTTP.

Games, accounts, and sessions persist in the Compose-managed `game-data` volume mounted at `/app/data`. Rebuilds and container replacement retain this data. **`docker compose down --volumes` deletes it.** This volume starts independently of any existing host `./data` directory; host `DATA_DIR` settings do not change the Compose volume. Keep one app container per volume.

To back up the snapshot, stop the app before copying it:

```sh
mkdir -p data
docker compose stop app
docker compose cp app:/app/data/game.json ./data/game-backup.json
docker compose start app
```

Treat the backup as private: it contains account and session data. The image uses a multi-stage build, includes only production dependencies, runs as the unprivileged `node` user, and checks `/api/health`. Source changes require rebuilding the image with the startup command above.

## Play over the internet with a Quick Tunnel

Start the Cloudflare Quick Tunnel in the foreground with the optional Compose override. Compose also starts the required app service:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml up tunnel
```

Wait for the `https://….trycloudflare.com` URL in the terminal output. Open that URL yourself, create a table, and share its invitation link with your friends. Everyone must use the same tunnel URL, including the host, so invitations point to the public server. Friends only need a browser; no shared Wi-Fi, router port forwarding, Cloudflare account, domain, or token is required. Keep this terminal open while playing; Ctrl+C stops the foreground Compose run.

The tunnel waits for the app's health check and forwards both HTTP and WebSockets to `app:3000` on Docker's network. The override enables `COOKIE_SECURE=true` for HTTPS sessions. Use the HTTPS URL while this mode is active; plain HTTP LAN addresses cannot carry the secure session cookie. The existing saved-data volume is reused.

Keep Docker and the host computer running and awake throughout the game. Restarting or recreating the tunnel gives it a new hostname: read the latest logs and share the new link. Browser cookies belong to the old hostname, so guest identities and saved seats do not automatically follow to a new URL. Accounts can sign in again on the new URL; saved game data stays in the volume. Localhost and LAN cookies are also separate from tunnel cookies.

Stop public access while leaving the app running:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml stop tunnel
```

Stop both containers, retaining saved data:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml down
```

To return to local HTTP play, run the `down` command above, then `docker compose up -d` without the override (and without setting `COOKIE_SECURE=true`).

### Cost and limits

Checked **2026-10-09**: Cloudflare describes Quick Tunnels as free and accountless. This setup supplies no card or billing account, creates no paid subscription or trial, and has no card hold, trial conversion, or automatic paid upgrade to cancel. [Cloudflare's service description](https://blog.cloudflare.com/protected-quick-tunnels/).

Quick Tunnels allow **200 in-flight requests**; excess requests fail with **HTTP 429**, rather than becoming paid overages. They have no uptime guarantee, change hostname on restart, and do not support Server-Sent Events. The game uses WebSockets, which Cloudflare supports. These limits are suitable for a small 2–8-player demonstration, but rehearse on the actual participant networks. Cloudflare maintenance or a network interruption can drop connections; the client reconnects while the hostname remains available. [Quick Tunnel limits](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [WebSocket behavior](https://developers.cloudflare.com/network/websockets/).

Anyone with the URL can access this server. A private table hides it from public-table discovery but does not restrict access to the website. Stop the tunnel when the session is over; stopping `cloudflared` ends access through that URL. No Cloudflare dashboard cleanup is needed.

If the URL does not load, check `docker compose -f compose.yaml -f compose.tunnel.yaml ps` and the tunnel logs. The host network must allow outbound connections to Cloudflare on port **7844** (UDP for QUIC or TCP for HTTP/2). If UDP is blocked, `cloudflared` can fall back to HTTP/2; if both are blocked, use another network. [Tunnel firewall requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/).

## What is included

- Live public-table discovery, search, private tables, room codes, and invitation links.
- Two to eight seats, configurable capacity, readiness, host controls, player removal in the lobby, and practice bots.
- All v1.0 rules: configurable 0–12/13/14/15 decks, both 200-point victory modes, Draw/Bank, Prediction, Flip Three, Second Chance, frozen duplicates, stacking multipliers, both combinations, 7–10-card bonuses, roulette, tied endings, rotating first seats, and deck recycling.
- A responsive game table with every player’s hand, clear effect prompts, score breakdowns, standings, round history, table chat, and rematches. Hands have special cards on the upper row and number cards on the lower row; cards fade to a light gray shadow when a player banks or busts. Long rows scroll horizontally, and reduced-motion preferences show the out state immediately.
- Guest play plus optional username/password accounts on this server. Accounts preserve profile, appearance, and stats across devices. Round counts, best round, and best total update after every completed round; games and wins count once when a game finishes. Practice games count too. Guests keep the same data while their session cookie remains valid.
- Three complete UI themes: **Neon Arcade** (default), **Velvet Club**, and **Lucky Pop**. Use the palette button in the header to apply and save a theme instantly, or choose one in your profile. Your theme is personal to you and persists with your guest session or account; existing profiles receive Neon Arcade without losing their data.
- Eight avatar colors, three independent card designs, optional sound effects, reduced-motion support, keyboard-operable dialogs, and a built-in rulebook. All three app themes cover the lobby, table setup, live game, results, stats, profiles, and rules, with responsive layouts for phones.
- Animated card deals with a shine on newly received cards, score counters with point-change bursts, a seven-card bonus reveal, a safe-bank chip stamp, turn highlights, and victory confetti. Roulette has a spinning wheel, orbiting ball, slowing ticks, and a result reveal that lands on the server-confirmed ×0 or ×2 pocket. The result stays visible when the turn or round ends; players can skip the animation, and reduced-motion preferences show the result immediately.
- Optional original background music: **Synthwave** (Midnight Circuit), **Lounge** (The After Hours), and **Disco** (Pocketful of Sunshine). Open the headphones button and use **Music style** to choose a soundtrack independently of the visual theme, or keep **Follow app theme**. Switch styles while playing or paused; your choice, volume, and independent game effects are saved on this device. Audio is synthesized locally with Web Audio, starts after interaction, and pauses in hidden tabs. No music service, audio download, or external recording is used.
- Automatic reconnect, saved seats, durable games, disconnect handling, host transfer, version checks, command deduplication, and server-owned randomness.

## Configuration and saved data

| Setting         | Default  | Purpose                                                               |
| --------------- | -------- | --------------------------------------------------------------------- |
| `PORT`          | `3000`   | HTTP and WebSocket port.                                              |
| `DATA_DIR`      | `./data` | Directory containing the atomic `game.json` snapshot.                 |
| `COOKIE_SECURE` | `false`  | Set to `true` when serving behind HTTPS. Keep `false` for local HTTP. |

Example: `PORT=8080 DATA_DIR=./demo-data npm start`.

The snapshot contains rooms, accounts, hashed passwords, profile statistics, and hashed session tokens. It is ignored by Git. Back it up while the server is stopped; restoring the directory restores games and profiles. Run **one server process per data directory**. To start an entirely separate demonstration, use a different `DATA_DIR`.

Sessions last 30 days. Names are public to the table; passwords are salted with scrypt and are never returned to browsers. Session cookies are HttpOnly and SameSite=Strict. Reconnecting restores the same seat, including on a server restart, provided the browser still has its cookie. Unoccupied rooms expire after 24 hours of inactivity.

When a player disconnects, their current decision gets a 30-second grace period. If other humans remain, an automatic safe bank or legal special-card choice keeps play moving. Their seat remains available to reconnect. A fully disconnected table pauses. A departing host passes control to another human; a returning human can reclaim host control from a bot. Explicitly leaving an ongoing table is remembered across restarts, and the same player can rejoin with its code. If everyone explicitly leaves, the room closes.

## Verification

```sh
npm run check              # strict TypeScript + engine and server tests
npm run test:integration   # real HTTP/WebSocket and restart tests
npm run build              # production compilation and bundle
npm run format:check       # formatting of the implementation
```

The suite checks the documented scoring boundaries and tabletop replay, special-card ordering, deck exhaustion, ties, roulette qualification, 48 seeded complete games, four-client synchronization, reconnection, replayed/stale commands, lobby authorization, account authentication, and persistence across a server restart.

See [docs/verification.md](docs/verification.md) for the browser rehearsal and [docs/decisions.md](docs/decisions.md) for implementation assumptions and the architecture.

The [Spec → Slice → Check workflow](docs/ai-workflow.md) defines the intended development process for three developers using Codex, with a workflow diagram, timeboxes, responsibilities, and acceptance criteria.

## Network access and zero cost

Local and LAN operation follow [tech-constraints.md](tech-constraints.md). The optional [Quick Tunnel setup](#play-over-the-internet-with-a-quick-tunnel) adds internet access through Cloudflare while the app and saved data stay on your computer. No paid plan or trial is configured. For a directly running Node server, Ctrl+C stops the service; for Docker, use the Compose stop/down commands above.

For LAN play, if a friend cannot connect, ensure both devices share a network, use the printed IP address rather than `localhost`, and check that the host firewall permits incoming connections on the chosen port. Guest Wi-Fi with client isolation may prevent LAN play. A local network URL is not reachable from unrelated networks; use the Quick Tunnel for those participants.

The tunnel is intended for hackathon sessions with trusted friends, and does not make this single-process, file-backed application a managed hosting service. See [docs/verification.md](docs/verification.md) for tested connectivity and remaining presentation-network checks. Public production operation would additionally need stable hosting, operational backups, account recovery, durable transactional storage, and an abuse-management plan.

## Project layout

```text
shared/types.ts        Shared state and command contracts
shared/scoring.ts      Pure score breakdowns, also used by the UI
shared/engine.ts       Authoritative rule engine and bot choices
server/app.ts         HTTP endpoints, WebSockets, validation, room lifecycle
server/store.ts       Atomic local snapshots
server/index.ts       Development/production entry point and LAN URLs
src/App.tsx           Dashboard, profiles, room setup, application shell
src/components/       Lobby, table, cards, dialogs, and rules
src/useGame.ts        Reconnecting WebSocket client and request lifecycle
src/styles.css        Responsive visual design and reduced-motion handling
tests/                Rule fixtures, game simulations, server integration
```
