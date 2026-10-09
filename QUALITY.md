# Quality and acceptance

Owners accept this MVP by playing it and reading evidence. AI writes and
reviews implementation; repeatable checks establish what works. No single
test score or AI review guarantees a correct application.

## Current state and priorities

The review found ten workflow/product-description files, no application,
executable tests, or CI at baseline `86db322`. The README described the spec
as absent, and the working agreement treated its existence as approval despite
draft criteria. This setup change addresses those gaps. The 5–6-hour budget
still applies; open rules and technology choices in [SPEC.md](SPEC.md) remain
unapproved.

| Priority | Next action | Success evidence |
|---|---|---|
| Before implementation | Owners resolve rules needed for the next slice using concrete examples; choose stack and hosting. The designated writer records decisions in the spec. | Unambiguous expected results and file ownership for the next slice. |
| First application slice | Prove four connected players on Cloudflare; add reproducible install/build/test commands and application CI. | Four isolated clients share state; fresh-checkout checks pass; hosted rehearsal and free-plan evidence are recorded. |
| Each usable slice | Implement, run relevant checks, inspect the diff, fix failures, then show owner evidence. | AC-linked results and a short demo; missing verification stays visible. |
| Last hour | Freeze features and rehearse the full hosted game on the presentation networks. | Evidence for the deployed revision, known gaps, and recovery/cleanup steps. |

Keep one coding agent by default. A fresh, read-only AI review is useful at
integration when requested; delegation still requires authorization. Give a
reviewer agreed requirements, the diff, and raw artifacts. A builder's summary
is not independent evidence. Avoid building an agent orchestration platform
during this hackathon. Owners decide tradeoffs and acceptance.

## Checks that run now

`python3 scripts/verify.py setup` checks local Markdown file links, acceptance
ID integrity, verification configuration, whitespace in tracked changes, and
regression tests for the tools. It uses Python's standard library and Git.
It verifies setup only, not application quality. Link checks cover inline local
file targets, not URL availability or heading anchors.
CI compares whitespace against the PR base or previous pushed revision. Locally,
use `--base origin/main` after fetching to include committed branch changes;
the default `HEAD` checks tracked working-tree changes.

`python3 scripts/verify.py product` runs automated application checks. Until
the stack and suites exist, it reports **Blocked** and exits 2. The four slots
in [verification/commands.json](verification/commands.json) are deliberately
empty. Fill them with verified commands in the first application slice, never
echo commands or passing placeholders. Each is an argument array run from the
repository root. Commands must exit nonzero for failures or missing tests and
must terminate; test runners manage any server setup/teardown.

Both modes replace their latest report under `.artifacts/verification/`:
`report.md` for owners, `report.json` for automation, and command logs. Reports
identify the commit, dirty state, source fingerprint, environment, and results.
Preserve acceptance evidence before rerunning; CI artifacts retain each run
separately. Do not print credentials or private player data into test logs.
Evidence for an older revision does not certify a later change. A product pass
means automated checks passed, not owner acceptance or verified hosted behavior.

## Application verification contract

These slots describe checks, not a chosen stack or game architecture. The first
application slice installs approved tools and creates the applicable suites;
later slices extend them. Incomplete AC coverage stays visible even while the
existing suite passes.

| Slot | Evidence as the corresponding behavior is implemented |
|---|---|
| `build` | Reproducible dependency install with a committed lockfile; formatting, lint, applicable type checks, and a production build. Document stack-specific exceptions. |
| `rules` | Deterministic scoring and transition examples: boundaries, combinations, frozen-card duplicates, prediction outcomes, both end modes, and roulette as rules are approved. |
| `realtime` | Real server/room integration: consistent state, invalid/repeated/stale actions, room isolation, and agreed reconnect behavior. Effects happen once; rejected actions leave state unchanged. |
| `browser` | User-visible journeys with four separate identities, a complete round/game, shared settings/results, and relevant error/disconnect paths against the real server. Retain failure traces or screenshots. |

Use named scenarios with expected values approved before implementation. Resolve
scoring order and ties with exact examples. Expected scores must not be computed
by the production scoring function. Inject deterministic draws/randomness in
tests; test controls must be unavailable in public deployments. For meaningful
regression tests, confirm they detect the original bug or a controlled incorrect
behavior. Invariant checks should cover convergence and repeated actions as
well as example scores.

