# Agent Working Agreement

## Start with the task

- Engineers own scope, priorities, shared interfaces, and acceptance.
  Carry an authorized task through implementation and verification; decide
  routine, reversible details without asking again.
- Planning starts when requested. `templates/` contains unfilled templates,
  not requirements. Once `SPEC.md` exists, it is the agreed target.
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
- Before reporting readiness, update from `main` as described in `README.md`
  and rerun relevant checks. Report blocked checks and untested behavior.
- Keep records short and tied to the tested commit or working-tree state.
  Update an assigned slice's check/resume notes at meaningful checkpoints.
  The engineer decides when a slice is done.
- Handover: what changed; checks and results; remaining uncertainty; decisions
  needed; proposed document changes outside your assignment. Omit empty items.
