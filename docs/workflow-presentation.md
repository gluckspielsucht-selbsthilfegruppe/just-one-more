# Presenting the AI workflow

Use this with [Spec → Slice → Check](ai-workflow.md). It explains a lightweight approach through the finished application. The workflow is a retrospective proposal: timeboxes and roles describe a repeatable plan, while repository links identify the available evidence.

## A 90-second explanation

> Our approach is called Spec → Slice → Check. It gives AI a small, explicit problem and judges the result against observable behavior.
>
> Just One More is a real-time multiplayer card game with custom rules. The difficult parts are agreeing what those rules mean and keeping every player in the same game state. A missed prediction, for example, freezes cards so they stop scoring, but they must still count for duplicate busts.
>
> The repository gives that behavior a concrete foundation: a versioned rules baseline, shared TypeScript contracts, a server-owned game engine, and controlled tests. Those are the inputs and checks for the AI workflow.
>
> For a three-developer team, the work divides into rules, multiplayer, and player experience. Each developer uses Codex for a bounded task. Humans own the decisions and acceptance; Codex helps clarify, implement, and investigate. The cycle repeats around playable slices: join a table, finish a round, resolve special cards, and recover a connection.
>
> The implementation makes these choices visible. Tests cover rule interactions and four-client synchronization, including repeated commands and reconnects. The app runs from one local server with file-based persistence, which keeps setup small enough for a hackathon.
>
> The useful discipline is simple: every AI task has a defined outcome, and every accepted slice needs evidence. That gives us a process we can explain, inspect, and reuse without a heavyweight lifecycle.

## One slide

**Title: Spec → Slice → Check**

**Subtitle: Three developers + Codex + observable acceptance criteria**

```text
Define the demo → Prove the risks → Build playable slices → Check → Rehearse
                                      ↑                    │
                                      └───── iterate ──────┘
```

- **Human decisions:** scope, game semantics, interfaces, acceptance.
- **AI contribution:** clarify ambiguity, implement bounded changes, investigate failures.
- **Team split:** rules · multiplayer · player experience.
- **Evidence:** rules examples → shared contracts → engine/server tests → browser rehearsal.
- **Prototype tradeoff:** one server, local/LAN access, local persistence, focused documentation.

Speaker example: “A frozen 4 scores nothing, but drawing another 4 still busts. We can point to both the rule and the test.”

## A three-minute demonstration

| Time      | Show                                                                            | Explain                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:35 | Open four independent sessions, create a table, and join the same code.         | The basic outcome is a shared game. Tabs sharing one browser profile also share an identity; use separate profiles/devices.                 |
| 0:35–1:20 | Ready up, start, take the prompted legal actions, and bank.                     | The server resolves the game and broadcasts public state. Compare the hands and scores across sessions.                                     |
| 1:20–1:45 | Refresh one participant's browser.                                              | The same session restores the player and seat.                                                                                              |
| 1:45–2:25 | Open the missed-prediction rule and its named test.                             | Explain the exact 4, 9 → guess 6 → draw 2 → draw 4 example. Use controlled evidence for rare effects rather than waiting for a random card. |
| 2:25–3:00 | Show check results from the revision being demonstrated and the workflow slide. | Explain what the checks establish, then close with the single-server/LAN tradeoff.                                                          |

Before presenting, run `npm run check` and `npm run build`, then use `npm start`. Rehearse with the actual devices and network. Keep the practice game with three bots as a fallback for showing gameplay; it does not replace evidence of human multiplayer access. If the random opening introduces a long special-card sequence, resolve its prompts and move to the controlled rule example when time runs out.

## Likely questions

Validation while preparing these notes on **2026-10-09**, using application revision `52df8b7`: `npm run check` passed strict TypeScript and all **46 tests** (39 rule tests and 7 server tests); `npm run build` and `npm run format:check` also passed. The server tests required permission to bind local sockets. No new browser or physical-device rehearsal was performed for this documentation change.

**“What makes this structured?”**

A task has an explicit outcome and an agreed rule/interface boundary. Acceptance comes from checking behavior against that outcome, with a human reviewing the expected result. The frozen-card example and four-client tests make that concrete.

**“Did you follow every stage in that order?”**

The workflow is a retrospective reconstruction of an iterative build. The repository supports the rules baseline, implementation decisions, and verification evidence. The timeboxes and team allocation describe how to repeat the approach; they are not a claim about the original chronology.

**“How do you avoid AI checking its own mistaken assumptions?”**

Ground expected values in the rulebook and controlled tabletop examples. Have another developer inspect both the code and the expectations. Ask Codex for counterexamples, then assess its findings. Passing generated tests alone is insufficient.

**“What can you actually demonstrate about quality?”**

The repository contains deterministic rule fixtures, 48 seeded complete-game simulations, and four-client HTTP/WebSocket integration checks. The [verification record](verification.md) describes a prior four-session browser rehearsal on one machine. Show fresh command results for the presented revision; distinguish them from prior records and from physical-device/network checks still to perform.

**“Why not a more elaborate architecture or process?”**

The prototype needs shared state, correct rules, and a reliable demonstration. One server and local snapshots meet that scope with little setup. The shared engine boundary leaves room for future rule changes. Public hosting, distributed storage, and production operations are later decisions.

**“Where is the AI in the product?”**

Codex is the development partner. The running game uses deterministic rule logic, server-owned randomness, and heuristic practice bots; it does not depend on a language-model API. The hackathon contribution is the development workflow and the prototype it supports.
