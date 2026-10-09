# Spec → Slice → Check

A lightweight AI development workflow for **Just One More**: three developers, Codex, and a playable hackathon prototype.

This is a proposed workflow reconstructed from the finished application and its repository artifacts. The role allocation, timeboxes, and prompts are a reusable plan, not a record of when or how the original implementation happened. The [presentation notes](workflow-presentation.md) explain the approach through evidence available in the project.

## The idea

**Give AI a small, explicit problem; implement one playable slice; check it against an agreed outcome. Repeat.**

Humans own scope, game semantics, tradeoffs, and acceptance. Codex helps clarify ambiguity, propose a solution, implement changes, and investigate failures. A convincing explanation from the model is an input to review; observable behavior is the acceptance criterion.

For this game, the biggest uncertainties are rule interactions and multiplayer consistency. Spend the most attention there. Keep process inside the existing rules, shared types, tests, and decision notes.

```text
Define the playable outcome → Prove the risky assumptions
                                      ↓
                      Spec → Slice → Check → Accept
                        ↑               │
                        └── revise ─────┘
                                      ↓
                         Rehearse and demonstrate
```

## A five-hour plan

The timeboxes below total five hours of elapsed team time. If six hours are available, keep the extra hour for integration problems and the presentation. The three developers work concurrently inside the implementation window.

| Stage           | Time    | Human responsibility                                                                                  | Codex contribution                                                                                      | Exit condition                                                                                                                                                             |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Define          | 20 min  | Choose the demo journey, required mechanics, and limits. Resolve decisions that block the next slice. | Extract ambiguity, suggest acceptance examples, and identify conflicting requirements.                  | One clear target: four people join, play a round, see the same result, and recover a refreshed seat. Full candidate v1.0 rules remain required for the finished prototype. |
| Prove           | 30 min  | Pick the two risks most likely to break the demo: rule interpretation and shared state.               | Build controlled scoring examples and a minimal create/join/broadcast experiment.                       | Expected rule outcomes are explicit; four independent sessions see the same room. Agree the state/action contract before splitting work.                                   |
| Build in slices | 150 min | Assign owners, review each plan and diff, and accept working increments.                              | Implement one bounded slice, run relevant checks, and fix evidenced failures.                           | Integrated gameplay works after each slice; unfinished additions do not displace the demo path.                                                                            |
| Challenge       | 60 min  | Check failure cases and expected values independently; play together.                                 | Exercise deterministic fixtures, multiple clients, invalid actions, reconnection, and restart recovery. | Rule and transport checks pass; blockers are fixed or the affected optional feature is removed.                                                                            |
| Rehearse        | 40 min  | Freeze features, run the production build, and rehearse on the presentation devices/network.          | Help prepare start instructions, a short demo script, and a record of limitations.                      | The team can repeat the demo and explain both the evidence and its boundaries.                                                                                             |

If the early risk experiment does not pass, pause optional work and simplify the approach. Changing the required rules or demo target is an explicit team decision.

## Three developers, one shared contract

Use three human-owned work streams, each with a Codex session. These are suggested responsibilities, not claimed historical assignments.

| Owner       | Main responsibility                                                             | Existing code boundary                                          | Cross-review                                                                    |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Developer A | Rules and correctness: scoring, effects, turn transitions, controlled examples. | `shared/engine.ts`, `shared/scoring.ts`, `tests/engine.test.ts` | Developer B checks state transitions and invalid actions.                       |
| Developer B | Multiplayer and integration: rooms, commands, sessions, reconnect, persistence. | `server/`, `tests/server.test.ts`                               | Developer C checks what the client receives and how failures appear.            |
| Developer C | Player experience: create/join, lobby, table, prompts, scores, demo flow.       | `src/`                                                          | Developer A checks that visible choices and score explanations match the rules. |

Agree `shared/types.ts` together and give one person ownership of edits to it. A contract change is announced before dependent code changes. Use separate branches/checkouts, integrate at the end of each slice, and do a brief three-person check whenever a shared contract changes. This prevents three AI sessions from independently inventing incompatible versions of the game.

## The slice loop

Each task needs only a short brief: **player outcome, relevant rules, allowed files, acceptance examples, and things outside scope**. Keep it in the task conversation or change description; there is no separate specification pack for every feature.

1. **Spec:** A human supplies the intended behavior. Codex identifies ambiguity and proposes a small plan. Resolve any rule or interface decision that affects the result.
2. **Slice:** Implement the smallest change that makes that behavior usable through the relevant layers. Preserve the shared contract and avoid unrelated refactors.
3. **Check:** Run the relevant rule or server tests and inspect the player-facing behavior. A second developer checks the expected result against the rules, rather than accepting an AI-generated test merely because it passes.
4. **Accept:** Review the diff, integrate, and record only a consequential decision or limitation. If the check fails, return to the brief or implementation before adding scope.

A practical slice order for this application:

