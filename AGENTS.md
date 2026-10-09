# Agent Working Agreement

## Start with the task

- Engineers own scope, priorities, shared interfaces, and acceptance.
  Carry an authorized task through implementation and verification; decide
  routine, reversible details without asking again.
- Planning starts when requested. `templates/` contains unfilled templates,
  not requirements. Explicitly approved requirements in `SPEC.md` are the
  target; file existence does not approve draft criteria or open decisions.
- Before substantial work, inspect the branch and working tree, then read only
  the relevant `SPEC.md` sections, assigned slice, referenced spikes, relevant
  failures in `CHECK.md`, and setup/commands in `README.md`, when they exist.
  Ordinary Markdown files are not automatically loaded as instructions.
- If documents conflict, name the conflict and ask. Reread shared decisions
  when told they changed. Do not invent missing project decisions or commands.

## Choose the amount of process

- For a small, clearly requested fix or documentation change, implement and
  check it directly. A spec, spike, or slice file is not a prerequisite.
- For planning, spikes, slice implementation/resumption, or acceptance checks,
  use the repository's `team-workflow` skill. If it is not listed, read
  [.agents/skills/team-workflow/SKILL.md](.agents/skills/team-workflow/SKILL.md).
- Follow only the requested stage. Proposing work is not approval to implement
  it; implementing agreed work does not need a second approval to begin.

## Boundaries

- Ask before an unapproved change to scope, shared interfaces, dependencies,
  architecture, or another contributor's work. Continue independent work
  while a consequential decision is pending.
- Edit assigned files only. Edit `SPEC.md` only when its writing engineer asks;
  edit `templates/` only when requested. Propose other document changes in the
  handover. Never overwrite or revert another contributor's work.
- Keep implementation within the task; avoid unrelated refactoring. Spike code
  is experimental and must not be merged into `main` as-is.
- Use the engineer's chosen branch. Commit to `main` only when told to.
  Push, open, or merge pull requests only when asked. Never force-push or
  rewrite `main` or another contributor's branch. Follow
  [Git and integration](README.md#git-and-integration).
- Use one agent by default. Delegate only when requested; concurrent coding
  agents need separate worktrees or clones and explicit file ownership.

## Verify and hand over

- Debug by reproducing, forming a hypothesis, and testing it. Use commands
  verified in `README.md` or repository scripts/configuration.
- Check the requested behavior and relevant acceptance criteria. Run the
  appropriate checks, inspect their output, and fix failures caused by this
  task. A passing build or another agent's success message is not evidence
  that the requested behavior works.
- Follow [QUALITY.md](QUALITY.md) for implementation and acceptance checks.
  Use approved input/output examples as the test oracle. Do not derive
  expected results from the implementation being tested. Cover relevant
  failure cases as well as the happy path.
- Never make a check green by weakening an assertion, skipping a required
  test, accepting a new snapshot, or changing the expected rules without
  explaining the reason and obtaining approval for a changed expectation.
- Highlight changes to tests, CI, verification scripts, and acceptance criteria
  in the handover. Do not claim product readiness from a setup check. Missing,
  blocked, or flaky required checks prevent readiness.
- Before reporting readiness, update from `main` as described in `README.md`
  and rerun relevant checks. Report blocked checks and untested behavior.
- Keep records short and tied to the tested commit or working-tree state.
  Update an assigned slice's check/resume notes at meaningful checkpoints.
  The engineer decides when a slice is done.
- Handover: what changed; checks and results; remaining uncertainty; decisions
  needed; proposed document changes outside your assignment. Omit empty items.
- Make acceptance possible without reading code: provide a runnable demo or
  preview, AC-linked results, failure evidence, and a short owner walkthrough.
  The owner accepts observable behavior; the agent checks implementation.

## Review priorities

- Review agreed rules and transitions against independent examples; look for
  scoring, duplicate, frozen-card, and end-condition errors.
- Check that one authority validates actions and that repeated, stale, or
  cross-room actions cannot corrupt state or disclose another room's data.
- Check that test controls and credentials are absent from the public game.
  Report consequential findings with a reproduction or specific evidence.
  AI review supports tests and owner acceptance; it cannot replace them.
