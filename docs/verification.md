# Verification record

Date: 2026-10-09. Branch: `codex/complete-application`.

## Automated checks

- Strict TypeScript checking and a Vite production build.
- 39 rule tests, including four deck sizes and 48 seeded complete games across both victory modes.
- Exact reconstruction of the documented four-player fixture: final totals **46, 20, 40, 0**, with 18 cards consumed and 10 next in the deck.
- Correct and incorrect predictions, disabled modifiers, duplicate frozen numbers, Second Chance consumption/transfer, forced-effect ordering, incomplete predictions, the ten-card interrupt, discard recycling, round rotation, tied winners, and both game-end modes.
- Seven integration tests using actual HTTP connections and four separate authenticated WebSocket clients: identical state, host permissions, readiness, private discovery, capacity, duplicate/stale commands, disconnect recovery, automatic disconnected turns (including while chat is active), guest/account flows, session security, and durable restart recovery.

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
