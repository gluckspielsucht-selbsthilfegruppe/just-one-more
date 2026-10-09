# SP-02: Can four browsers share a hosted room at zero cost?

Status: Planned; experiment not started
ID: Proposed SP-02; pending team confirmation
Owner: Unassigned; recommend Developer B (one developer)
Branch: To be chosen by the owner before execution
Checkpoint: Proposed 20 minutes, tracked by the engineer; stop earlier on an answer or blocker
Basis: SPEC.md at 86db322; AC-01, AC-06; supports AC-03

## Question and importance

Can a candidate Cloudflare setup support four real-time browser participants
on the intended presentation networks under the spec's ongoing zero-cost
constraints? Hosting and transport choices depend on this evidence.

## Dependencies and staffing

No dependency on [SP-01](SP-01-game-rules.md). Start immediately with one
developer. Coordinate a minimal provisional room/action/state contract with
the owner of [SP-03](SP-03-multiplayer-consistency.md), keeping it experimental.
Provide a hosted harness and reproducible access steps for SP-03's hosted checks.
Four browser sessions are required; a fourth developer is not required to
operate them. Cover the actual presentation network paths.

## Experiment and evidence needed

1. Select a candidate product combination for investigation. Before deployment,
   verify current official documentation and the exact account settings for
   account/card requirements, free quotas, behavior at limits, trial conversion,
   possible card holds, WebSocket/idle behavior, and cleanup. Record sources
   and verification date. Do not enable paid usage, overages, automatic paid
   upgrades, or chargeable add-ons. Alerts alone do not establish zero cost.
2. If those constraints can be met, deploy a disposable room with membership
   and a shared counter. Avoid game rules and production UI.
3. Connect four browser sessions through the intended presentation networks.
   Exercise joining, counter updates, disconnect/reconnect, and idle/resume
   within the checkpoint. Compare membership/state and measure update delays.
4. Record exact setup, deploy, join, reproduction, and cleanup steps. Retain
   only resources needed for the agreed SP-03 handoff; identify their owner
   and remaining cleanup. Stop if account access or network paths are blocked.

Evidence must separate observed behavior from documented limits and untested
claims. Record tested revisions, products/settings, network paths, observed
delays, and failures without exposing credentials. Do not deliberately exhaust
quotas or cause charges to prove limit behavior. Long idle behavior that cannot
be tested within the checkpoint remains explicitly unverified.

## Expected handover

A supported or unsupported hosting recommendation, free-plan safeguards,
four-session evidence, deployment/cleanup instructions, and remaining risks.
Local connectivity alone does not establish hosted feasibility. This harness
does not prove completion of a real game or full AC-06 acceptance. Propose
architecture/SPEC.md changes for team approval; keep experimental code separate
and rebuild useful parts in an agreed slice before integration into main.
