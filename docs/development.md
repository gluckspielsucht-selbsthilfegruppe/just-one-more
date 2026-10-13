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
| `npm run lint`             | Lint with oxlint (fails on errors or on more warnings than the current ceiling).               |
| `npm test`                 | Run all Vitest projects.                                                                       |
| `npm run test:unit`        | Engine and scoring tests (Node).                                                               |
| `npm run test:client`      | Client tests (jsdom, Testing Library).                                                         |
| `npm run test:integration` | Real HTTP + WebSocket server tests, including restart persistence.                             |
| `npm run test:coverage`    | All Vitest projects with coverage thresholds; HTML report in `coverage/`.                      |
| `npm run test:e2e`         | Build, then run Playwright end-to-end tests in Chromium, Firefox, WebKit, and mobile profiles. |
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

[oxlint](https://oxc.rs/docs/guide/usage/linter) runs with the TypeScript, React (including hooks), jsx-a11y, import, Vitest, and unicorn plugins (`.oxlintrc.json`). ESLint with `typescript-eslint` is not used because it does not yet support TypeScript 7. Existing React-hooks and accessibility findings are warnings for now; `npm run lint` fails if their number grows. Lower `--max-warnings` in `package.json` whenever you fix some.

The e2e accessibility spec fails on any serious or critical axe finding except the known ones listed in `tests/e2e/accessibility.spec.ts` (tracked as M-08 in the technical plan).

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request, on pushes to `main`, and nightly:

1. **Format, lint, types**: `format:check`, `lint`, `typecheck`.
2. **Tests**: all Vitest projects with coverage thresholds on Node 24 and 26; coverage report uploaded as an artifact.
3. **Build**: production client and server bundles.
4. **End-to-end**: Playwright against the built app in Chromium, Firefox, WebKit, and mobile profiles; report and traces uploaded on failure.
5. **Docker**: builds the image, starts it, and checks `/api/health` and the client page.
6. **Audit**: `npm audit` for high or critical advisories in production dependencies.

Dependabot (`.github/dependabot.yml`) opens grouped weekly updates for npm packages, GitHub Actions, and the Docker base image; each update runs the full pipeline. Protect `main` in the repository settings and require these checks before merging.

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
