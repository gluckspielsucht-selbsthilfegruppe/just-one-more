# SP-04: Does the candidate ruleset fit a practical demo?

Status: Conditional; experiment not started
ID: Proposed SP-04; pending team confirmation
Owner: Unassigned; recommend Developer A after SP-01 (one developer)
Branch: To be chosen by the owner before execution
Checkpoint: Proposed 20 minutes, tracked by the engineer; run only if pacing remains consequential
Basis: SPEC.md at 86db322; supports AC-05, AC-07 and demo feasibility

## Question and importance

Can a game finish within the team's chosen demo window, and are the seven-card
condition and larger bonuses realistically reachable under the candidate rules?
This is optional investigation, not a prerequisite for every implementation slice.

## Dependencies and staffing

Meaningful results require a defined, versioned candidate ruleset and deck
frequencies from [SP-01](SP-01-game-rules.md). Rules need not be finally approved
to compare candidates, but all assumptions must be explicit. No dependency on
hosting or multiplayer consistency. Start only if uncertainty remains after
SP-01; otherwise record why the spike is unnecessary.

Recommend one developer, preferably SP-01's owner, with brief help from the
other two for a human playtest. Agree on the intended demo duration before
judging whether pacing is acceptable.

## Experiment and evidence needed

1. Choose explicit simple player strategies and reproducible random seeds.
   Simulate candidate decks/settings and both ending modes if a small simulator
   is practical within the checkpoint. Otherwise report manual evidence and
   the sampling limitation rather than inferring probabilities.
2. Record rounds/actions to finish, bust frequency, seven-card qualification,
   8–10-card bonus frequency, and the score contribution of bonuses, multiplier,
   and roulette. Bound simulated games and report unfinished/capped runs too.
3. Run a short human playtest to observe decision time and confusing mechanics.
   Simulated action counts alone do not measure wall-clock game duration.
4. Compare alternatives only where evidence suggests a consequential pacing
   problem. Keep candidate changes explicit and seek team agreement before
   treating them as rules.

Record rules version, settings, seeds, strategies, sample sizes, distributions,
playtest duration, and limitations. Distinguish mathematical reachability from
observed frequency. Results depend on player strategies and cannot establish fun.

## Expected handover

Observed pacing and mechanic frequencies, remaining uncertainty, and any
recommended rule adjustments or SPEC.md changes for team approval. Do not
expand into exhaustive game balancing. Experimental code remains separate and
must be rebuilt in an agreed slice before integration into main.
