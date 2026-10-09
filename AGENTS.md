# Agent Working Agreement

## Context

templates/ contains unfilled templates, not requirements.
Planning starts only when an engineer asks.
Once SPEC.md exists, it is the agreed target.

Files are not loaded automatically. Before substantial work, read:
1. The relevant sections of SPEC.md.
2. Your slice file in slices/, if any.
3. Referenced files in spikes/ and relevant failures in CHECK.md.
4. README.md for setup and workflow.

Read only what is relevant. When told a shared decision changed, reread it.
If documents conflict, name the conflict and ask.

## Decisions

Engineers own scope, priorities, shared interfaces, and acceptance.

- Do not invent requirements or treat proposals as decisions.
- Do not expand scope or claim other work without agreement.
- Do not force certainty where a spike is needed.
- Ask about consequential ambiguity; decide routine, reversible details yourself.
- Ask before changing scope, shared interfaces, dependencies, architecture,
  or another contributor's work.

## Spike

- Stay within the agreed question and timebox. You cannot track time
  reliably; rely on the engineer's checkpoint.
- Record observations separately from conclusions.
  Inconclusive is a valid result.
- Spike code is not accepted implementation.
- If findings affect scope, propose a SPEC.md change.

## Slice

- Implement only the agreed slice. Prefer small outcomes that run on `main`.
- Avoid unrelated refactoring and speculative abstractions.

## Check

- Check against the referenced acceptance criteria.
- Run real checks and inspect the results. A passing build is not proof.
- State what failed, was blocked, or was not checked.
- Never claim actions you did not perform or trust another agent's
  success message as evidence.
- Note the tested commit or working-tree state. Do not paste large logs.
- The engineer decides when a slice is done.

## Documents

Create documents from templates/ only when the engineer needs one:

| Template | Create as | Owner |
|---|---|---|
| templates/SPEC.md | SPEC.md | Whole team |
| templates/SPIKE.md | spikes/SP-XX-short-name.md | Spike owner |
| templates/SLICE.md | slices/SL-<initial><n>-short-name.md | Slice owner |
| templates/CHECK.md | CHECK.md (integrated checks only) | Engineer running the check |

- Edit only files your engineer owns or assigns to you.
  Propose other changes in your handover.
- Edit SPEC.md only when the engineer writing it asks.
- Never overwrite, revert, or "clean up" another contributor's work.
- Do not edit templates/ unless asked.
- Keep entries short. Remove template comments and unused headings.
- Reference IDs instead of copying content.
- IDs: AC-XX in SPEC.md, SP-XX from the team session, SL-<initial><n>
  chosen by the slice owner (e.g. SL-L1). Never reassign IDs.

## Git

Follow "Git and integration" in README.md. In particular:
- Work on the branch your engineer chose. Commit to `main` only when told to.
- Never force-push or rewrite `main` or another contributor's branch.
- Do not merge spike code into `main` as-is.
- Before reporting work as ready, update from `main` and rerun the relevant checks.
- Push, open, or merge pull requests only when the engineer asks.

## Working style

- Debug by reproducing, forming a hypothesis, and testing it.
  Do not stack speculative fixes.
- Use only verified commands from README.md or the repository.
  Report tool and permission limits honestly.

## Handover

Report concisely:
1. What changed
2. Verification performed and results
3. Remaining uncertainty or limitations
4. Any decision required
5. Proposed document updates, if you were not authorized to edit them
