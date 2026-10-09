# Just One More — Codex Workflow

Use Codex to take a clear task from investigation through implementation and
verification. Engineers decide what to build, agree on shared interfaces, and
accept the result. Keep the existing **Spec → optional Spike → Slice → Check**
method, using only the stages that help the task.

This repository currently contains the workflow and templates. No application
stack or product specification has been selected.

## Start here

Open this repository in Codex. Give it an outcome, relevant file or acceptance
references, important boundaries, and a way to verify success. Name the branch
you want it to use when assigning implementation work.

For a small fix, ask directly:

> Fix [observed problem]. Expected behavior: [result]. Work on [branch].
> Verify with [reproduction or existing check].

For planned work, invoke the repository skill:

> $team-workflow Implement slices/SL-Y1-name.md on codex/SL-Y1-name.
> Run the relevant checks and update the slice's evidence and resume notes.

These are examples; replace the placeholders with the actual task. A clear
implementation request authorizes the local work and its checks. Codex should
ask when a new consequential decision is needed, not at every step.

## How the AI workflow works

You give Codex a task in this repository and say what result you expect. Codex
starts with the rules in `AGENTS.md`, reads only the project files relevant to
that task, and uses `$team-workflow` when you ask it to plan, run a spike,
implement a slice, or record a check. The skill tells Codex how to carry out
the requested stage; it does not start later stages on its own.

For a new feature, the usual path is:

1. **Agree on the target.** Describe the idea and constraints. Ask Codex to
   propose scope, acceptance criteria, and shared interfaces. The team makes
   the decisions; the designated engineer asks Codex to write `SPEC.md` once
   they are agreed.
2. **Investigate only what is uncertain.** If an important technical question
   blocks a decision, assign a bounded spike. Codex records what it tried,
   observed, and concluded in `spikes/`. Skip this step when the approach is
   clear.
3. **Build one usable increment.** Assign a slice, branch, and files. Codex
   implements the agreed outcome, runs relevant checks, and keeps evidence and
   next steps in the slice file. A later session can resume from that file.
4. **Review and integrate.** Inspect the change and its checks. The engineer
   accepts the slice and decides when to push or merge it. Before sharing the
   integrated result, ask Codex to verify the app on `main` and record
   cross-slice results in `CHECK.md`.

