---
name: team-workflow
description: "Use the Just One More team's Spec, Spike, Slice, and Check workflow when asked to plan project work, investigate an agreed spike, implement or resume a slice, or record acceptance checks. Skip for ordinary questions and small standalone fixes."
---

# Team workflow

Use the stage the engineer requested. This skill supports the repository's
working agreement; it does not authorize extra scope, document changes, Git
publication, or moving from a proposal into implementation.

Resolve project paths from the repository root. Read the relevant sections of
[AGENTS.md](../../../AGENTS.md) and [README.md](../../../README.md) if not already
in context, plus existing task records. Load only the template needed now.
Missing product documents are not a reason to create them without a request.

## Plan or record decisions

- For a planning request, clarify outcome, scope, constraints, observable
  acceptance, shared interfaces, and consequential unknowns. Inspect relevant
  code when it exists. Present options and unresolved decisions separately.
- When the designated engineer asks to write the spec, use
  [the spec template](../../../templates/SPEC.md). Record agreed decisions;
  keep unresolved items explicit. A request to discuss a plan alone does not
  authorize writing `SPEC.md` or implementing it.
- Use stable `AC-XX` IDs. The team assigns `SP-XX` IDs to agreed spikes. Never
  reassign existing IDs or treat template examples as requirements.

## Run an agreed spike

- Establish the question, owner, branch, experiment, evidence needed, and
  timebox/checkpoint from the request and relevant spec. Ask only for missing
  information that determines the experiment. Rely on the engineer's
  checkpoint for the timebox; do not promise unattended timed execution.
- Use [the spike template](../../../templates/SPIKE.md) for
  `spikes/SP-XX-short-name.md`. Run the smallest experiment that can answer
  the question. Stop at the agreed boundary, an answer, or a blocker.
- Record observations, tested state, and reproducible steps before drawing
  conclusions. Inconclusive is valid. Record experimental code disposition
  and propose any required spec change; do not promote the experiment into
  product implementation.

## Propose, implement, or resume a slice

- For a proposal, identify one usable outcome, relevant `AC-XX` items,
  boundaries, and verification. Wait for agreement before implementation.
- For an agreed slice, use its existing record or, when requested, create one
  from [the slice template](../../../templates/SLICE.md) at
  `slices/SL-<initial><n>-short-name.md`. The owner chooses the ID. Establish
  the assigned branch and file ownership; do not select an unrelated slice.
- Read the referenced spec sections, spike conclusions, and relevant check
  failures. On resumption, compare the recorded state with actual files and
  Git state before continuing. Retain useful context; correct stale notes.
- Implement within the agreed boundaries and verify the outcome. An explicit
  implementation request is enough to proceed; do not request approval again
  for the same work. Keep any useful execution plan inside the slice record.
- Update Check with observed evidence and Resume with what remains. Use
  `Blocked` for a real impediment; `Ready for acceptance` when required checks
  pass and the branch includes current `main`. Only the engineer's acceptance
  permits `Done`. A failed check or unverified acceptance criterion remains
  visible and prevents claiming the slice is ready.

## Check a slice or integration

- For a check-only request, run checks and record evidence; report failures
  for follow-up without assuming permission to change implementation. During
  an implementation request, fixing failures caused by the task is in scope.
- Map each requested criterion or behavior to an appropriate existing test or
  manual procedure. Use verified project commands, inspect the actual output,
  and distinguish passed, failed, blocked, and not checked results.
- Record the tested commit or working-tree changes and environment. Follow
  README's Git update procedure before reporting implementation readiness.
  Identify gaps even when the build succeeds. Verify other agents' results
  from artifacts and checks rather than accepting their summaries as proof.
- Put slice evidence in the slice's Check section. For requested integrated
  checks on `main`, use [the check template](../../../templates/CHECK.md) to
  create or append to `CHECK.md`. Preserve previous checks and other owners'
  entries. For small standalone tasks, the chat handover is sufficient.

Keep documents short: remove unused template headings and comments, reference
IDs instead of copying requirements, and write current evidence and next steps
rather than an activity log. Return the concise handover from `AGENTS.md`.
