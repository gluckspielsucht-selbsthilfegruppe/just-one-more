# Just One More — Team Workflow

## Method

- **Spec:** agree on goal, scope, and acceptance criteria, together.
- **Spike:** a timeboxed experiment on a consequential unknown. Optional.
- **Slice:** a small increment that runs on `main`, usually by one engineer.
- **Check:** verify a slice or the integrated app with evidence.

It is iterative, not a waterfall. Skip stages that do not help a task.

## Files

| File | Purpose | Written by |
|---|---|---|
| AGENTS.md | Instructions for coding agents | Team |
| README.md | Workflow, setup, and commands | Team |
| templates/ | Templates for the files below | Team, by agreement |
| SPEC.md | Goal, scope, acceptance criteria, shared interfaces, spikes | One engineer in the team session; later changes need team agreement |
| spikes/SP-XX-name.md | One experiment and its conclusion | Spike owner |
| slices/SL-<initial><n>-name.md | One slice and its check | Slice owner |
| CHECK.md | Integrated checks on `main` | Whoever runs the check |

Write short entries at decisions and handovers, not activity logs.

## Before starting

Check that your assistant loads AGENTS.md, then run:

> Read AGENTS.md and templates/. Summarize the working method, list the
> unmade project decisions, and say what you would read before implementing
> a slice. Do not edit files.

It should treat templates/ as templates, not requirements.

## Workflow

Together:

1. Describe the idea and the real constraints.
2. Agree on goal, scope, and acceptance criteria.
   One engineer writes SPEC.md; the others give input.
3. Agree on the shared interfaces individual work will rely on.
4. Identify the important spikes, each with an owner and a timebox.
5. Commit SPEC.md.

Individually:

6. Run spikes. Inconclusive is a valid result; spike code is not product code.
7. Create, implement, and check slices. A passing build is not proof.
8. Merge to `main` often.
9. Before sharing the result, check the integrated app on `main` and record it in CHECK.md.

Scope and shared interfaces are decided together; slice owners decide the rest.
Raise new consequential unknowns with the team.

When a shared decision changes, update the file, tell the team, and tell
running agents to reread it. Agents do not notice file changes on their own.

## Git and integration

The shared repository is hosted on GitHub. `main` is the integration branch.

Rules:

- Keep `main` runnable.
- Never force-push to or rewrite the history of `main`.
- Do not merge spike code into `main` as-is.
  Rebuild what is worth keeping in a slice.

Defaults (use judgement):

- Work on short-lived branches and integrate often.
- Pull requests are the usual way into `main`. No review is required;
  the author merges after updating from `main` and running the app
  or the relevant tests.
- Small, safe changes, such as SPEC.md from the team session or
  documentation fixes, may go directly to `main`.
- Name branches and commits however is clear.
  Mentioning the slice or spike ID helps.
- Tell the team about shared-interface changes before merging them.
- Give each concurrent coding agent its own worktree or clone.

## Prompts

AGENTS.md carries the rules, so prompts stay short. If your assistant does
not load AGENTS.md automatically, start each prompt with "Read AGENTS.md."

- **Spec:** "We are starting planning. I'll give the idea and constraints
  next. Help clarify goal, scope, acceptance criteria, shared interfaces,
  and spikes. Create SPEC.md only when I ask."
- **Spike:** "Help with spike SP-XX: [question]. Timebox: [limit].
  Propose the smallest experiment, then record it in spikes/."
- **Slice:** "Propose my next slice. After I agree, create its file in slices/."
- **Implement:** "Implement SL-XX from slices/. Update its status and
  return a handover."
- **Check:** "Check SL-XX against its acceptance criteria and fill in its
  Check section." Or: "Check the integrated app on `main` and record it
  in CHECK.md."

## Project setup and commands

No stack selected yet. Once chosen, add only verified install, run,
and test commands here.
