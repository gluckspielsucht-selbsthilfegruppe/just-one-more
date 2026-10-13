# Game rules

This is the rules contract implemented by `src/shared/engine.ts` and `src/shared/scoring.ts`. The in-game rulebook (`src/client/components/Rules.tsx`) summarizes the same rules for players. When rules change, update the engine, its tests, this document, and the in-game rulebook together.

## Deck

One 0 and `v` copies of every numbered value `v` from 1 through the selected maximum `n` (12, 13, 14, or 15). Three each of Prediction, Flip Three, and Second Chance; one each of +2, +4, +6, +8, +10, and ×2; one AI Hackathon card.

| Maximum n | Numbered cards: 1 + n(n+1)/2 | Special cards | Total |
| --------- | ---------------------------- | ------------- | ----- |
| 12        | 79                           | 16            | 95    |
| 13        | 92                           | 16            | 108   |
| 14        | 106                          | 16            | 122   |
| 15        | 121                          | 16            | 137   |

Seats follow join order. The host starts the first round; the starting seat rotates each round. The unused deck is kept between rounds. When it runs out, previous-round discards are shuffled into a new deck; every current-round card stays aside, including spent and busted cards. If no cards are available, everyone still active must bank, using the same final Bank-or-Roulette choice as a ten-card ending. Unfinished effects are cancelled without resolving an incomplete prediction. At round end, hands, frozen states, modifiers, protection, seven-card qualification, and reverse mode are cleared; only scores carry over.

## Ordinary round and card-count bonuses

- Deal one opening card per player, then take turns choosing **Draw** or **Bank**.
- A duplicate numbered card, including a match with a frozen number, busts the player for zero round points unless Second Chance discards the new duplicate. Scores from completed rounds carry over.
- Banking removes the player from the active round. The round ends when everyone has banked or busted, or someone reaches ten unfrozen numbers.
- Card-count bonuses use the unfrozen numbered cards held at scoring: seven gives +15, eight +30, nine +60, and ten +120. Only the highest applicable bonus pays.

## Round boundaries and prediction

- Reaching seven, eight, or nine numbered cards does not end the round.
- Reaching ten unfrozen numbered cards ends the round immediately for everyone and cancels all remaining forced draws and queued actions. Every still-active player gets one final Bank-or-Roulette choice.
- Frozen numbered cards count only for duplicate detection. They contribute no points, combinations, card-count bonuses, or seven/ten-card conditions.
- **Prediction:** the drawer chooses any active player, including themselves. The recipient guesses the exact value (0 to `n`) of their next numbered card and draws through to it in the same action.
- A correct prediction grants ×3 on the unfrozen numbered-card total for that round. Correct predictions stack multiplicatively (×3, ×9, ×27). An active ×2 multiplies the number total too; roulette applies after all bonuses.
- An incorrect prediction freezes all held numbered cards, including the newly drawn one, for the rest of the round. It also disables all existing score modifiers for the rest of the round: held +point cards, ×2, and earned prediction multipliers. The first correct prediction after a miss grants ×3 again.

## Special-card resolution

- **Flip Three** targets any active player, including its drawer. The recipient receives three physical cards; special cards count toward the three.
- During a forced sequence, +point cards, ×2, and Second Chance apply immediately. Newly drawn Prediction and Flip Three cards are queued in reveal order and resolve after the current forced sequence. Each queued card belongs to its recipient, who chooses an active target when it resolves. Forced effects complete before ordinary turns continue.
- For a predicted number: the guess resolves first, then duplicate handling or Second Chance, then the ten-card check. A correct guess does not prevent a duplicate bust.
- **Second Chance** is consumed together with the new duplicate; the original card keeps its frozen/unfrozen state. A player holds at most one: an extra passes to the next active player without one in seat order, or is discarded if none exists. It survives a prediction miss and expires at round end.
- Busting stops that player's forced draws and discards their queued action cards.
- Opening-deal effects resolve before the opening deal continues; inactive seats are skipped. A forced draw does not replace the recipient's next ordinary turn. Banked and busted players cannot be targeted.

## AI Hackathon (reverse round)

Revealing the single AI Hackathon card reverses the rest of the current round for everyone:

- Turn order runs backward.
- A player's first number is safe; after that, a **new** value busts and repeats are safe. Second Chance discards the next new value instead of a duplicate.
- Number points become `n − value`. +point cards, combinations, and card-count bonuses subtract instead of add; ×2 halves the number sum instead of doubling it.
- Prediction rewards a wrong guess (×3) and freezes on a correct guess.
- Flip Three makes the target discard their three most recently held cards instead of drawing three.
- Round scores cannot fall below zero. Hands that were already banked are recalculated under reverse rules when the card appears.
- The next round starts with normal rules.

In a practice game (one human with bots), the host can reveal AI Hackathon immediately with **Trigger AI Hackathon**. It uses the real card from the deck or previous-round discards and is unavailable once reverse mode is active.

## Combinations, roulette, and win eligibility

- Unfrozen 6 and 7 award +10; unfrozen 4, 2, and 0 award +25. Draw order does not matter; each combination pays once and both can apply. Frozen cards cannot complete them.
- **Roulette** is an optional gamble when banking: 50 % ×0, 50 % ×2, applied to the entire round score after all bonuses. Losing roulette also loses seven-card qualification for this round. Players who already banked cannot roll again at a ten-card ending.
- **200-point mode:** a cumulative score of at least 200 qualifies. **200-plus-seven mode:** the same player must also bank at least seven unfrozen numbered cards in the finishing round; earlier rounds do not count.
- Winners are checked after the whole round and every roulette choice resolves. The highest cumulative total among qualifying players wins. If the top qualifying total is tied, everyone plays another round with carried totals; in 200-plus-seven mode, players need a new qualifying hand.