Set time limits from agreed user expectations; AC-03's update-time target is
still open. Avoid arbitrary sleeps, blanket coverage targets, and snapshot-only
proof of correctness. A failed test that passes on retry is a flaky result to
investigate, not a clean pass. Never silently skip or weaken required checks.

Playwright is a recommended browser-test option, pending stack approval. Use
four isolated contexts for four identities, not four tabs sharing a session.
This does not prove access from the actual presentation devices/networks, so
retain the hosted rehearsal.

### Traceability and remaining manual checks

Keep requirements in the spec, examples/tests with implementation, and observed
evidence in slice records or `CHECK.md`. Reference IDs instead of duplicating
rules. These mappings do not approve the current draft criteria.

| Criteria | Automated evidence | Owner/hosted evidence |
|---|---|---|
| AC-01, AC-03 | Four-client synchronization, invalid/repeated actions, agreed reconnect behavior. | Four participants using the presentation network paths. |
| AC-02 | All four `n` settings and both modes; shared settings and deck boundaries. | Creator can understand and select the options. |
| AC-04, AC-07, AC-08 | Controlled draws and independent scores for approved rule combinations. | Visible explanations match agreed rules. |
| AC-05 | Threshold/seven-card boundaries, timing, and ties once defined. | All players see the same result. |
| AC-06 | Hosted smoke check when an authorized deployment exists. | Exact Cloudflare products, zero-cost safeguards, full session, and cleanup. |

For changed UI, inspect desktop and phone-sized layouts, keyboard operation,
readable labels, and loading/error/reconnect states. Record relevant console or
server errors. A brief owner walkthrough checks whether the game is playable
and understandable; source-code review is not required of the owner.

## CI and integration

[The workflow](.github/workflows/verify.yml) runs setup checks on PRs and pushes
to `main`, and can be started manually. It publishes summaries and evidence
even after verification fails. It uses read-only repository permissions, a
bounded runtime, and no deployment or AI API secrets. The check is named
**Repository setup** so its scope is explicit.

Application checks can be requested with the workflow's `product` input. The
first application slice must add the stack's install steps and run product
verification automatically on every PR and `main`. The manual product job is
not an enforced application gate today. Do not treat cancelled, missing, or
skipped required jobs as passing application evidence.

Before relying on enforcement, a repository admin must confirm plan availability
and configure required PRs/checks on `main`, prevent direct agent pushes/bypasses,
and require current results. Require `Repository setup` now and `Automated
product checks` when it runs automatically. YAML alone does not enable branch
protection. These external settings have not been inspected or changed. Check
Actions minutes/storage availability before publishing under the zero-cost
constraint; this setup does not enable a paid AI review service.

Changes to `.github/`, verification tools, expectations, and the spec need
explicit attention in the acceptance report: they can change what green means.
Use repository permissions/required review for this boundary. Instructions in
the same editable branch cannot provide tamper-proof enforcement. An AI
reviewer, if enabled later, must not approve its own changes or hold deployment
credentials. AI review supplements deterministic checks.

## Owner acceptance packet

Provide what is usable; demo/preview and tested revision; AC-by-AC results;
report/trace links; relevant rule/test changes; known gaps; and a 2–5 minute
walkthrough. Use observed behavior, for example: “All four players saw one
score update after the same action was submitted twice.”

`Ready for acceptance` requires relevant slice checks and current `main`.
`Done` requires owner acceptance. Whole-MVP success additionally requires all
agreed ACs, the hosted four-player rehearsal, and zero-cost verification. Use
the [slice](templates/SLICE.md) and [check](templates/CHECK.md) templates;
do not add a separate status dashboard to maintain.

## Sources

- [OpenAI: custom code review rules](https://developers.openai.com/blog/custom-code-review-rules-for-codex) supports scoped repository rules alongside tests and branch protection.
- [Playwright: isolation](https://playwright.dev/docs/browser-contexts) describes separate identities in multi-user scenarios.
- [Playwright: best practices](https://playwright.dev/docs/best-practices) recommends testing visible behavior with isolated tests.
- [GitHub: required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) explains current-commit checks and misleading success from skipped jobs.
