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

| Script                     | Purpose                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`              | Development server with hot reload.                                            |
| `npm run build`            | Type-check, build the client to `dist/client` and the server to `dist/server`. |
| `npm start`                | Run the production build with plain Node.js.                                   |
| `npm run typecheck`        | Type-check client and Node projects (`tsc -b`).                                |
| `npm test`                 | Run all Vitest projects.                                                       |
| `npm run test:unit`        | Engine and scoring tests (Node).                                               |
| `npm run test:client`      | Client tests (jsdom, Testing Library).                                         |
| `npm run test:integration` | Real HTTP + WebSocket server tests, including restart persistence.             |
| `npm run check`            | Type-check and run all tests.                                                  |
| `npm run format`           | Format the repository with Prettier (`npm run format:check` to verify).        |

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
public/              Static files copied verbatim into the client build
docs/                Architecture, deployment, rules, technical plan
```

## TypeScript projects

`tsconfig.json` references two projects so that browser and Node code cannot mix by accident:

- `tsconfig.client.json`: DOM types, JSX; `src/client`, `src/shared`, `tests/client`.
- `tsconfig.node.json`: Node types, no DOM; `src/server`, `src/shared`, `tests/unit`, `tests/integration`, root config files.

`src/shared` is checked by both, so it must use neither DOM nor Node APIs.

## Dependencies

`dependencies` contains only what the built server needs at runtime (Express, `ws`, Zod); the Docker runtime image installs only these. Everything bundled into the client (React, icons, fonts) and all tooling are `devDependencies`.

## Conventions

- Rules changes update the engine, its tests, [rules.md](rules.md), and the in-game rulebook together.
- Every bug fix ships with a regression test at the lowest level that reproduces it.
- Run `npm run check` and `npm run format:check` before pushing.
