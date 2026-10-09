# Just One More

A browser-based, real-time push-your-luck card game for 2–8 players. Draw another card, bank your points, or risk the whole round on roulette. Built from the candidate v1.0 in [game-rules.md](game-rules.md).

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

## What is included

- Live public-table discovery, search, private tables, room codes, and invitation links.
- Two to eight seats, configurable capacity, readiness, host controls, player removal in the lobby, and practice bots.
- All v1.0 rules: configurable 0–12/13/14/15 decks, both 200-point victory modes, Draw/Bank, Prediction, Flip Three, Second Chance, frozen duplicates, stacking multipliers, both combinations, 7–10-card bonuses, roulette, tied endings, rotating first seats, and deck recycling.
- A responsive game table with every player’s hand, clear effect prompts, score breakdowns, standings, round history, table chat, and rematches.
- Guest play plus optional username/password accounts on this server. Accounts preserve profile, appearance, and completed-game stats across devices. Guests keep the same data while their session cookie remains valid.
- Eight avatar colors, three card designs, optional sound effects, reduced-motion support, keyboard-operable dialogs, and a built-in rulebook.
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

Local and LAN operation follow the newer [tech-constraints.md](tech-constraints.md). This implementation does **not** provision Cloudflare, a tunnel, a paid plan, or a trial. There are no usage fees or automatic upgrades. Stop the terminal process with Ctrl+C to stop the service; the saved data remains local.

If a friend cannot connect, ensure both devices share a network, use the printed IP address rather than `localhost`, and check that the host firewall permits incoming connections on the chosen port. Guest Wi-Fi with client isolation may prevent LAN play. A local network URL is not reachable from unrelated networks.

The older Cloudflare-specific acceptance criterion in `SPEC.md` has not been claimed as passed. Internet hosting is a separate deployment decision. For any future deployment, verify its actual current free-tier limits and fail-closed billing behavior before provisioning. This single-process, file-backed application is intended for a local hackathon and trusted friends. Public production operation would additionally need HTTPS, operational backups, account recovery, durable transactional storage, and an abuse-management plan.

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
