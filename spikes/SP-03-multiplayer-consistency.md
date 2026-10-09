# SP-03: Do competing and repeated actions preserve one room state?

Status: Planned; experiment not started
ID: Proposed SP-03; pending team confirmation
Owner: Unassigned; recommend Developer C (one developer)
Branch: To be chosen by the owner before execution
Checkpoint: Proposed 15–20 minutes of investigation, tracked by the engineer; report dependency waits separately
Basis: SPEC.md at 86db322; AC-03; supports AC-01 and AC-02

## Question and importance

Can the candidate room design apply valid actions once, reject invalid actions,
and bring all browsers back to the same authoritative state? Connectivity alone
does not answer this. The result informs the message and state-update contract.

## Dependencies and staffing

One developer can start a local experiment immediately using provisional turn
and action semantics. Coordinate the experimental contract with
[SP-02](SP-02-cloudflare-feasibility.md) first to avoid incompatible harnesses.
Hosted evidence requires SP-02's viable setup; game-specific validation needs
the relevant decisions from [SP-01](SP-01-game-rules.md). Neither is required
to start the generic local experiment.

Concurrent coding uses separate worktrees or clones with explicit file
ownership. Agree on harness handoff and ownership before changing shared code.

## Experiment and evidence needed

1. Define a tiny provisional turn-based action, participant identity, action
   IDs, state revisions, and expected handling of rejection and reconnection.
   Agree on experimental expectations before checking results; these are not
   approved production interfaces or new product requirements.
2. Exercise a normal action, duplicate submission, two competing actions,
   out-of-turn submission, stale-state submission, and a reconnect after a
   missed update. Include retrying an action whose acknowledgement was lost.
3. Record accepted/rejected action IDs and state revisions. Verify one effect
   per accepted action, no state change from rejected actions, and convergence
   of every client on the same authoritative state.
4. Repeat the relevant sequence with four sessions on SP-02's hosted setup.
   Incorporate SP-01's agreed turn rules when available; explicitly distinguish
   generic protocol evidence from game-rule validation.

Record exact reproduction steps, tested revision/environment, expected and
observed outcomes, and client/server evidence. Measure update delays; a pass/fail
latency target remains a team decision. If hosting or rules are unavailable,
report local findings and the outstanding checks without claiming completion.

## Expected handover

A proposed action/state message contract, duplicate-handling and reconnect
approach, evidence for the tested cases, and remaining failure modes. Shared
interfaces require team approval. Experimental code remains separate and must
be rebuilt in an agreed slice before integration into main.