## Scoring order

1. Sum unfrozen numbered cards.
2. Multiply by active ×2 and every active prediction multiplier.
3. Add active +point cards, each eligible combination, and the single applicable card-count bonus.
4. Apply roulette: ×1 if declined, otherwise ×0 or ×2.
5. Add the result to the cumulative score at round settlement, then evaluate the game-ending condition for all players.

A bust always scores zero. Frozen cards and disabled modifiers contribute nothing:

`round score = (unfrozen sum × active multipliers + active flat points + combination bonuses + card-count bonus) × roulette factor`

## Worked examples

Expected outcomes for scoring and endings. `tests/unit/engine.test.ts` covers the deck sizes, card-count boundaries, scoring order, ending rules, and the tabletop fixture. Roulette is declined unless stated.

| Case                                                                      | Outcome                                                                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Hold 4 and 9; predict 6; draw 2, then later draw 4.                       | 4, 9, and 2 freeze on the miss. The later 4 busts unless Second Chance discards it; the original 4 stays frozen. |
| Hold frozen 2, 4, 9 and unfrozen 0, 1, 3, 5, 6, 7, 8.                     | Only seven numbers count; no ten-card ending. Score 30 + 15 + 10 = 55. Frozen 2 and 4 cannot complete 4+2+0.     |
| Unfrozen 8 and 12 after two correct predictions.                          | 20 × 3 × 3 = 180.                                                                                                |
| Hold ×3 and +4, miss a prediction on held 4, 9 and drawn 2; later draw 5. | Old modifiers stay disabled; bank 5.                                                                             |
| Bank unfrozen 6, 7, 4, 2, 0.                                              | 19 + 10 + 25 = 54.                                                                                               |
| Same five numbers with ×2, one ×3, +4, and roulette ×2.                   | (19 × 2 × 3 + 4 + 10 + 25) × 2 = 306. Five cards do not satisfy seven.                                           |
| Unfrozen 0, 2, 4, 6, 7, 8, 9 with one ×3; roulette ×2 / ×0.               | 36 × 3 + 35 + 15 = 158; final 316 with seven qualification / 0 without qualification.                            |
| Bust with 6, 7, 4, 2, 0, ×2, two ×3, +4.                                  | Zero; a busted player is never offered roulette.                                                                 |

Card-count boundaries for prefixes of the unfrozen sequence `0, 1, 3, 4, 5, 8, 9, 10, 11, 12` (no combinations or modifiers):

| Unfrozen count | Number sum | Count bonus | Subtotal | Ends the round |
| -------------- | ---------- | ----------- | -------- | -------------- |
| 6              | 21         | 0           | 21       | No             |
| 7              | 30         | 15          | 45       | No             |
| 8              | 40         | 30          | 70       | No             |
| 9              | 51         | 60          | 111      | No             |
| 10             | 63         | 120         | 183      | Yes            |

Ending checks (other players do not qualify unless listed):

| Mode           | Settled state                                      | Result                                      |
| -------------- | -------------------------------------------------- | ------------------------------------------- |
| 200            | A: 199 total, seven qualified                      | Continue                                    |
| 200            | A: 200 total, no seven                             | A wins                                      |
| 200-plus-seven | A: 200 total, no seven this round                  | Continue                                    |
| 200-plus-seven | A: 200 total, seven qualified                      | A wins                                      |
| 200-plus-seven | A: 230, no seven; B: 210, seven qualified          | B wins                                      |
| 200            | Same A: 230 / B: 210 state                         | A wins                                      |
| 200-plus-seven | A and B: 220 each, both seven qualified            | Another round; both must qualify again      |
| 200-plus-seven | A: 250 before this round, seven cards, roulette ×0 | Still 250, no seven qualification; continue |

### Tabletop fixture

Four seats A, B, C, D; `n = 12`; 200-plus-seven mode; totals start at zero. Deck prefix:

`6, 12, 4, 9, 7, 8, Prediction, +4, 2, Second Chance, 2, 4, 9, 5, 0, 4, 8, 9, 10, 11, 12`

Opening deal: A=6, B=12, C=4, D=9. A draws 7, B draws 8, C draws Prediction and targets D. D predicts 6; +4 appears before 2, so D's 9 and 2 freeze and +4 is disabled. D's ordinary turn draws Second Chance.

| Turn | Action           | Result                                                               |
| ---- | ---------------- | -------------------------------------------------------------------- |
| A    | Roulette on 6, 7 | (13 + 10) × 2 = 46 (×2 forced for reproducibility); banked           |
| B    | Bank 12, 8       | 20; banked                                                           |
| C    | Draw 2           | 4, 2; subtotal 6                                                     |
| D    | Draw 4           | Frozen 9, 2; active 4; subtotal 4                                    |
| C    | Draw 9           | 4, 2, 9; subtotal 15                                                 |
| D    | Draw 5           | Active 4, 5; subtotal 9                                              |
| C    | Draw 0           | 4, 2, 9, 0; subtotal 15 + 25 = 40                                    |
| D    | Draw 4           | Second Chance and new duplicate discarded; original 4 remains active |
| C    | Bank             | 40; banked                                                           |
| D    | Draw 8           | Active 4, 5, 8; subtotal 17                                          |
| D    | Draw 9           | Matches frozen 9; no protection remains; bust for zero               |

Final totals **A=46, B=20, C=40, D=0**. Eighteen cards were drawn; 10, 11, and 12 remain next in the deck.
