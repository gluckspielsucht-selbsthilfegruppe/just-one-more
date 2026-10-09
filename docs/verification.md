# Verification record

Date: 2026-10-09. Branch: `codex/complete-application`.

## Automated checks

- Strict TypeScript checking and a Vite production build.
- 39 rule tests, including four deck sizes and 48 seeded complete games across both victory modes.
- Exact reconstruction of the documented four-player fixture: final totals **46, 20, 40, 0**, with 18 cards consumed and 10 next in the deck.
- Correct and incorrect predictions, disabled modifiers, duplicate frozen numbers, Second Chance consumption/transfer, forced-effect ordering, incomplete predictions, the ten-card interrupt, discard recycling, round rotation, tied winners, and both game-end modes.
- Seven integration tests using actual HTTP connections and four separate authenticated WebSocket clients: identical state, host permissions, readiness, private discovery, capacity, duplicate/stale commands, disconnect recovery, automatic disconnected turns (including while chat is active), guest/account flows, session security, and durable restart recovery.

## Card rows and statistics fixes (2026-10-09)

- `npm run check` passed: strict TypeScript and all 59 tests. The server suite now has 12 integration tests, including three new statistics regressions.
- The new checks cover updates after a settled round, no updates during an unfinished round, wins and losses, duplicate requests, reconnects, rematches, busted practice rounds settled by bots, leaving a table, restart persistence, and migration of older unfinished and completed games without double counting.
- After removing randomness from the practice-game completion fixture, `npm run test:integration` passed all 12 tests. `npm run build`, `npm run format:check`, and `git diff --check` also passed.
- A React server-rendering smoke check verified special cards before number cards for both full and compact hands, including frozen numbers, disabled modifiers, prediction multipliers, and active/banked/busted states.
- Visual browser verification of these changes was unavailable: no connected browser was exposed, and native Chrome access returned “Computer Use permissions are not granted.” The earlier rehearsal below predates these fixes. Mobile scrolling, the gray-shadow transition, and reduced-motion appearance still need a visual rehearsal.
- After fetching `main` with the independent music-style feature, the combined work passed `npm run check` (71 tests), `npm run build`, and `npm run format:check` on 2026-10-09. Git reapplied the card and stats work without unresolved conflicts.

## Browser rehearsal

The application was run locally and opened in four isolated browser origins: `localhost`, `alice.localhost`, `bob.localhost`, and `cleo.localhost`, all using the same running server and separate cookies.

1. Alex created the public “Friday night club” table through the dashboard.
2. Bea, Charlie, and Drew joined using the same code. Every browser showed all four participants.
3. All three guests marked themselves ready. The host’s start control enabled.
4. The host dealt round one. Draws and turn indicators appeared across the four browsers without reload.
5. Alex drew 12 onto an opening 8. Bea’s browser immediately showed the two-card hand and 20-point subtotal.
6. All players banked from their own browser. The shared settled totals were Alex 20, Bea 11, Drew 10, Charlie 6.
7. Refreshing Bea’s browser recovered the same player, room, scores, and completed round.
8. The dashboard, create/join forms, lobby, game table, and round results were visually inspected. No browser console errors or warnings were reported for the inspected session.

The LAN endpoint was also reachable from the host via its printed network address. These are four real browser sessions on one computer; access from four physical devices, presentation Wi-Fi, unrelated networks, and Cloudflare was not tested. The stylesheet includes phone and tablet breakpoints; the in-app browser’s viewport override did not apply, so a real mobile-device rehearsal remains recommended.

## Repeat a local four-player check

Start the server and use four browser profiles, or use four distinct `*.localhost` origins on one machine (modern browsers resolve these locally). On physical devices, use the printed LAN URL. Create a room, join all four seats, mark ready, and start. Compare each player’s hand and the event feed after a draw. Refresh one browser during a round, then finish the round and compare totals. Test a practice game to exercise automatic opponents.

For rules with rare random triggers, run the controlled automated fixtures instead of relying on repeatedly drawing a particular card.

## Quick Tunnel verification (2026-10-09)

- Both the base Compose configuration and the merged `compose.yaml` + `compose.tunnel.yaml` configuration validate. Local mode keeps `COOKIE_SECURE=false`; tunnel mode sets it to `true` and waits for the app health check.
- The pinned `cloudflare/cloudflared:2026.10.0` image was pulled and started with an isolated `just-one-more-tunnel-check` Compose project and its own data volume. The production app became healthy before the tunnel started.
- The production page, `/api/health`, session creation, and `Secure`, `HttpOnly`, `SameSite=Strict` cookie flags passed checks in the running app container.
- `npm run check` passed in the Docker build stage: strict TypeScript plus all 46 tests, including the seven real HTTP/WebSocket integration tests. The production build was reused from Docker's unchanged build cache.
- **Public connectivity is not verified on this network.** Quick Tunnel provisioning succeeded, but `cloudflared` reported that both Cloudflare regions were unreachable over UDP and TCP port 7844. DNS resolution and the Cloudflare API were reachable. Automatic protocol selection is explicitly enabled so networks that block UDP can fall back to HTTP/2 over TCP.
- The isolated verification containers were stopped afterward. No existing game-data volume was used. Cloudflare acceptance criteria AC-01/AC-06 are not claimed as passed.

On a network permitting outbound Cloudflare tunnel traffic, use the README's tunnel startup command and open the newest HTTPS URL in four separate browser profiles or devices. Create a table from that URL, join the other three players, ready up, complete a round, compare results, and refresh one player to verify seat recovery. Include the actual presentation Wi-Fi or mobile network paths, then stop the tunnel using the documented command.
