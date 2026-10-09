import express, { type Request } from 'express';
import { createServer } from 'node:http';
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import {
  applyAction,
  botAction,
  COLORS,
  createRoom,
  DEFAULT_SETTINGS,
  isSoloBotRoom,
  log,
  makePlayer,
  startRound,
  toPublicRoom,
  triggerHackathon,
} from '../shared/engine';
import {
  CARD_DESIGNS,
  type GameAction,
  type Profile,
  type Room,
  type RoomSummary,
} from '../shared/types';
import { Store, type User } from './store';

const derive = promisify(scrypt);
const secureRandom = () => randomInt(0, 0x100000000) / 0x100000000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const cleanName = z
  .string()
  .trim()
  .min(2)
  .max(18)
  .regex(/^[\p{L}\p{N} _.'-]+$/u, 'Use letters, numbers, spaces, or a simple nickname.');
const settingsSchema = z.object({
  maxNumber: z.union([z.literal(12), z.literal(13), z.literal(14), z.literal(15)]),
  endMode: z.enum(['points', 'seven']),
  isPublic: z.boolean(),
  maxPlayers: z.number().int().min(2).max(8),
});
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('draw') }),
  z.object({ type: z.literal('bank'), roulette: z.boolean() }),
  z.object({ type: z.literal('guess'), value: z.number().int().min(0).max(15) }),
  z.object({ type: z.literal('target'), targetId: z.string().max(100) }),
]);
function publicProfile(user: User): Profile {
  const { password: _p, salt: _s, username: _u, ...profile } = user;
  return profile;
}
function cookieToken(req: { headers: { cookie?: string } }) {
  return req.headers.cookie
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('jom_session='))
    ?.slice(12);
}

