# SP-01: Which rules produce a coherent, playable game?

Status: Concluded; candidate v1.0 agreed in this session and checked on controlled cases
ID: SP-01; confirmed for investigation by the engineer on 2026-10-09
Owner: Engineer in this session, working with Codex (one agent)
Branch: `codex/sp-01-game-rules`
Checkpoint: Agreed 30 minutes, tracked by the engineer; stop earlier on an answer or blocker
Basis: SPEC.md at 86db322; AC-02, AC-04, AC-05, AC-07, AC-08

## Question and experiment

Which interpretation of the proposed mechanics gives unambiguous actions,
scores, and endings? The engineer selected the candidate rules below in a
joint discussion. The investigation compared alternatives, calculated
controlled scoring and ending cases, and completed one tabletop round with
the engineer choosing A's strategy and Codex following fixed policies for
B, C, and D. This was a rules experiment without UI or networking.

Candidate revisions v0.1–v0.8 recorded decisions as they were made; v1.0
consolidates them. The resulting action/scoring model is available for
[SP-03](SP-03-multiplayer-consistency.md), and the defined candidate is input
to [SP-04](SP-04-pacing-and-balance.md).

## Candidate v1.0: decisions agreed in this session

### Deck

One 0 and `v` copies of every numbered value `v` from 1 through the selected
maximum `n`. Three each of Prediction, Flip Three, and Second Chance; one
each of +2, +4, +6, +8, +10, and ×2. The original Freeze card is replaced by
Prediction.

| Maximum n | Numbered cards: 1 + n(n+1)/2 | Special cards | Total |
|---|---|---|---|
| 12 | 79 | 15 | 94 |
| 13 | 92 | 15 | 107 |
| 14 | 106 | 15 | 121 |
| 15 | 121 | 15 | 136 |

Seats follow join order. The creator starts the first round; the starting
seat rotates each round. Keep the unused deck between rounds. When it runs
out, shuffle previous-round discards; keep every current-round card aside,
including spent and busted cards. If no cards are available, force everyone
still active to bank, using the same final Bank-or-Roulette choice as a
ten-card ending. Cancel unfinished effects without resolving an incomplete
prediction. At round end clear hands, frozen states, modifiers, protection,
and seven-card qualification; carry scores only.

### Ordinary round and card-count bonuses

- Deal one opening card per player, then take turns choosing Draw or Bank.
- A duplicate numbered card, including a match with a frozen number, busts
  the player for zero round points unless Second Chance discards the new
  duplicate. Previously completed rounds' scores carry over.
- Banking removes the player from the active round. The round ends when
  everyone has banked or busted, or someone reaches ten unfrozen numbers.
- Card-count bonuses use the unfrozen numbered cards held at scoring:
  seven gives +15, eight +30, nine +60, and ten +120. Only the highest
  applicable bonus pays; bonuses do not accumulate. Earlier milestones do
  not survive the cards being frozen or the player busting.

### Round boundaries and prediction

- Reaching seven, eight, or nine distinct numbered cards does not end the
  round; play can continue toward ten.
- Reaching ten distinct unfrozen numbered cards ends the round immediately for
  everyone. The option to bank only that player's hand at ten was not chosen.
  A hand can have more than ten visible cards when frozen numbers or specials
  are included, but cannot continue past ten unfrozen numbers.
- Frozen numbered cards count only for duplicate detection. They contribute
  no points, combinations, card-count bonuses, or seven/ten-card conditions.
- Reaching ten cancels all remaining forced draws and queued actions.
- The prediction card replaces the original Freeze card. The prediction is
  the exact value of the recipient's next numbered card. The drawer chooses
  any active player, including themselves, as the recipient. The recipient
  guesses immediately and draws through to the next numbered card in the
  same action. The guess is one number from 0 through the configured maximum.
- A correct prediction grants a ×3 multiplier on the unfrozen numbered-card
  total for that round. Bonuses are added afterward. Correct predictions
  stack multiplicatively: ×3, then ×9, then ×27. An active ×2 multiplies
  that number contribution too; roulette applies after all bonuses.
- An incorrect prediction freezes all held numbered cards, including the
  newly drawn numbered card. Freezing only the previously held cards was
  rejected. These numbers stay frozen for the rest of the round; a later
  correct prediction does not reactivate them.
- A miss also disables all existing score modifiers for the rest of the
  round: held +point cards, ×2, and previously earned prediction multipliers.
  Preserving those modifiers was rejected. Subsequent scoring starts afresh;
  for example, the first correct prediction after a miss grants ×3 again.

### Special-card resolution

- Flip Three targets any active player, including its drawer. The recipient
  must receive three physical cards; every special card counts toward three.
