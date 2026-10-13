# Deployment and operations

The app is one Node.js process serving HTTP and WebSockets on a single port. It can run directly with Node.js, in Docker, or in Docker with a public Cloudflare Quick Tunnel.

## Configuration

| Variable        | Default  | Purpose                                                               |
| --------------- | -------- | --------------------------------------------------------------------- |
| `PORT`          | `3000`   | HTTP and WebSocket port.                                              |
| `DATA_DIR`      | `./data` | Directory containing the atomic `game.json` snapshot.                 |
| `COOKIE_SECURE` | `false`  | Set to `true` when serving behind HTTPS. Keep `false` for local HTTP. |

Example: `PORT=8080 DATA_DIR=./demo-data npm start`.

## Run with Node.js

Requires Node.js 24 (see `.nvmrc`) and npm.

```sh
npm ci
npm run build
npm start
```

`npm start` runs the built server (`dist/server/index.js`) with `NODE_ENV=production`; it serves the client from `dist/client`. The production build bundles fonts, icons, and all assets locally; gameplay has no third-party service dependency. Ctrl+C stops the server.

## Run with Docker

Requires Docker with the Compose plugin. Node.js is not required on the host.

```sh
docker compose up --build -d
```

Open **http://localhost:3000**. For friends on your local network, use the **host computer's LAN IP**, such as `http://192.168.1.42:3000`; the network address printed inside the container belongs to Docker and is not the invitation address.

```sh
docker compose ps          # includes the HTTP health-check status
docker compose logs -f app
docker compose down        # stop and remove the container; keep saved data
```

To use another host port, run `PORT=8080 docker compose up --build -d` and open `http://localhost:8080`. The internal port remains 3000. Behind HTTPS, set `COOKIE_SECURE=true` when starting Compose.

The `Dockerfile` has two stages (build, runtime), so it also works on hosts that limit builds to two stages. The runtime image contains only the built `dist/` output and production dependencies, runs as the unprivileged `node` user, and checks `/api/health`. Source changes require rebuilding the image.

## Saved data and backups

Games, accounts, and sessions persist in the Compose-managed `game-data` volume mounted at `/app/data` (or in `DATA_DIR` when running with Node.js). Rebuilds and container replacement retain this data. **`docker compose down --volumes` deletes it.** Run **one server process per data directory**.

The snapshot contains rooms, accounts, hashed passwords, profile statistics, and hashed session tokens. Treat backups as private. To back up, stop the app before copying:

```sh
mkdir -p data
docker compose stop app
docker compose cp app:/app/data/game.json ./data/game-backup.json
docker compose start app
```

Restoring the file restores games and profiles.

## Play over the internet with a Quick Tunnel

Start the Cloudflare Quick Tunnel in the foreground with the Compose override. Compose also starts the app:

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml up --build tunnel
```

Wait for the `https://….trycloudflare.com` URL in the output. Open that URL yourself, create a table, and share its invitation link. Everyone, including the host, must use the same tunnel URL. Friends only need a browser; no shared Wi-Fi, port forwarding, Cloudflare account, domain, or token is required. Keep the terminal open and the computer awake while playing.

The tunnel waits for the app's health check and forwards HTTP and WebSockets to `app:3000`. The override enables `COOKIE_SECURE=true`, so plain HTTP LAN addresses cannot carry the session cookie while this mode is active.

Restarting the tunnel gives it a new hostname. Browser cookies belong to the old hostname, so guest identities and saved seats do not follow to a new URL; accounts can sign in again. Saved game data stays in the volume.

```sh
docker compose -f compose.yaml -f compose.tunnel.yaml stop tunnel   # stop public access only
docker compose -f compose.yaml -f compose.tunnel.yaml down          # stop both, keep data
```

To return to local HTTP play, run `down`, then `docker compose up -d` without the override.

### Cost and limits

Checked **2026-10-09**: Cloudflare describes Quick Tunnels as free and accountless. This setup supplies no card or billing account and creates no subscription or trial. See [Cloudflare's service description](https://blog.cloudflare.com/protected-quick-tunnels/).

Quick Tunnels allow **200 in-flight requests**; excess requests fail with **HTTP 429** rather than becoming paid overages. They have no uptime guarantee and change hostname on restart. WebSockets are supported. This suits small 2–8-player sessions; rehearse on the actual participant networks. See [Quick Tunnel limits](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) and [WebSocket behavior](https://developers.cloudflare.com/network/websockets/).

Anyone with the URL can access the server. A private table hides it from discovery but does not restrict access to the website. Stop the tunnel when the session is over.

If the URL does not load, check `docker compose -f compose.yaml -f compose.tunnel.yaml ps` and the tunnel logs. The host network must allow outbound connections to Cloudflare on port **7844** (UDP for QUIC or TCP for HTTP/2). See [tunnel firewall requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/).

## LAN troubleshooting

If a friend cannot connect on the local network, ensure both devices share a network, use the printed IP address rather than `localhost`, and check that the host firewall permits incoming connections on the chosen port. Guest Wi-Fi with client isolation may prevent LAN play. Each player needs a separate device, browser profile, or private window; tabs in the same profile share an identity.

## Choosing a paid or free hosting service

Before relying on any external service, verify and record in [architecture.md](architecture.md):

- Current free-tier or price conditions, and whether an account or credit card is required.
- Usage limits and whether they suffice; whether exceeding them stops the service or triggers charges.
- Whether a trial converts automatically to a paid plan, and any temporary card authorization holds.
- Steps required to prevent charges or cancel resources afterward.
- WebSocket support, idle timeouts, cold starts or sleeping, and persistent disk support for the data directory.

Do not rely on billing alerts alone to prevent costs, and do not enable paid plans or overages without explicit approval. See [technical-plan.md](technical-plan.md) for the permanent hosting plan.
