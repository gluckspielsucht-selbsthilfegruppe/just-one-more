# SP-01: Which rules produce a coherent, playable game?

Status: Planned; experiment not started
ID: Proposed SP-01; pending team confirmation
Owner: Unassigned; recommend Developer A (one developer)
Branch: To be chosen by the owner before execution
Checkpoint: Proposed 30 minutes, tracked by the engineer; stop earlier on an answer or blocker
Basis: SPEC.md at 86db322; AC-02, AC-04, AC-05, AC-07, AC-08

## Question and importance

Which concrete interpretation of the proposed mechanics supports a complete
game with unambiguous actions, scores, and endings? Resolve the consequential
rule gaps through alternatives and worked examples. Recommendations require
team approval; the spike does not change the agreed scope or rules.

## Dependencies and staffing

Start immediately alongside [SP-02](SP-02-cloudflare-feasibility.md) and the
local portion of [SP-03](SP-03-multiplayer-consistency.md). One developer owns
the investigation; ask the other two for a short joint playtest and decision
checkpoint. Hand a candidate turn/action model to SP-03 as soon as available.
[SP-04](SP-04-pacing-and-balance.md) needs a defined candidate ruleset from this spike.

## Experiment and evidence needed

1. Propose a baseline deck for each allowed maximum, special-card quantities,
   turn/actions, duplicate handling, round end, and score carryover. Identify
   which baseline Flip7 rules are proposed rather than silently inheriting them.
2. Compare concrete options for prediction domain/timing, multiplier scope and
   duration, freeze timing/reactivation, and repeated special-card effects.
3. Propose combination amounts, 9/10-card bonuses, accumulation/counting rules,
   roulette mechanics, and an explicit scoring order. Resolve how 8–10 cards
   are reachable if a candidate baseline ends a round at seven.
4. Specify both ending modes, whose cards satisfy seven, evaluation timing,
   and ties. Walk through a complete round and controlled examples of both
   game endings, then conduct a short tabletop playtest.
5. Calculate expected outcomes for a wrong prediction followed by a duplicate
   frozen card; simultaneous combinations; 7–10-card boundaries; multiplier
   plus roulette; 200 points without seven; seven without 200; and ties.

Record candidate versions, hands/actions, calculated scores, playtest
observations, contradictions, and unresolved choices. A small executable
rules table is optional if it helps; no UI or networking is needed.

## Expected handover

A recommended ruleset and scoring sequence, worked examples for acceptance
checks, alternatives rejected and why, and proposed SPEC.md changes. Keep
observations separate from recommendations. Flag unrelated MVP scope choices
for the team instead of deciding them here. No implementation or acceptance
claim follows from this record. Any experimental code remains spike code and
must be rebuilt in an agreed slice before integration into main.