- During a forced sequence, apply +point cards, ×2, and Second Chance
  immediately. Queue newly drawn Prediction and Flip Three cards in reveal
  order, resolving them after the current forced sequence finishes. Each
  queued card belongs to its recipient, who chooses an active target when it
  resolves. Complete forced effects before returning to ordinary turns.
- For a predicted number: resolve the guess first, then duplicate handling
  or Second Chance, then the ten-card check. A miss also disables modifiers
  collected while drawing toward that number. A correct guess does not
  prevent a duplicate bust.
- Second Chance is consumed together with the new duplicate, leaving the
  original numbered card in its existing frozen/unfrozen state. Hold at most
  one: give an extra to an active player without one, or discard it if none
  exists. It survives a prediction miss but expires at the round end.
- Busting stops that player's forced draws and discards their queued action
  cards. A ten-card ending cancels all pending draws/actions for everyone.
- Resolve opening-deal effects before continuing the opening deal; skip
  inactive seats. A forced draw does not replace the recipient's next
  ordinary turn. Banked and busted players cannot be targeted or take
  further ordinary turns that round.

### Combinations, roulette, and win eligibility

- Holding unfrozen 6 and 7 awards +10; holding unfrozen 4, 2, and 0 awards
  +25. Draw order does not matter. Each combination pays once at scoring,
  and both can apply to the same hand. Frozen members cannot complete them.
- Roulette is an optional gamble when banking: a 50% chance of ×0 and a
  50% chance of ×2, applied to the entire round score after all bonuses.
  Declining roulette preserves the round score. At a ten-card round ending,
  each still-active player gets one Bank-or-Roulette choice on their final
  hand; players who already banked cannot roll again. Losing roulette also
  loses seven-card qualification for this round. Retaining qualification
  despite a roulette loss was rejected.
- In 200-point mode, the threshold is a cumulative score of at least 200.
  In 200-plus-seven mode, the same player must also bank at least seven
  unfrozen numbered cards in the finishing round. A seven-card achievement
  from an earlier round does not carry over.
- Check winners after the whole round and every roulette choice resolves.
  The highest cumulative total among qualifying players wins. If the top
  qualifying total is tied, everyone plays another round, carrying totals
  and rechecking the selected win conditions. In 200-plus-seven mode, the
  next round needs a new qualifying hand; the tie does not preserve seven.

### Scoring order

1. Sum unfrozen numbered cards.
2. Multiply by active ×2 and every active prediction multiplier.
3. Add active +point cards, each eligible combination, and the single
   applicable card-count bonus.
4. Apply roulette: ×1 if declined, otherwise ×0 or ×2.
5. Add the result to the player's cumulative score at round settlement,
   then evaluate the selected game-ending condition for all players.

A bust always scores zero. Frozen cards and disabled modifiers contribute
nothing. In formula form, for a player who did not bust:

`round score = (unfrozen sum × active multiplier product + active flat points + combination bonuses + card-count bonus) × roulette factor`.

These decisions define the session-agreed spike candidate. This record does
not amend `SPEC.md` or establish implementation acceptance.

## Observations

Tested state: documentation investigation from clean `main` at `7d40467`,
followed by working-tree notes on `codex/sp-01-game-rules`. Arithmetic and
winner eligibility were checked in the JavaScript tool runtime against the
cases below: 13 score calculations and 10 ending checks matched the expected
results. These are rules calculations, not tests of an application. The
joint tabletop round below also completed; its remaining turns were replayed
in the JavaScript tool runtime and the drawn-card quantities were checked
against the selected deck. No experimental code files were created.

Repository check: fetched `origin/main` after the experiment; both branch
HEAD and `origin/main` were `7d40467` (zero commits ahead/behind). Evidence
refers to the uncommitted SP-01 notes on that base. Markdown/local links were
inspected and `git diff --check` passed. No application tests exist here.

