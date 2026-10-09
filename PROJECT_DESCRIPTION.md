# Project: Just One More

You will assist with the design and development of **Just One More**, a browser-based, real-time multiplayer card game based on **Flip7**, but with modified and expanded rules.

The following description is an initial project overview. **The rules and other project details are not yet fully defined and will be expanded in subsequent steps.** Do not treat open questions as finalized requirements or invent binding rules. Design the implementation so that additional rules, game configurations, designs, and animations can be added later.

## 1. Platform and Core Concept

- The application runs in the browser.
- It is a multiplayer game.
- Game states and game events update in real time.
- Flip7 serves as the foundation; the new game is called **Just One More**.
- The game will have an expanded ruleset that can be extended further in the future.
- Which unmodified Flip7 rules will be adopted must be clarified as the project progresses.

## 2. Entry Point, Dashboard, and Lobby

There is a lobby with a **welcome dashboard**.

From there, users should be able to:
- view active games;
- create a new lobby or game;
- potentially join existing games.

Joining existing games through the lobby is a potential feature, but it has not yet been finalized. The precise distinction between a general lobby, individual game lobbies, and games also needs clarification.

## 3. Accounts and Guest Access

- Users can optionally create an account.
- An account is not required to play.
- Users can also join as guests.
- Guests have limited functionality.
- Accounts may allow certain data or settings to be saved persistently.

Open questions:
- Which features are unavailable to guests.
- Which data or settings are saved for accounts.
- How registration and login will be implemented.

## 4. Design and Future Visual Enhancements

- Accounts and/or cards should support individual **custom designs**.
- The appearance and assignment of account designs and card designs have not yet been defined.
- The initial design should remain simple.
- Additional designs and various animations will be added later.
- The implementation should accommodate these future enhancements.

## 5. Expanded Rules

### 5.1 Replacement for the Classic Freeze Card

The classic Freeze card from Flip7 will be replaced by a differently named card with a modified effect. The new name has not yet been decided.

Intended sequence:

1. A player receives this new special card.
2. Before receiving their next card, that player must guess which card they will receive.
3. The next card is then revealed or dealt.
4. Depending on the outcome, the following applies:

**Correct guess:**
- The player receives a **×3 multiplier**.

**Incorrect guess:**
- All cards the player holds at that point are frozen.
- These frozen cards no longer contribute to the score.
- However, they still count when checking for duplicates.
- If the player later receives a duplicate of a frozen card, they are still eliminated for that round.

Open questions:
- What the ×3 multiplier applies to and how long it lasts.
- What exactly must be guessed, such as the card value or card type.
- Whether the newly revealed card is also frozen after an incorrect guess.
- Whether and when frozen cards can be reactivated.
- How multiple instances of this special-card effect interact.

### 5.2 Configurable Number Range

The number range starts at **0** and extends to a configurable maximum value of **n**. It is not restricted to a fixed maximum card value.

Possible configurations include:
- 0–12
- 0–13
- 0–14
- 0–15
- generally, **0–n**

The maximum card value should be configurable when creating a game.

The permitted limits for `n`, as well as card frequencies and deck composition for different number ranges, remain undefined.

### 5.3 Optional Game-End Condition Requiring at Least Seven Cards

- It should be possible to configure the game so that it can only end with **at least seven cards**.
- Instead of ending solely upon reaching **200 points**, an additional or alternative card-count condition should be possible.
- This setting is optional.

The exact meaning still needs clarification:
- Does the card-count condition replace or supplement the points condition?
- At what moment is the minimum card count checked, and which cards count toward it?
- Must the player who ends or wins the game hold at least seven cards?

Do not independently make binding decisions on these open questions.

### 5.4 Combination Bonuses

Certain card combinations should award bonus points:

| Combination | Intended Effect |
|---|---|
| **6 and 7** | Bonus points |
| **4, 2, and 0** | Bonus points |

The second combination consists of **three cards with the values 4, 2, and 0**, not the values 4 and 20.

Open questions:
- The exact bonus values.
- Whether card order matters.
- Whether combinations can score multiple times.
- Whether frozen cards count toward combinations.
- How multiple combinations completed simultaneously are scored.

### 5.5 Card-Count Bonuses

The following additional bonuses are planned:

| Number of Cards | Bonus |
|---|---:|
| 7 cards | +15 points |
| 8 cards | +30 points |
| 9 cards | Higher bonus; value not yet defined |
| 10 cards | Another, even higher bonus; value not yet defined |

- These bonuses should grow **exponentially**.
- An exact formula has not yet been defined.
- Do not derive binding values for nine or ten cards from the first two values.

Open questions:
- Whether only the bonus for the reached card count applies or multiple bonuses accumulate.
- Which cards count toward the total, particularly frozen cards and special cards.
- How card-count bonuses interact with combination bonuses and multipliers in score calculations.

### 5.6 Roulette Factor

- A **roulette factor** should be incorporated into the game at a point yet to be determined.
- Its specific mechanics, triggers, and effects have not yet been defined.
- For now, treat it as a planned game mechanic that still needs to be developed.

## 6. Extensibility

The following areas should support future expansion:
- Rules and special-card effects
- Game and initial setup configurations
- Number ranges
- Game-end conditions
- Combinations and bonus calculations
- Roulette mechanics
- Account and guest features
- Designs and animations

## 7. Working Guidelines

- Use this description as a preliminary project foundation, not as a fully specified ruleset.
- Distinguish between established requirements, optional features, and open decisions.
- Ask for clarification when an open decision becomes relevant to the next implementation step.
- Explicitly label your own suggestions as proposals.
- Keep the initial design simple.
- Avoid an implementation that unnecessarily complicates future rule and configuration extensions.
- Further details will be provided in subsequent steps.