export function createApplication(
  options: { dataFile?: string; botDelay?: number; disconnectDelay?: number } = {},
) {
  const store = new Store(options.dataFile);
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  const clients = new Map<WebSocket, { userId: string; tokenHash: string; alive: boolean }>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const timerKeys = new Map<string, string>();
  const receipts = new Map<string, Set<string>>();
  const limits = new Map<string, { count: number; reset: number }>();
  let closing = false;
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    if (
      req.method !== 'GET' &&
      req.headers.origin &&
      new URL(req.headers.origin).host !== req.headers.host
    )
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    next();
  });
  function allow(key: string, max: number, duration = 60000) {
    const current = limits.get(key);
    if (!current || current.reset <= Date.now()) {
      limits.set(key, { count: 1, reset: Date.now() + duration });
      return true;
    }
    return ++current.count <= max;
  }
  function userFor(req: { headers: { cookie?: string } }): User | undefined {
    const token = cookieToken(req);
    const session = token && store.data.sessions[hash(token)];
    return session && session.expires > Date.now() ? store.data.users[session.userId] : undefined;
  }
  function roomFor(id: string) {
    return Object.values(store.data.rooms).find(
      (r) => r.players.some((p) => p.id === id) && !r.departedIds.includes(id),
    );
  }
  function summary(): RoomSummary[] {
    return Object.values(store.data.rooms)
      .filter((r) => r.settings.isPublic && r.phase !== 'finished')
      .map((r) => ({
        code: r.code,
        name: r.name,
        hostName: r.players.find((p) => p.id === r.hostId)?.name ?? 'Friends',
        players: r.players.length,
        maxPlayers: r.settings.maxPlayers,
        phase: r.phase,
        settings: r.settings,
        round: r.round,
      }));
  }
  function send(ws: WebSocket, value: unknown) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value));
  }
  function broadcast() {
    const rooms = summary();
    for (const [ws, client] of clients) {
      const user = store.data.users[client.userId];
      const room = roomFor(client.userId);
      send(ws, {
        type: 'state',
        profile: publicProfile(user),
        rooms,
        room: room ? toPublicRoom(room) : null,
      });
    }
  }
  function connected(id: string) {
    return [...clients.values()].some((c) => c.userId === id);
  }
  function commit(room?: Room) {
    if (room) {
      room.version++;
      room.updatedAt = Date.now();
      store.recordResults(room);
    }
    store.save();
    broadcast();
    if (room) schedule(room);
  }
  function schedule(room: Room) {
    const key = `${room.gameId}:${room.round}:${room.phase}:${room.prompt?.kind ?? 'turn'}:${room.prompt?.actorId ?? room.turnId}`;
    const waitingActor = room.players.find((p) => p.id === (room.prompt?.actorId ?? room.turnId));
    if (
      room.players.some((p) => !p.bot && p.connected) &&
      timers.has(room.code) &&
      timerKeys.get(room.code) === key &&
      (!waitingActor?.connected || waitingActor.bot)
    )
      return;
    const old = timers.get(room.code);
    if (old) clearTimeout(old);
    timers.delete(room.code);
    timerKeys.set(room.code, key);
    if (closing) return;
    const humans = room.players.filter((p) => !p.bot && p.connected);
    if (!humans.length) return;
    if (room.phase === 'round-end' && room.players.find((p) => p.id === room.hostId)?.bot) {
      timers.set(
        room.code,
        setTimeout(() => {
          timers.delete(room.code);
          startRound(room, secureRandom);
          commit(room);
        }, 2500),
      );
      return;
    }
    if (room.phase !== 'playing') return;
    const actorId = room.prompt?.actorId ?? room.turnId;
    const actor = room.players.find((p) => p.id === actorId);
    if (!actor || (!actor.bot && actor.connected)) return;
    timers.set(
      room.code,
      setTimeout(
        () => {
          timers.delete(room.code);
          try {
            const latest = store.data.rooms[room.code];
            const action: GameAction =
              !actor.bot && (!latest.prompt || latest.prompt.kind === 'bank')
                ? { type: 'bank', roulette: false }
                : botAction(latest, actor.id, secureRandom);
            if (!actor.bot)
              log(
                latest,
                `${actor.name} is disconnected. An automatic choice keeps the table moving.`,
              );
            const next = applyAction(latest, actor.id, action, secureRandom);
            store.data.rooms[room.code] = next;
            commit(next);
          } catch (error) {
            console.error('Automatic action failed:', error);
          }
        },
        actor.bot ? (options.botDelay ?? 1100) : (options.disconnectDelay ?? 30000),
      ),
    );
  }
  function setSession(res: express.Response, userId: string) {
    const token = randomBytes(32).toString('hex');
    store.data.sessions[hash(token)] = { userId, expires: Date.now() + 30 * 86400000 };
    res.cookie('jom_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 30 * 86400000,
      path: '/',
    });
  }
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/bootstrap', (req, res) => {
    const user = userFor(req);
    const room = user && roomFor(user.id);
    res.json({
      profile: user ? publicProfile(user) : null,
      rooms: summary(),
      room: room ? toPublicRoom(room) : null,
    });
  });
  app.post('/api/session', (req, res) => {
    const existing = userFor(req);
    if (existing) return res.json({ profile: publicProfile(existing) });
    if (!allow(`guest:${req.socket.remoteAddress}`, 60))
      return res.status(429).json({ error: 'Too many profiles. Try again in a minute.' });
    const name = cleanName.safeParse(req.body.name);
    if (!name.success)
      return res.status(400).json({ error: 'Choose a nickname with 2–18 letters or numbers.' });
    const user: User = {
      id: randomUUID(),
      name: name.data,
      color: COLORS[randomInt(COLORS.length)],
      theme: 'classic',
      appearance: 'neon',
      account: false,
      stats: { games: 0, wins: 0, bestScore: 0, rounds: 0, bestRound: 0 },
    };
    store.data.users[user.id] = user;
    setSession(res, user.id);
    store.save();
    res.json({ profile: publicProfile(user) });
  });
  app.post('/api/profile', (req, res) => {
    const user = userFor(req);
    if (!user) return res.status(401).json({ error: 'Choose a nickname first.' });
    const parsed = z
      .object({
        name: cleanName,
        color: z.enum(COLORS as [string, ...string[]]),
        theme: z.enum(CARD_DESIGNS),
        appearance: z.enum(['neon', 'velvet', 'pop']).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Check your nickname and appearance settings.' });
    Object.assign(user, parsed.data);
    const room = roomFor(user.id);
    const player = room?.players.find((p) => p.id === user.id);
    if (player) {
      player.name = user.name;
      player.color = user.color;
    }
    commit(room);
    res.json({ profile: publicProfile(user) });
  });
  app.post('/api/auth/:mode', async (req, res) => {
    try {
      if (!allow(`auth:${req.socket.remoteAddress}`, 10))
        return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
      const parsed = z
        .object({
          username: z
            .string()
            .trim()
            .min(3)
            .max(24)
            .regex(/^[a-zA-Z0-9_-]+$/),
          password: z.string().min(8).max(128),
        })
        .safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({
          error: 'Use a 3–24 character username and a password of at least 8 characters.',
        });
      const username = parsed.data.username.toLowerCase();
      const existing = Object.values(store.data.users).find((u) => u.username === username);
      const current = userFor(req);
      if (current && roomFor(current.id))
        return res.status(409).json({ error: 'Leave your table before changing accounts.' });
      let user: User;
      if (req.params.mode === 'register') {
        if (!current) return res.status(401).json({ error: 'Choose a nickname first.' });
        if (current.account) return res.status(409).json({ error: 'You are already signed in.' });
        if (existing) return res.status(409).json({ error: 'That username is already taken.' });
        const salt = randomBytes(16).toString('hex');
        const password = ((await derive(parsed.data.password, salt, 64)) as Buffer).toString('hex');
        if (Object.values(store.data.users).some((u) => u.username === username))
          return res.status(409).json({ error: 'That username is already taken.' });
        user = current;
        Object.assign(user, { account: true, username, salt, password });
      } else if (req.params.mode === 'login') {
        const result = (await derive(
          parsed.data.password,
          existing?.salt ?? 'invalid-user-salt',
          64,
        )) as Buffer;
        if (!existing?.password || !timingSafeEqual(result, Buffer.from(existing.password, 'hex')))
          return res.status(401).json({ error: 'That username and password do not match.' });
        user = existing;
      } else return res.status(404).json({ error: 'Unknown account action.' });
      const previous = cookieToken(req);
      if (previous) {
        delete store.data.sessions[hash(previous)];
        for (const [ws, c] of clients)
          if (c.tokenHash === hash(previous)) ws.close(4001, 'Session changed');
      }
      setSession(res, user.id);
      store.save();
      res.json({ profile: publicProfile(user) });
    } catch (error) {
      console.error('Account operation failed:', error);
      res.status(500).json({ error: 'Could not update your account. Please try again.' });
    }
  });
  app.post('/api/logout', (req, res) => {
    const user = userFor(req);
    if (user && roomFor(user.id))
      return res.status(409).json({ error: 'Leave your table before signing out.' });
    const token = cookieToken(req);
    if (token) {
      delete store.data.sessions[hash(token)];
      for (const [ws, c] of clients) if (c.tokenHash === hash(token)) ws.close(4001, 'Signed out');
    }
    res.clearCookie('jom_session', { path: '/' });
    store.save();
    res.json({ ok: true });
  });
  function requireHost(room: Room, id: string) {
    if (room.hostId !== id) throw new Error('Only the host can do that.');
  }
  function handle(user: User, type: string, payload: Record<string, unknown>, version?: number) {
    let room = roomFor(user.id);
    if (type === 'create') {
      if (room) throw new Error('Leave your current table before creating another.');
      if (Object.keys(store.data.rooms).length >= 100)
        throw new Error('The server is full. Please try again later.');
      const settings = settingsSchema.parse(payload.settings ?? DEFAULT_SETTINGS);
      const name = z.string().trim().min(2).max(40).parse(payload.name);
      let code: string;
      do {
        code = Array.from(
          { length: 5 },
          () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(31)],
        ).join('');
      } while (store.data.rooms[code]);
      room = createRoom(code, name, makePlayer(user.id, user.name, user.color), settings);
      store.data.rooms[code] = room;
      log(room, `${user.name} opened the table.`);
      commit(room);
      return;
    }
    if (type === 'join') {
      const code = z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z2-9]{5}$/)
        .parse(payload.code);
      const target = store.data.rooms[code];
      if (!target) throw new Error('No table with that code. Check it and try again.');
      if (room && room.code !== code)
        throw new Error('Leave your current table before joining another.');
      if (target.players.some((p) => p.id === user.id)) {
        target.departedIds = target.departedIds.filter((id) => id !== user.id);
        target.players.find((p) => p.id === user.id)!.connected = true;
        const host = target.players.find((p) => p.id === target.hostId);
        if (!host || host.bot || !host.connected) target.hostId = user.id;
        commit(target);
        return;
      }
      if (target.phase !== 'lobby')
        throw new Error('That game has already started. Join a waiting table.');
      if (target.players.length >= target.settings.maxPlayers)
        throw new Error('That table is full.');
      target.players.push(makePlayer(user.id, user.name, user.color));
      log(target, `${user.name} joined the table.`);
      commit(target);
      return;
    }
    if (!room) throw new Error('Join a table first.');
    const p = room.players.find((p) => p.id === user.id)!;
    if (type === 'leave') {
      if (room.phase === 'playing' || room.phase === 'round-end') {
        room.departedIds.push(user.id);
        p.connected = false;
        log(room, `${user.name} left. Their remaining choices will be automatic.`);
      } else room.players = room.players.filter((p) => p.id !== user.id);
      if (room.hostId === user.id)
        room.hostId =
          room.players.find((p) => !p.bot && p.connected && p.id !== user.id)?.id ??
          room.players.find((p) => p.bot)?.id ??
          room.players[0]?.id ??
          '';
      if (!room.players.some((p) => !p.bot && !room!.departedIds.includes(p.id))) {
        const timer = timers.get(room.code);
        if (timer) clearTimeout(timer);
        delete store.data.rooms[room.code];
      }
      commit(room);
      return;
    }
    if (type === 'chat') {
      const message = z.string().trim().min(1).max(140).parse(payload.message);
      log(room, `${user.name}: ${message}`);
      commit(room);
      return;
    }
    if (type === 'ready') {
      if (room.phase !== 'lobby') throw new Error('The game has already started.');
      p.ready = !p.ready;
    } else if (type === 'settings') {
      requireHost(room, user.id);
      if (room.phase !== 'lobby') throw new Error('Settings are locked during a game.');
      const settings = settingsSchema.parse(payload.settings);
      if (settings.maxPlayers < room.players.length)
        throw new Error('There are already more players at the table.');
      room.settings = settings;
      for (const p of room.players) if (!p.bot) p.ready = false;
    } else if (type === 'add-bot') {
      requireHost(room, user.id);
      if (room.phase !== 'lobby') throw new Error('Add bots before starting.');
      if (room.players.length >= room.settings.maxPlayers) throw new Error('The table is full.');
      const names = ['Cleo', 'Felix', 'Milo', 'Nova', 'Olive', 'Pip', 'Remy'];
      const name = names.find((n) => !room!.players.some((p) => p.bot && p.name === n)) ?? 'Ace';
      room.players.push(
        makePlayer(`bot-${randomUUID()}`, name, COLORS[room.players.length % COLORS.length], true),
      );
      log(room, `${name} pulled up a chair.`);
    } else if (type === 'remove-player') {
      requireHost(room, user.id);
      if (room.phase !== 'lobby') throw new Error('Players cannot be removed during a game.');
      const target = z.string().parse(payload.playerId);
      if (target === user.id) throw new Error('Use Leave table to leave.');
      room.players = room.players.filter((p) => p.id !== target);
    } else if (type === 'start') {
      requireHost(room, user.id);
      if (room.phase !== 'lobby') throw new Error('The game has already started.');
      if (room.players.some((p) => p.id !== room!.hostId && !p.ready))
        throw new Error('Wait for everyone to be ready.');
      startRound(room, secureRandom);
    } else if (type === 'next-round') {
      requireHost(room, user.id);
      if (room.phase !== 'round-end') throw new Error('Finish this round first.');
      startRound(room, secureRandom);
    } else if (type === 'rematch') {
      requireHost(room, user.id);
      if (room.phase !== 'finished') throw new Error('Finish this game first.');
      const next = createRoom(
        room.code,
        room.name,
        makePlayer(p.id, p.name, p.color),
        room.settings,
      );
      next.players = room.players
        .filter((p) => p.bot || p.connected)
        .map((p) => makePlayer(p.id, p.name, p.color, p.bot));
      next.version = room.version;
      room = next;
      store.data.rooms[room.code] = room;
    } else if (type === 'trigger-hackathon') {
      requireHost(room, user.id);
      if (!isSoloBotRoom(room))
        throw new Error('The AI Hackathon shortcut is only available in solo bot games.');
      if (version !== room.version)
        throw new Error('The table just changed. Your view is refreshed; please try again.');
      const drawer =
        room.players.find((player) => player.id === user.id && player.status === 'active') ??
        room.players.find((player) => player.status === 'active');
      if (!drawer) throw new Error('No active player can receive the card.');
      room = triggerHackathon(room, drawer.id);
      store.data.rooms[room.code] = room;
    } else if (type === 'action') {
      if (version !== room.version)
        throw new Error('The table just changed. Your view is refreshed; please try again.');
      room = applyAction(room, user.id, actionSchema.parse(payload.action), secureRandom);
      store.data.rooms[room.code] = room;
    } else throw new Error('Unknown table action.');
    commit(room);
  }
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws') return;
    try {
      if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) {
        socket.destroy();
        return;
      }
      const user = userFor(req);
      if (!user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      const token = cookieToken(req)!;
      wss.handleUpgrade(req, socket, head, (ws) => {
        clients.set(ws, { userId: user.id, tokenHash: hash(token), alive: true });
        const room = roomFor(user.id);
        const p = room?.players.find((p) => p.id === user.id);
        if (p) {
          p.connected = true;
          const host = room!.players.find((p) => p.id === room!.hostId);
          if (!host || host.bot || !host.connected) room!.hostId = user.id;
        }
        commit(room);
        ws.on('pong', () => {
          const c = clients.get(ws);
          if (c) c.alive = true;
        });
        ws.on('error', () => ws.terminate());
        ws.on('message', (raw) => {
          let requestId = '';
          try {
            const client = clients.get(ws)!;
            const session = store.data.sessions[client.tokenHash];
            if (!session || session.expires <= Date.now()) {
              ws.close(4001, 'Session expired');
              return;
            }
            if (!allow(`ws:${user.id}`, 80))
              throw new Error('Slow down a little. Try again in a moment.');
            const msg = z
              .object({
                id: z.string().min(8).max(80),
                type: z.string().max(30),
                payload: z.record(z.string(), z.unknown()).default({}),
                version: z.number().int().optional(),
              })
              .parse(JSON.parse(raw.toString()));
            requestId = msg.id;
            let seen = receipts.get(user.id);
            if (!seen) {
              seen = new Set();
              receipts.set(user.id, seen);
            }
            if (seen.has(msg.id)) {
              send(ws, { type: 'ack', id: msg.id });
              return;
            }
            handle(user, msg.type, msg.payload, msg.version);
            seen.add(msg.id);
            if (seen.size > 512) seen.delete(seen.values().next().value!);
            send(ws, { type: 'ack', id: msg.id });
          } catch (error) {
            send(ws, {
              type: 'error',
              id: requestId,
              message:
                error instanceof z.ZodError
                  ? 'Some details are invalid. Check your entry and try again.'
                  : error instanceof Error
                    ? error.message
                    : 'Something went wrong.',
            });
            broadcast();
          }
        });
        ws.on('close', () => {
          clients.delete(ws);
          if (closing) return;
          const room = roomFor(user.id);
          const p = room?.players.find((p) => p.id === user.id);
          if (p && !connected(user.id)) {
            p.connected = false;
            if (room!.hostId === user.id)
              room!.hostId =
                room!.players.find((other) => !other.bot && other.connected)?.id ?? user.id;
          }
          commit(room);
        });
      });
    } catch {
      socket.destroy();
    }
  });
  const heartbeat = setInterval(() => {
    for (const [ws, c] of clients) {
      if (!c.alive) ws.terminate();
      else {
        c.alive = false;
        ws.ping();
      }
    }
    for (const [key, value] of limits) if (value.reset < Date.now()) limits.delete(key);
    for (const room of Object.values(store.data.rooms))
      if (
        room.updatedAt < Date.now() - 86400000 &&
        !room.players.some((p) => !p.bot && connected(p.id))
      )
        delete store.data.rooms[room.code];
  }, 30000);
  heartbeat.unref();
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error: unknown, _req: Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(400).json({ error: 'The request could not be processed.' });
  });
  async function close() {
    closing = true;
    clearInterval(heartbeat);
    for (const timer of timers.values()) clearTimeout(timer);
    for (const ws of clients.keys()) ws.terminate();
    wss.close();
    store.save();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return { app, server, store, close };
}