Reference check: read the publisher-verified Flip 7 rules on Dized, especially
[End of Round](https://rules.dized.com/game/dPDRM857TU-BFRF7LzGE0g/5e2F0f9aQFqzEEk3r8yRXQ/end-of-round).
The original seven-card round ending would make the proposed eight- through
ten-card bonuses unreachable. The candidate removes that conflict by moving
the whole-round ending to ten. This establishes reachability in principle,
not pacing or balance.

Reproduce each calculation from its stated cards and effects using the
scoring order above. No unspecified modifiers are present; decline roulette
unless an outcome is stated. All hands in ending checks have settled.

| Case | Outcome |
|---|---|
| Hold 4 and 9; predict 6; draw 2, then later draw 4. | 4, 9, and 2 freeze on the miss. The later 4 busts for zero round points, unless Second Chance discards that new 4; the original 4 remains frozen. |
| Hold frozen 2, 4, 9 and unfrozen 0, 1, 3, 5, 6, 7, 8. | Ten visible numbers, but only seven count; no ten-card ending. Score: 30 + 15 + 10 = 55. Frozen 2 and 4 cannot complete 4+2+0. |
| Unfrozen 8 and 12 after two correct predictions, with no miss between them. | 20 × 3 × 3 = 180. |
| Hold ×3 and +4, then miss a prediction on held 4, 9 and drawn 2; later draw 5. | Old modifiers remain disabled; bank 5, not 19. |
| Bank unfrozen 6, 7, 4, 2, 0. | 19 + 10 + 25 = 54; both combinations pay once. |
| Same five numbers with active ×2, one ×3, +4, and roulette ×2. | (19 × 2 × 3 + 4 + 10 + 25) × 2 = 306. Five cards do not satisfy seven. |
| Unfrozen 0, 2, 4, 6, 7, 8, 9 with one ×3; roulette ×2 / ×0. | Base 36 × 3 + 35 + 15 = 158; final 316 with seven qualification / 0 without qualification. |
| Bust with 6, 7, 4, 2, 0, active ×2, two ×3, +4, and a hypothetical roulette ×2. | Zero; a busted player is never offered roulette. |

Controlled card-count boundaries, using prefixes of the unfrozen sequence
`0, 1, 3, 4, 5, 8, 9, 10, 11, 12`. There are no combination bonuses in these
hands; no modifiers are present. These are subtotals before roulette.

| Unfrozen count | Number sum | Count bonus | Subtotal | Round ending from count |
|---|---|---|---|---|
| 6 | 21 | 0 | 21 | No |
| 7 | 30 | 15 | 45 | No |
| 8 | 40 | 30 | 70 | No |
| 9 | 51 | 60 | 111 | No |
| 10 | 63 | 120 | 183 | Yes, for everyone |

Controlled ending checks (other players do not qualify unless listed):

| Mode | Settled state | Result |
|---|---|---|
| 200 | A: 199 total, seven qualified | Continue |
| 200 | A: 200 total, no seven | A wins |
| 200-plus-seven | A: 200 total, no seven this round | Continue, even if A had seven in an earlier round |
| 200-plus-seven | A: 199 total, seven qualified | Continue |
| 200-plus-seven | A: 200 total, seven qualified | A wins |
| 200-plus-seven | A: 230, no seven; B: 210, seven qualified | B wins |
| 200 | Same A: 230 / B: 210 state | A wins |
| 200-plus-seven | A: 220 and B: 225, both seven qualified | B wins |
| 200-plus-seven | A and B: 220 each, both seven qualified | Another round with all players; both must qualify again |
| 200-plus-seven | A: 250 before this round, seven cards but roulette ×0 | Still 250, no seven qualification; continue |

Manual special-card sequence checks:

- Hold 6, 7, and Second Chance; predict 7 and reveal 7. Gain ×3, then
  consume protection and the new 7. The retained 6 and 7 score
  `13 × 3 + 10 = 49`; there are only two numbered cards. Without protection,
  the same correct prediction busts for zero.
- Hold 4, 9, +4, ×2, an earned ×3, and Second Chance. During Prediction,
  guess 6 and reveal another Prediction, +8, then 4. Queue the new Prediction,
  apply +8, then miss: freeze the numbers and disable all scoring modifiers,
  including +8. Second Chance discards itself and the new duplicate 4;
  original 4 and 9 remain frozen. The player survives, so the queued
  Prediction now resolves. The disabled modifiers do not reactivate.
- Hold nine unfrozen numbers `0, 1, 2, 3, 4, 5, 6, 8, 9`. A Flip Three
  sequence has upcoming cards `Prediction, 7, +4`. Queue Prediction; the 7
  reaches ten and ends the round. Cancel Prediction and leave +4 undrawn.
  Banking the final `0–9` hand yields `45 + 35 + 120 = 200`, satisfying both
  modes from zero if no other player outranks or ties it.

## Joint tabletop round: fixture and result

Four seats A (engineer), B, C, D; `n = 12`; all totals start at zero;
200-plus-seven mode. Use this controlled deck prefix, then any completion
consistent with the deck quantities:

`6, 12, 4, 9, 7, 8, Prediction, +4, 2, Second Chance, 2, 4, 9, 5, 0, 4, 8, 9, 10, 11, 12`.

Opening deal: A=6, B=12, C=4, D=9. On the first pass A draws 7, B draws 8,
and C draws Prediction and targets D. D predicts 6; +4 appears before 2,
so D's 9 and 2 freeze and +4 is disabled. D's ordinary turn then draws
Second Chance. This does not thaw the numbers.

At the decision checkpoint A holds 6, 7 (23 points); B holds 12, 8 (20);
C holds 4 (4); D holds frozen 9, 2, disabled +4, and Second Chance (0).
The engineer chooses to gamble A's 23 points immediately.

For the remainder, B banks without roulette at its next turn; C draws until
its subtotal reaches 40 or it busts, then banks without roulette; D draws
until its subtotal reaches 20 or it busts, then takes roulette. The first
roulette outcome is forced to ×2 for reproducibility; this does not test
randomness or probability balance.

| Turn | Action | Result |
|---|---|---|
| A | Roulette on 6, 7 | (13 + 10) × 2 = 46; banked |
| B | Bank 12, 8 | 20; banked |
| C | Draw 2 | 4, 2; subtotal 6 |
| D | Draw 4 | Frozen 9, 2; active 4; subtotal 4 |
| C | Draw 9 | 4, 2, 9; subtotal 15 |
| D | Draw 5 | Active 4, 5; subtotal 9 |
| C | Draw 0 | 4, 2, 9, 0; subtotal 15 + 25 = 40 |
| D | Draw 4 | Second Chance and new duplicate discarded; original 4 remains active |
| C | Bank | 40; banked |
| D | Draw 8 | Active 4, 5, 8; subtotal 17 |
| D | Draw 9 | Matches frozen 9; no protection remains; bust for zero |

The round ends with totals **A=46, B=20, C=40, D=0**. Nobody reaches 200 or
banks seven numbers, so the game continues in either mode. Eighteen cards
were drawn; the next cards 10, 11, and 12 remain unused. Every drawn-card
frequency fits the `n = 12` deck.

Observed: the first-pass prediction interrupted ordinary turn order without
taking away D's ordinary turn; a miss disabled an intervening modifier;
Second Chance preserved the original card's state; a later frozen duplicate
still busted; banked scores stayed fixed while others continued. One scripted
round does not establish typical game duration or player enjoyment.

## Alternatives and consequences

The engineer selected the alternatives recorded above. Consequences below
explain the resulting mechanics; they are not claims about unstated motives.

| Alternative not chosen | Consequence of the selected rule |
|---|---|
| End the round at seven | Moving the ending to ten makes the 8–10-card bonuses reachable. |
| Bank only the player reaching ten | Everyone instead faces a forced Bank-or-Roulette choice at ten. |
| Higher/lower prediction; cap repeated rewards at ×3 | Exact-number predictions can produce ×9 or ×27 through repeated success. |
| Leave the new number or old modifiers active after a miss | The entire existing scoring setup is disabled; later cards rebuild from zero. |
| Let frozen numbers earn bonuses or thaw later | Frozen numbers retain duplicate risk without a scoring or count benefit for that round. |
| Accumulate all card-count bonuses | Ten pays +120 rather than +225 in count bonuses. |
| Carry a seven-card achievement between rounds | The qualifying hand must be banked in the finishing round, including after ties. |
| Preserve seven qualification after roulette ×0 | Gambling can lose both the round score and eligibility to win in 200-plus-seven mode. |

## Conclusion and handover

Candidate v1.0 gives consistent outcomes for the tested scoring boundaries,
special-card interactions, both ending modes, and the complete four-seat
round. No contradiction remained in those cases. This supports using it as
the candidate for implementation planning and balance investigation; it does
not establish that the game is balanced or that an implementation passes
acceptance.

Remaining uncertainty belongs in SP-04: game length and win frequency for
each maximum and ending mode; the effect of permanent frozen-card risk;
exact-number prediction difficulty; and the large score swings from stacked
multipliers and roulette. Only one engineer played against scripted seats,
not four independent human players. Randomness, multiplayer behavior, and
hosting were not tested by this spike.

Proposed changes for the `SPEC.md` writing engineer:

- Adopt or reference this candidate's deck/turn rules for AC-02 and the shared
  turn model, prediction/freeze rules for AC-04, combinations and bonuses for
  AC-07, roulette and scoring order for AC-08, and ending/tie rules for AC-05.
- Use the controlled cases above as expected outcomes for those criteria;
  mark the corresponding rule questions resolved once the team accepts the
  candidate. Keep unrelated product and infrastructure decisions separate.

Disposition: only this spike record changed. JavaScript scratch calculations
and the bounded replay were used as investigation aids; there is no retained
experimental code to merge or reuse as product implementation. No spec or
slice was edited.
