# Development

## Setup

Requires Node.js 24 (`nvm use` reads `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. `npm run dev` runs `src/server/dev.ts` with `tsx watch`: the Express/WebSocket server restarts on server changes, and Vite (in middleware mode on the same port) hot-reloads the client.

To test with several players locally, use separate browser profiles or private windows, or distinct `*.localhost` origins (for example `alice.localhost:3000`, `bob.localhost:3000`); each origin gets its own session cookie.

## Scripts

| Script                     | Purpose                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`              | Development server with hot reload.                                                            |
| `npm run build`            | Type-check, build the client to `dist/client` and the server to `dist/server`.                 |
| `npm start`                | Run the production build with plain Node.js.                                                   |
| `npm run typecheck`        | Type-check client, Node, and e2e projects (`tsc -b`).                                          |
| `npm run lint`             | Lint with ESLint (fails on errors or on more warnings than the current ceiling).               |
| `npm test`                 | Run all Vitest projects.                                                                       |
| `npm run test:unit`        | Engine and scoring tests (Node).                                                               |
| `npm run test:client`      | Client tests (jsdom, Testing Library).                                                         |
| `npm run test:integration` | Real HTTP + WebSocket server tests, including restart persistence.                             |
| `npm run test:coverage`    | All Vitest projects with coverage thresholds; HTML report in `coverage/`.                      |
| `npm run test:e2e`         | Build, then run Playwright end-to-end tests in Chromium, Firefox, WebKit, and mobile profiles. |
| `npm run test:load`        | k6 load test against a running server (see [deployment.md](deployment.md#load-testing)).       |
| `npm run check`            | Type-check, lint, and run all Vitest tests.                                                    |
| `npm run format`           | Format the repository with Prettier (`npm run format:check` to verify).                        |

## Project layout

```text
src/
  client/            React app (entry: main.tsx, loaded by index.html)
    components/      Table, hands, cards, roulette, dialogs, rules
    styles/          Base styles, themes, card designs, motion
  server/            Express + WebSocket server and persistence
    dev.ts           Development entry (Vite middleware)
    index.ts         Production entry (serves dist/client)
  shared/            Rule engine, scoring, and types used everywhere
tests/
  unit/              Fast tests without I/O
  client/            Client tests in jsdom
  integration/       Real server on a random port with a temporary data directory
  e2e/               Playwright specs and the e2e server entry (server.ts)
  load/              k6 load test (tables.js)
  support/           Shared test helpers (seeded random generator)
public/              Static files copied verbatim into the client build
docs/                Architecture, deployment, rules, technical plan
.github/             CI workflow and Dependabot configuration
```

## Testing

| Level       | Location            | Tooling                          | What belongs here                                                              |
| ----------- | ------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Unit        | `tests/unit`        | Vitest (Node)                    | Rule engine, scoring, pure helpers. Fast, no I/O.                              |
| Client      | `tests/client`      | Vitest + jsdom + Testing Library | Components and browser helpers: rendering, roles, and interactions.            |
| Integration | `tests/integration` | Vitest + real `http`/`ws`        | Server API, WebSocket protocol, auth, persistence, and restart behavior.       |
| End-to-end  | `tests/e2e`         | Playwright + axe-core            | Critical player journeys in real browsers against the production client build. |

Write each test at the lowest level that can catch the problem. End-to-end tests cover only critical journeys (practice game, multiplayer invite and round, reconnect, accounts, themes, full screen, mobile layout, accessibility).

Determinism: `createApplication({ random })` accepts a seeded generator (`tests/support/random.ts`). The e2e server (`tests/e2e/server.ts`) uses it with a fixed seed (`E2E_SEED`, default 7), fast bots, and a temporary data directory. Wait for visible state, never for fixed delays.

Run the e2e suite locally:

```sh
npx playwright install chromium firefox webkit   # once
npm run test:e2e                                 # build + all browsers
npx playwright test --project chromium --ui      # interactive debugging
```

Coverage thresholds live in `vite.config.ts` (`test.coverage.thresholds`). Raise them when coverage improves; never lower them to make a change pass.

## Linting

ESLint (`eslint.config.js`) runs `@eslint/js` and `typescript-eslint` recommended rules everywhere, React hooks (including the React Compiler rules) and jsx-a11y (`eslint-plugin-jsx-a11y-x`, a maintained fork that supports ESLint 10) for client code, the Vitest plugin for unit/client/integration tests, and the Playwright plugin for e2e tests. Existing React-hooks and accessibility findings are warnings for now; `npm run lint` fails if their number grows. Lower `--max-warnings` in `package.json` whenever you fix some.

TypeScript stays on 6.0 because `typescript-eslint` needs the TypeScript JavaScript API, which TypeScript 7 no longer ships. Upgrade once `typescript-eslint` supports TypeScript 7.

The e2e accessibility spec fails on any serious or critical axe finding except the known ones listed in `tests/e2e/accessibility.spec.ts` (tracked as M-08 in the technical plan).

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main` (skipped when only Markdown or `docs/` change), weekly on Monday, and on demand. Three jobs, using the Node version from `.nvmrc`:

1. **Verify**: one `npm ci`, then `format:check`, `lint`, `typecheck`, all Vitest projects with coverage thresholds, the production build, and `npm audit` for high or critical advisories in production dependencies. Uploads the coverage report and the build.
2. **End-to-end**: Playwright against the built app. Pull requests run Chromium and the mobile Chrome profile; `main`, the weekly run, and manual runs cover all browsers. Browsers are cached per Playwright version; report and traces are uploaded on failure.
3. **Docker**: builds the image with the GitHub Actions layer cache, starts it, and checks `/api/ready` and the client page.

A newer push to the same branch cancels the running workflow.

Dependabot (`.github/dependabot.yml`) opens grouped weekly updates for npm packages, GitHub Actions, and the Docker base image; each update runs the full pipeline. `.github/workflows/dependabot-auto-merge.yml` enables auto-merge (squash) on every Dependabot pull request, including major updates, so GitHub merges it once the required checks pass; a failing update stays open for a human. This needs these repository settings:

- General: "Allow auto-merge" and "Allow squash merging" enabled.
- Branch ruleset on `main`: require the status checks `Format, lint, types, tests, build`, `End-to-end (Playwright)`, and `Docker image smoke test`; require linear history; no required reviews. Leave "require branches to be up to date" off, otherwise the remaining weekly updates stall after the first one merges.

Merges made by the workflow token do not trigger the push-to-`main` run, so Firefox and WebKit run against auto-merged updates only in the weekly scheduled run. Existing Dependabot pull requests pick up the workflow after `@dependabot rebase`.

## TypeScript projects

`tsconfig.json` references three projects so that browser and Node code cannot mix by accident:

- `tsconfig.client.json`: DOM types, JSX; `src/client`, `src/shared`, `tests/client`.
- `tsconfig.node.json`: Node types, no DOM; `src/server`, `src/shared`, `tests/unit`, `tests/integration`, `tests/support`, root config files.
- `tests/e2e/tsconfig.json`: Node and DOM types for Playwright specs.

`src/shared` is checked by both, so it must use neither DOM nor Node APIs.

## Dependencies

`dependencies` contains only what the built server needs at runtime (Express, `ws`, Zod); the Docker runtime image installs only these. Everything bundled into the client (React, icons, fonts) and all tooling are `devDependencies`.

## Conventions

- Rules changes update the engine, its tests, [rules.md](rules.md), and the in-game rulebook together.
- Every bug fix ships with a regression test at the lowest level that reproduces it.
- Run `npm run check` and `npm run format:check` before pushing; run `npm run test:e2e` for UI changes.