| Slice                          | Playable outcome                                                                         | Acceptance evidence                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1. Meet at a table             | Create, join, ready up, and start with four seats.                                       | All sessions show the same roster and settings; only the host can start.            |
| 2. Complete a basic round      | Draw, bank, bust, and see settled scores.                                                | A controlled hand produces the expected score; all clients receive the same result. |
| 3. Complete the rules          | Prediction/freeze, Flip Three, Second Chance, bonuses, roulette, and both victory modes. | Fixed card sequences and boundary cases from the rules contract.                    |
| 4. Recover interrupted play    | Refresh/reconnect, reject stale or repeated actions, and resume saved games.             | Four-client integration checks and restart recovery.                                |
| 5. Make it easy to demonstrate | Practice bots, clear effect prompts, rulebook, and readable score breakdowns.            | A teammate can follow the complete demo without developer guidance.                 |

Accounts, chat, appearance choices, and discovery refinements are additional capabilities present in the final app. In this workflow, expand them only after the required game and recovery path work. Stop optional work when a core check fails or the final rehearsal window begins.

### One concrete example: a missed prediction

The rule is deceptively easy to implement incorrectly: frozen cards stop scoring but still cause duplicate busts.

- **Spec:** A player holds 4 and 9, predicts 6, and receives 2. All three numbers freeze, including the newly drawn 2. The score is zero. Drawing another 4 busts the player when there is no Second Chance.
- **Slice:** Resolve the prediction and duplicate handling in the engine; exclude frozen numbers from scoring; render the resulting public state and prompt in the client.
- **Check:** The existing test named `freezes a missed prediction including its new card, then busts on a frozen duplicate` checks this exact sequence in [tests/engine.test.ts](../tests/engine.test.ts). Human review compares the expectation with [game-rules.md](../game-rules.md).

This links a player-visible requirement to an executable example. It also gives a reviewer a specific question: does “frozen” have the same meaning in scoring, duplicate detection, and the UI?

## How to prompt Codex

Use ordinary task conversations. No custom agent orchestration is required. These are example prompts to reuse, not transcripts of earlier sessions.

**Clarify before building**

```text
Read game-rules.md and docs/decisions.md. Focus on prediction and frozen cards.
List decisions that affect the next implementation slice. For each unresolved
point, propose an interpretation and a concrete input/output example. Distinguish
documented decisions from your suggestions. Do not implement until we resolve
any ambiguity that changes the result.
```

**Implement a bounded slice**

```text
Implement the agreed missed-prediction behavior. A hand of [4, 9], a guess of 6,
and a next numbered card of 2 must freeze all three numbers and score zero.
A subsequent 4 must still bust unless Second Chance protects the player.

Read the rules and existing tests first. Propose a short plan, then implement
within shared/engine.ts, shared/scoring.ts, and tests/engine.test.ts. Preserve
the public contract. If another file or rule decision is required, explain why
before expanding scope. No UI redesign or unrelated cleanup. Run the relevant
checks and report the changed behavior, results, and remaining uncertainty.
```

**Challenge the result**

```text
Review this diff against game-rules.md, not against the implementation's own
explanation. Inspect prediction timing, frozen duplicates, Second Chance,
score calculation, and forced effects. Check whether the expected test values
follow from the rules. Report concrete failure cases with file references.
Do not edit during this review. A developer will assess the findings.
```

## Why this fits the application

| Workflow decision                                | Evidence in the finished prototype                                                                                     | Reason it matters                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Make game semantics explicit.                    | [Candidate v1.0 and controlled examples](../game-rules.md).                                                            | Prediction, frozen cards, and multiplier order need unambiguous outcomes.                  |
| Share the contract across work streams.          | [State/action types](../shared/types.ts) and [score calculation](../shared/scoring.ts).                                | The client can display the same score calculation that the server uses.                    |
| Let one server own game state.                   | [Engine](../shared/engine.ts), [server](../server/app.ts), and [client connection](../src/useGame.ts).                 | Server-side validation, randomness, versions, and request IDs address conflicting actions. |
| Spend testing effort on the risky behavior.      | [Rule fixtures](../tests/engine.test.ts) and [HTTP/WebSocket tests](../tests/server.test.ts).                          | Controlled inputs expose rule errors; separate clients expose synchronization failures.    |
| Keep deployment small enough for a hackathon.    | [One-port startup](../README.md), [local snapshots](../server/store.ts), and [implementation decisions](decisions.md). | Local/LAN play works without provisioning a cloud service or a separate database.          |
| Judge readiness with a repeatable demonstration. | [Verification record and rehearsal procedure](verification.md).                                                        | A working screen alone cannot establish that four players can finish a round.              |

The rulebook documents a concluded rules investigation, and the verification record documents prior checks.

For the final acceptance checkpoint, use `npm run check`, `npm run build`, and `npm run format:check`, then repeat the four-player browser rehearsal. `npm run test:integration` is the targeted server check during a networking slice; it is already included in the full check. Record the revision, command results, and actual devices/network used.

Keep the scope of the evidence precise: the existing browser record covers four sessions on one computer. Presentation Wi-Fi, four physical devices, real mobile layout, and internet hosting require their own checks. Local persistence is suitable for the single-process prototype; it is not a distributed storage design.

The process stays small: one rules baseline, one shared contract, short slice briefs, targeted checks, and a demo record. Add documentation only when it resolves a decision or makes a check repeatable.
