# SL-XX: [Name]

<!-- Create as slices/SL-<initial><n>-short-name.md, e.g. slices/SL-L1-scoring.md.
The owner chooses the ID with their own initial. Omit headings that do not add value. -->

Status: [Proposed / In progress / Blocked / Ready for acceptance / Done]
Owner: [Engineer]
Branch: [Engineer's chosen branch or assigned worktree branch]

<!-- Done requires engineer acceptance. Ready for acceptance requires passing
checks and a branch current with main. Keep failed or missing checks visible. -->

## Outcome

[What becomes usable or demonstrable on `main` when this slice works?]

## Acceptance references

[Relevant AC-XX items and slice-specific examples.]

| Approved example | Input / action | Expected visible result or exact value |
|---|---|---|
| [AC-XX, including a relevant failure case] | [Controlled setup and action] | [Owner-agreed result, independent of implementation] |

## Boundaries

[What is included and excluded. Assigned files or directories, shared interfaces
touched, and any dependency on another owner's work.]

## Notes

[Short execution plan if useful, dependencies, relevant SP-XX findings,
and agreed deviations. Keep current; omit for a straightforward task.]

## Check

Tested state: [Commit plus any uncommitted changes, environment]
Main included: [Latest fetched origin/main commit included, or update blocker]
Evidence: [Verification report/CI run and useful browser trace or screenshot]

| Criterion / behavior | Performed | Result and evidence |
|---|---|---|
| [AC-XX or agreed slice example] | [Exact command or manual/browser steps] | [Passed / Failed / Blocked / Not checked; observed result] |

Not checked: [Explicit gaps]
Changes to checks/expected results: [Reason and approval if expectations changed]

## Owner acceptance

Walkthrough: [Demo/preview and a short sequence the owner can play without reading code]
Decision: [Pending / Accepted by owner, with tested revision]

## Resume

Current state: [What is implemented or blocked; omit this section when Done]
Next action: [The next concrete step and relevant file]
Pending decisions: [Question and owner, or none]
