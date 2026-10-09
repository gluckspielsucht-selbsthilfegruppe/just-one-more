# Just One More — hackathon MVP spec

This records the decisions stated so far. Open decisions below are not approved
rules or implementation choices. The acceptance criteria are draft until the
team agrees on their expected outcomes.

## Goal

Create a browser-based, real-time multiplayer version of **Just One More** that
at least four people can play together through a hosted game. It is based on
Flip7 but must include the proposed new rules listed under Scope. The result
must be demonstrable without spending money.

## Scope

Agreed for this MVP:

- At least four participants can play in the same game through browsers, with
  game events and state updating in real time.
- The game is hosted on Cloudflare and remains within a zero-cost setup.
- The room creator selects the maximum numbered card value `n` from 12, 13,
  14, or 15; numbered cards run from 0 through `n`.
- The room creator chooses between a 200-point game-end mode and a mode that
  requires both 200 points and a seven-card condition.
- The new ruleset is part of the MVP: the replacement prediction/freeze card,
  the configurable number range, the optional seven-card end condition,
  combination bonuses for 6+7 and 4+2+0, card-count bonuses for 7–10 cards,
  and a roulette factor. The stated effects and amounts are recorded below;
  their remaining mechanics are open decisions.

Rule details carried from the initial proposal, pending team confirmation:

- A correct prediction for the next card grants a ×3 multiplier. An incorrect
  prediction freezes cards already held: frozen cards do not score, but still
  count for duplicate detection. The card's name and the rest of its behavior
  are unresolved.
- The 7-card bonus is +15 points and the 8-card bonus is +30 points. The 9-
  and 10-card bonuses are higher and intended to grow exponentially; their
  values or formula are unresolved.
- The 6+7 and 4+2+0 combinations award bonuses, with amounts unresolved.
  The latter uses three distinct values: 4, 2, and 0.
- A roulette factor affects the game, but its trigger and effect are
  unresolved.

The proposed dashboard, public game discovery, accounts, guest limitations,
saved settings, custom designs, and animations have not been accepted into or
excluded from this MVP. The team must decide their disposition against the
time limit; no implementation should infer it from this document.

## Constraints

- The remaining hackathon window is 5–6 hours for development, setup, checks,
  and presentation preparation. A working multiplayer demo takes priority
  over production readiness.
- There is no existing application stack or infrastructure in this repo.
- The chosen Cloudflare products must work on an ongoing free plan for the
  intended development and presentation use. Do not enable a paid plan,
  billable overage, automatic paid upgrade, or chargeable add-on. A credit card
  being available is not permission to incur a charge. Billing alerts alone
  are not a cost safeguard.
- Before deployment, verify current account/card requirements, free limits,
  behavior at those limits, trial conversion, possible card holds, WebSocket
  and idle behavior, and cleanup steps for the exact Cloudflare products used.
- Verify the hosted real-time connection with four browser sessions early,
  including access from the networks intended for the presentation.
- Which unchanged Flip7 rules apply is unresolved; do not assume the entire
  original ruleset.

## Acceptance criteria (draft)

IDs are stable. Rows with unresolved rules describe the required behavior but
cannot yet establish a complete pass/fail oracle.

| ID | Observable behavior | How to verify |
|---|---|---|
| AC-01 | Four participants connect to one hosted game through browsers and see the same membership and game state. | Join from four browser sessions, including the presentation network paths; compare all views. Entry and identity rules remain open. |
| AC-02 | The creator can select `n` from 12–15 and either 200-point or 200-plus-seven mode; all participants see the selected settings, and numbered cards remain within 0–`n`. | Create games with each `n` and both modes; inspect shared settings and controlled deals. Deck composition remains open. |
| AC-03 | Game actions and resulting state appear to all four participants without manual refresh; invalid or repeated actions do not produce conflicting state. | Exercise the agreed action/turn sequence in four sessions, including an invalid and a repeated action. Action and turn semantics and an update-time target remain open. |
| AC-04 | The replacement card supports correct and incorrect predictions; incorrect predictions freeze held cards, which stop scoring but remain relevant to duplicate elimination. | Use controlled card sequences to check both outcomes and a later duplicate of a frozen card. Define the guess domain, ×3 target/duration, and freeze timing first. |
| AC-05 | A game in 200-point mode ends according to that threshold; in 200-plus-seven mode it does not end until both conditions are met. All participants see the same result. | Use controlled score/card states just below and above each boundary in both modes. Define which player and cards satisfy seven, when it is checked, and tie handling first. |
| AC-06 | The presentation game runs on Cloudflare with no paid usage enabled and four participants can complete a hosted session. | Inspect the selected account/products and current free-tier safeguards; run a four-browser rehearsal using documented deploy, join, and cleanup steps. |
| AC-07 | The 6+7 and 4+2+0 combinations and 7–10-card bonuses affect scores as agreed. | Use controlled hands at each boundary, including frozen cards and simultaneous combinations. Define amounts, counting, accumulation, and scoring order first. |
| AC-08 | The roulette factor occurs at its agreed point and its result is visible and consistent for all participants. | Force each agreed outcome in a controlled game and compare all views and scores. Define trigger, outcomes, target, and scoring order first. |

## Shared interfaces to agree before slices

No application stack, Cloudflare product combination, or message contract is
approved yet. Before splitting implementation, agree on:

- Room creation/joining, participant identity, settings, and reconnection.
- Player actions, whose turn it is, and the authoritative game-state update
  delivered to every browser.
- A single rule/scoring contract covering frozen cards, combinations,
  card-count bonuses, multiplier, roulette, and end-condition evaluation.
- The Cloudflare hosting boundary and free-tier failure behavior.

## Open decisions

The team must decide:

1. Which unchanged Flip7 rules apply: deck composition/frequencies for each
   `n`, deal and turn order, available actions, duplicate handling, round end,
   score carryover, and any other baseline rules.
2. Replacement card name and quantity; what is guessed; when the guess is
   required; what ×3 multiplies and for how long; whether the new card freezes
   after a wrong guess; reactivation; and multiple effects.
3. Combination bonus amounts, order/repetition rules, treatment of frozen
   cards, and interaction with other bonuses and multipliers.
4. The 9- and 10-card bonus values or formula; whether bonuses accumulate;
   which numbered or special/frozen cards count; and behavior beyond 10 cards.
5. Roulette trigger, possible outcomes, affected players/scores, and position
   in the scoring sequence.
6. The precise seven-card condition, when it is evaluated alongside 200
   points, and how simultaneous qualifiers or ties are resolved.
7. Whether the dashboard, game discovery, accounts, guest restrictions,
   persistence, designs, and animations belong in this MVP.
8. The exact Cloudflare services and architecture. A bounded early experiment
   may be needed to prove four-player real-time access and free-tier behavior;
   no spike ID, owner, branch, or checkpoint has been assigned.
9. Whether the full agreed feature set fits the 5–6-hour window; any scope or
   deadline change belongs to the team.
