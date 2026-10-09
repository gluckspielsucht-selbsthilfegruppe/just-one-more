# Implementation decisions

The original implementation request authorized assumptions. For the later internet multiplayer setup, the user explicitly selected a Cloudflare Quick Tunnel. The existing source documents are retained unchanged. This file records how their unresolved or conflicting points were handled.

## Rules baseline

The consolidated **candidate v1.0** in `game-rules.md` is the implemented rules contract. It takes precedence for mechanics over the earlier open questions in `SPEC.md` and `PROJECT_DESCRIPTION.md`. No roulette odds, bonus values, victory thresholds, prediction semantics, or deck frequencies were invented beyond that candidate.

An extra Second Chance passes automatically to the next active, unprotected seat in join order. The rules require transferring extras but do not specify how the recipient is selected; deterministic seat order keeps that resolution immediate.

## Product assumptions

- A room and its game share one five-character code. Seats follow join order. The room holds 2–8 players, with a configurable maximum. Two participants are sufficient to start; four or more work in the same way.
- The creator is implicitly ready. Everyone else must mark themselves ready. Changing settings clears human ready flags. Only the host starts rounds or rematches.
- Public discovery lists this server’s public lobbies and games. In-progress games are visible but cannot receive new players. Existing members can reconnect. Private tables require a code/link and do not appear in discovery.
- One user can actively belong to one room. Explicitly departed players can join another; their old seats automatically finish any unresolved round decisions.
- Guest access includes the full game and visual designs. Optional accounts add cross-device identity and durable access to statistics. There are no artificial gameplay restrictions, email requirements, external identity providers, payments, or password-recovery promises.
- Accounts are local to this installation, identified by a case-insensitive username. Changing a display nickname does not change that account’s login username.
- Statistics update once after a completed game. Round history stays with its room. Practice games count toward stats. A rematch resets totals and hands, retains settings and connected seats, and returns to the waiting room.
- Bot choices are heuristics, not hidden-deck analysis. They inspect public hands and scores only. They must resolve exactly the same legal prompts as human players.
- Sound is off by default and stored per browser. Appearance is saved with the profile. All number and effect cards remain public, as in the tabletop rules.

## Hosting precedence

`tech-constraints.md` is the newer and more explicit infrastructure guidance: local development/operation is the default, and hosting is optional. One Node server on `0.0.0.0`, serving both HTTP and WebSockets, provides zero-cost LAN multiplayer. The user subsequently selected accountless Cloudflare Quick Tunnels for internet sessions. `compose.tunnel.yaml` opts into a pinned `cloudflared` sidecar, waits for the app to be healthy, and enables secure session cookies. The base Compose setup remains local/LAN HTTP. No account, card, domain, tunnel token, paid product, or trial is configured. The app and data still run locally; Cloudflare forwards public HTTPS and WebSocket traffic. Current limits, start/share/stop instructions, and hostname/session changes are documented in the README. Presentation-network acceptance remains a separate rehearsal recorded in `verification.md`.

## Architecture

React and Vite provide a locally bundled frontend. Express and `ws` provide HTTP and WebSockets. TypeScript contracts are shared across server, client, and tests. Zod validates all external commands. No separate database service or build-time secret is required.

The game engine runs only on the server. Its state machine resolves physical draws, then queued action cards, then the remaining opening deal or ordinary turn. Target, exact-number prediction, and final bank choices are explicit prompts. Reaching ten or exhausting every eligible card cancels unfinished effects and enters final banking. Scores settle only after the whole round.

Clients receive a public projection that omits the draw pile, discards, and effect queues. They never shuffle, choose random results, or write scores. Each game action includes a state version; a stale action is rejected with a refreshed snapshot. Successful request IDs are deduplicated per player (last 512 in process), and state versions protect game actions after a restart. There is no automatic retry of an uncertain action; the player sees the current state before deciding again.

Room mutations are synchronous in one process. Committed snapshots are written to a temporary file with restrictive file permissions, then atomically renamed. Password derivation is asynchronous. Sessions use random 256-bit bearer cookies, with only their SHA-256 hashes saved. Room shuffles and roulette use Node’s cryptographic random source.

Human sessions have a WebSocket heartbeat. Slow clients, invalid commands, oversized messages, unrelated origins, and command bursts are bounded or rejected. Disconnected seats have a grace period, and a table with no connected humans pauses. Hosting moves to another human when necessary. Separate lobby actions allow adjusting settings or removing players before a game, without mutating an ongoing roster.

## Deliberate operational boundaries

This multiplayer implementation can be exposed temporarily through a Quick Tunnel; the host computer must remain running. It is not a managed internet service. One process owns its data file. File storage is not suitable for horizontally scaled instances, and snapshots are not an operational backup. Account recovery, moderation tooling, spectators, permanent public hosting, and internet matchmaking across multiple servers are not implemented. The game rules remain isolated so future cards and rule variants can be added without rewriting transport or presentation.
