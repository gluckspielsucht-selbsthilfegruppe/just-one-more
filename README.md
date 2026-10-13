# Just One More

A browser-based, real-time push-your-luck card game for 2–8 players. Draw another card, bank your points, or risk the whole round on roulette. Play with friends on your network or over the internet, or practice against bots.

## Quick start

**Docker** (requires Docker with Compose):

```sh
docker compose up --build -d
```

**Node.js** (requires Node.js 24 and npm):

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**, then choose **Create a table** to play with friends or **Play a practice game** to try it with bots. Friends on the same network use the LAN address printed by the server instead of `localhost`.

**Playing over the internet?** Start the app with a free Cloudflare Quick Tunnel and share the printed `https://….trycloudflare.com` URL:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml up --build tunnel
```

## Documentation

- [Features](docs/features.md)
- [Game rules](docs/rules.md)
- [Deployment and operations](docs/deployment.md): Docker, Quick Tunnel, configuration, backups
- [Development](docs/development.md): setup, scripts, tests, project layout
- [Architecture](docs/architecture.md)
- [Technical plan](docs/technical-plan.md): roadmap to permanent hosting