You can ask for just one step: “plan this”, “run SP-01”, “implement SL-Y1”, or
“check AC-01”. For a small fix with a clear expected result, skip the project
documents and ask Codex to make and verify the change directly. Give it the
reproduction steps or acceptance criterion, plus the branch to use. The
[prompts below](#prompts) show copyable starting points for each stage.

## How Codex uses these files

| File | Role | When to read or write |
|---|---|---|
| [AGENTS.md](AGENTS.md) | Short, persistent repository rules | Loaded by Codex's instruction discovery |
| [team-workflow skill](.agents/skills/team-workflow/SKILL.md) | Procedures for planning, spikes, slices, and checks | Loaded when the requested work calls for it |
| [README.md](README.md) | Human workflow, setup, and commands | Relevant sections before work |
| [templates/](templates/) | Starting formats, with no agreed requirements | Read only the template for a document being created |
| `SPEC.md` | Agreed goal, scope, acceptance criteria, and shared interfaces | Written by the designated engineer when requested |
| `spikes/SP-XX-name.md` | One experiment and its findings | Owned by the spike engineer |
| `slices/SL-<initial><n>-name.md` | Outcome, boundaries, evidence, and next action | Owned by the slice engineer |
| `CHECK.md` | Checks across integrated slices on `main` | Written by the engineer running the integrated check |

Codex discovers `AGENTS.md` along its instruction path. Other project documents
need to be read explicitly. Repo skills live in `.agents/skills/`; Codex first
sees their metadata and loads the full instructions when used. See the official
[AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
and [skills guide](https://learn.chatgpt.com/docs/build-skills).

After changing `AGENTS.md`, start a new session or explicitly tell a running
agent to reread it. If the skill does not appear, restart Codex; you can also
ask it to read the linked `SKILL.md` directly. No global configuration change,
additional service, or plugin installation is required for this repo workflow.

## Choose the workflow

| Task | Approach | Durable record |
|---|---|---|
| Small fix or documentation change with clear scope | Implement, check, hand over | Chat result; update an existing assigned document if useful |
| New feature with unresolved scope or interfaces | Plan with the engineer first | `SPEC.md` when requested |
| Consequential technical unknown | Run an agreed, bounded experiment | Spike file |
| Agreed increment spanning steps or sessions | Implement and verify one slice | Slice file |
| Integrated behavior before sharing | Check the app on `main` | `CHECK.md` |

### Agree on the target

Describe the idea and constraints. Agree on the goal, scope, observable
acceptance criteria, and shared interfaces. Use Codex's Plan mode if you want
investigation and a proposal before edits. The designated engineer asks Codex
to create or update `SPEC.md` using [templates/SPEC.md](templates/SPEC.md).
An in-chat plan helps execution; the spec records agreed decisions.
Changes to agreed scope or shared interfaces need team agreement before the
designated engineer updates the spec.

Give acceptance criteria stable `AC-XX` IDs and a practical verification
method. Identify consequential unknowns for optional spikes with `SP-XX` IDs,
owners, and checkpoints. Keep proposals and open questions distinct from
decisions. Commit the agreed spec when the engineer requests it.

### Investigate an unknown

Agree on the question, smallest experiment, owner, and timebox/checkpoint.
Use [templates/SPIKE.md](templates/SPIKE.md). Separate observations from
conclusions and keep evidence reproducible. An inconclusive result is useful;
the engineer controls the checkpoint. Propose scope or interface changes for
agreement before adopting them. Rebuild useful experimental code in a slice.

### Implement one slice

Agree on a small outcome that can run on `main`, acceptance references, file
ownership, and branch. The owner chooses a stable `SL-<initial><n>` ID, such as
`SL-Y1`, and uses [templates/SLICE.md](templates/SLICE.md) when a slice record
helps coordination or resumption.

Codex reads the relevant context, implements within those boundaries, runs
checks, and fixes task-related failures. Keep any execution plan in the slice
short. Update it when the approach changes; do not duplicate it into a second
plan document. Missing shared decisions should be raised while independent
work continues.

Use `Ready for acceptance` only when the relevant checks pass and the branch
is current with `main`. Keep limitations visible. The engineer marks the slice
`Done` or asks Codex to do so after acceptance.

### Verify, review, and resume

Tie check evidence to the relevant `AC-XX` or requested behavior. Record the
command or manual steps, observed result, environment, and exact tested state.
Use the slice's Check section for slice verification and
[templates/CHECK.md](templates/CHECK.md) for integrated checks on `main`.
A build alone does not verify a user interaction; exercise it when relevant.

Before accepting a change, inspect the diff and evidence. A separate review
request can help find regressions, but does not replace running checks.

For a later session, point Codex at the slice. Its Resume section should hold
only the current state, next action, and pending decisions. Codex verifies the
actual branch and files before continuing, since notes may be stale. When a
shared decision changes, update its source and tell affected agents to reread
it. Keep records at decisions and handovers, not as activity logs.

## Git and integration

The shared repository is on GitHub; `main` is the integration branch.

- Keep `main` runnable. Never force-push or rewrite shared history.
- Work on the engineer's chosen branch. Prefer short-lived `codex/<task>`
  branches unless the engineer names another. If none is assigned, inspect
  first and establish a branch before substantial implementation.
- Pull requests are the usual route into `main`. No independent review is
  required by this workflow; the engineer decides acceptance and integration.
  Codex pushes branches or opens/merges pull requests only when asked.
- Small, safe changes may go directly to `main` when the engineer authorizes
  the commit. Naming commits after the slice or spike can help traceability.
- Before reporting readiness, fetch `origin/main` and check whether it is
  already included in the task branch. If behind, merge it into the assigned
  branch when that can preserve existing work, then rerun relevant checks.
  Do not silently stash, reset, or overwrite uncommitted changes to do this.
  Resolve conflicts within your assignment; ask about conflicting shared
  decisions or another contributor's work. If updating is blocked, report the
  tested base and limitation instead of claiming integration readiness.
- Do not merge spike code as-is. Tell the team about agreed shared-interface
  changes before merging their implementation.
- Start with one coding agent. When parallel work is requested, give each
  coding agent a separate worktree or clone, a bounded task, and explicit file
  ownership. Verify the combined result after integration.

## Prompts

Use `$team-workflow` for the structured stages. Ordinary questions and small
fixes can use plain prompts.

- **Plan:** "$team-workflow Help agree on [idea and constraints]. Propose
  scope, acceptance criteria, interfaces, and unknowns. Do not edit files yet."
- **Record decisions:** "$team-workflow Create SPEC.md from the decisions
  we just agreed on. Keep unresolved questions explicit."
- **Spike:** "$team-workflow Run SP-XX: [question] on [branch]. Timebox:
  [limit]; checkpoint: [how we'll stop]. Record the experiment and evidence."
- **Propose a slice:** "$team-workflow Propose my next slice for AC-XX.
  Wait for agreement before creating files or implementing."
- **Implement:** "$team-workflow Implement slices/SL-Y1-name.md on
  codex/SL-Y1-name, verify it, and update its record."
- **Resume:** "$team-workflow Resume slices/SL-Y1-name.md. Verify its
  recorded state against the checkout, then continue the agreed work."
- **Review:** "Review the current diff for regressions and missing acceptance
  coverage. Report actionable findings with file references. Do not edit."
- **Check integration:** "$team-workflow Check AC-XX and AC-YY on main and
  record the observed results in CHECK.md."

## Project setup and commands

No application stack has been selected, so there are no install, run, build,
or test commands yet. Add commands verified against the repository when the
stack is agreed. Do not infer commands from an example or install dependencies
just to complete a workflow stage.

For workflow-only edits, inspect the Markdown, check local links and skill
metadata, and run `git diff --check`. Skill format validation and document
review do not prove that Codex will follow every instruction in practice.
