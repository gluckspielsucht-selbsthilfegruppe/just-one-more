# One-day MVP working agreement

- Optimize for one working demo of a core user journey by the end of the day.
  Read `README.md` and `MVP.md` when it exists; inspect the current Git state
  before editing. There is no product scope until the team supplies an idea.
- The team owns the target user, demo, and major trade-offs. When asked to
  build, use the stated target or infer a narrow one from a clear request,
  capture it in a short `MVP.md`, and proceed. Ask only about missing decisions
  that would change the demo or require an external commitment; choose routine
  implementation details yourself.
- Make the smallest end-to-end flow work first. Prefer a familiar, simple
  stack and avoid speculative architecture. Investigate a blocking unknown
  briefly, record the conclusion in `MVP.md`, and return to building.
- Run the app and exercise the demo path. Check important failure behavior
  where relevant. Use meaningful tests when they help; a passing build alone
  does not prove the demo works. Inspect actual results and fix task-related
  failures before reporting success.
- As the deadline approaches, propose cuts to protect the core demo. Reserve
  the final hour for verification and rehearsal. Update `MVP.md` when the team
  changes scope; keep it to decisions, current state, and known gaps.
- Put verified install, run, test, and demo commands in `README.md` once a
  stack exists. Do not invent commands or claim checks you did not run.
- For parallel contributors, use separate branches or worktrees and clear
  file ownership. Do not overwrite another contributor's work. Keep `main`
  runnable and never rewrite shared history. Commit to `main`, push, open or
  merge a pull request only when the engineer asks.
- Handover: what works, exact demo steps, checks and tested Git state, known
  gaps, and any decision needed. The engineer decides when the MVP is ready.
