import express, { type Request } from 'express';
import { createServer, type IncomingMessage } from 'node:http';
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import proxyAddr from 'proxy-addr';
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
  type Random,
} from '../shared/engine';
import {
  CARD_DESIGNS,
  type GameAction,
  type Profile,
  type Room,
  type RoomSummary,
} from '../shared/types';
import { Store, type User } from './store';
import type { TrustProxy } from './config';

const derive = promisify(scrypt);
const secureRandom = () => randomInt(0, 0x100000000) / 0x100000000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const SESSION_TTL = 30 * 86400000;
const ROOM_TTL = 86400000;
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)';
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
function sameOrigin(origin: string | undefined, host: string | undefined) {
  try {
    return !!origin && new URL(origin).host === host;
  } catch {
    return false;
  }
}
function clientErrorStatus(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
}

export interface ApplicationOptions {
  // Omitted in tests: an in-memory database that disappears on close.
  databaseFile?: string;
  botDelay?: number;
  disconnectDelay?: number;
  // Tests inject a seeded generator; production always uses the crypto source.
  random?: Random;
  trustProxy?: TrustProxy;
  // Undefined derives the Secure flag from the request (HTTPS directly or via a trusted proxy).
  cookieSecure?: boolean;
  // Vite's development server needs inline scripts, so dev disables the policy.
  contentSecurityPolicy?: boolean;
  // Minimum gap between public room list updates to lobby clients.
  roomListInterval?: number;
}

export function createApplication(options: ApplicationOptions = {}) {
  const random = options.random ?? secureRandom;
  const store = new Store(options.databaseFile);
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  const clients = new Map<WebSocket, { userId: string; tokenHash: string; alive: boolean }>();
  const sockets = new Map<string, Set<WebSocket>>();
  const seats = new Map<string, string>();
  const members = new Map<string, Set<string>>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const timerKeys = new Map<string, string>();
  const receipts = new Map<string, Set<string>>();
  const limits = new Map<string, { count: number; reset: number }>();
  const roomListInterval = options.roomListInterval ?? 1000;
  let roomListTimer: ReturnType<typeof setTimeout> | undefined;
  let roomListSentAt = 0;
  let roomList = '';
  let closing = false;
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? false);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    if (options.contentSecurityPolicy !== false)
      res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    if (
      req.method !== 'GET' &&
      req.headers.origin !== undefined &&
      !sameOrigin(req.headers.origin, req.headers.host)
    )
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  function clientIp(req: IncomingMessage) {
    return proxyAddr(req, app.get('trust proxy fn'));
  }
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
    const session = token ? store.getSession(hash(token)) : undefined;
    return session && session.expires > Date.now() ? store.getUser(session.userId) : undefined;
  }
  /** Re-reads who is seated at a room; returns everyone who was or is seated there. */
  function indexRoom(code: string) {
    const previous = members.get(code) ?? new Set<string>();
    for (const id of previous) if (seats.get(id) === code) seats.delete(id);
    const room = store.getRoom(code);
    const current = new Set(
      room?.players.filter((p) => !room.departedIds.includes(p.id)).map((p) => p.id),
    );
    for (const id of current) seats.set(id, code);
    if (room) members.set(code, current);
    else members.delete(code);
    return new Set([...previous, ...current]);
  }
  for (const room of store.rooms()) indexRoom(room.code);
  function roomFor(id: string) {
    const code = seats.get(id);
    return code ? store.getRoom(code) : undefined;
  }
  function summary(): RoomSummary[] {
    return [...store.rooms()]
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
    if (ws.readyState === WebSocket.OPEN)
      ws.send(typeof value === 'string' ? value : JSON.stringify(value));
  }
  function stateFor(userId: string, rooms = summary()) {
    const user = store.getUser(userId);
    if (!user) return undefined;
    const room = roomFor(userId);
    return {
      type: 'state',
      profile: publicProfile(user),
      rooms,
      room: room ? toPublicRoom(room) : null,
    };
  }
  function publish(userIds: Set<string>) {
    let rooms: RoomSummary[] | undefined;
    for (const id of userIds) {
      const targets = sockets.get(id);
      if (!targets) continue;
      const state = stateFor(id, (rooms ??= summary()));
      if (!state) continue;
      const text = JSON.stringify(state);
      for (const ws of targets) send(ws, text);
    }
  }
  // Lobby clients only need the public list; it is sent on change, at most once per interval.
  function publishRoomList() {
    if (roomListTimer || closing) return;
    roomListTimer = setTimeout(
      () => {
        roomListTimer = undefined;
        roomListSentAt = Date.now();
        const rooms = summary();
        const text = JSON.stringify(rooms);
        if (text === roomList) return;
        roomList = text;
        const message = JSON.stringify({ type: 'rooms', rooms });
        for (const [id, targets] of sockets)
          if (!seats.has(id)) for (const ws of targets) send(ws, message);
      },
      Math.max(0, roomListSentAt + roomListInterval - Date.now()),
    );
  }
  function connected(id: string) {
    return sockets.has(id);
  }
  function commit(room?: Room, notify: Iterable<string> = []) {
    const recipients = new Set(notify);
    if (room) {
      room.version++;
      room.updatedAt = Date.now();
      store.transaction(() => {
        // A room that was just closed is no longer cached and must not be written back.
        if (store.getRoom(room.code) === room) store.saveRoom(room);
        store.recordResults(room);
      });
      for (const id of indexRoom(room.code)) recipients.add(id);
    }
    publish(recipients);
    if (room) {
      publishRoomList();
      schedule(room);
    }
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
          startRound(room, random);
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
            const latest = store.getRoom(room.code);
            if (!latest) return;
            const action: GameAction =
              !actor.bot && (!latest.prompt || latest.prompt.kind === 'bank')
                ? { type: 'bank', roulette: false }
                : botAction(latest, actor.id, random);
            if (!actor.bot)
              log(
                latest,
                `${actor.name} is disconnected. An automatic choice keeps the table moving.`,
              );
            const next = applyAction(latest, actor.id, action, random);
            store.setRoom(next);
            commit(next);
          } catch (error) {
            console.error('Automatic action failed:', error);
          }
        },
        actor.bot ? (options.botDelay ?? 1100) : (options.disconnectDelay ?? 30000),
      ),
    );
  }
  function cookieOptions(req: Request) {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: options.cookieSecure ?? req.secure,
      path: '/',
    };
  }
  function setSession(req: Request, res: express.Response, userId: string) {
    const token = randomBytes(32).toString('hex');
    store.createSession(hash(token), userId, Date.now() + SESSION_TTL);
    res.cookie('jom_session', token, { ...cookieOptions(req), maxAge: SESSION_TTL });
  }
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/ready', async (_req, res) => {
    const ready = await store.writable();
    res.status(ready ? 200 : 503).json({ ok: ready });
  });
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
    if (!allow(`guest:${clientIp(req)}`, 60))
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
    store.transaction(() => {
      store.insertUser(user);
      setSession(req, res, user.id);
    });
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
        appearance: z.enum(['neon', 'velvet', 'pop', 'glow', 'western']).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'Check your nickname and appearance settings.' });
    Object.assign(user, parsed.data);
    store.updateUser(user);
    const room = roomFor(user.id);
    const player = room?.players.find((p) => p.id === user.id);
    if (player) {
      player.name = user.name;
      player.color = user.color;
    }
    commit(room, [user.id]);
    res.json({ profile: publicProfile(user) });
  });
  app.post('/api/auth/:mode', async (req, res) => {
    try {
      if (!allow(`auth:${clientIp(req)}`, 10))
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
      const existing = store.findUserByUsername(username);
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
        if (store.findUserByUsername(username))
          return res.status(409).json({ error: 'That username is already taken.' });
        user = current;
        Object.assign(user, { account: true, username, salt, password });
        store.updateUser(user);
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
      store.transaction(() => {
        if (previous) store.deleteSession(hash(previous));
        setSession(req, res, user.id);
      });
      if (previous)
        for (const [ws, c] of clients)
          if (c.tokenHash === hash(previous)) ws.close(4001, 'Session changed');
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
      store.deleteSession(hash(token));
      for (const [ws, c] of clients) if (c.tokenHash === hash(token)) ws.close(4001, 'Signed out');
    }
    res.clearCookie('jom_session', cookieOptions(req));
    res.json({ ok: true });
  });
  function requireHost(room: Room, id: string) {
    if (room.hostId !== id) throw new Error('Only the host can do that.');
  }
  function handle(user: User, type: string, payload: Record<string, unknown>, version?: number) {
    let room = roomFor(user.id);
    if (type === 'create') {
      if (room) throw new Error('Leave your current table before creating another.');
      if (store.roomCount() >= 100) throw new Error('The server is full. Please try again later.');
      const settings = settingsSchema.parse(payload.settings ?? DEFAULT_SETTINGS);
      const name = z.string().trim().min(2).max(40).parse(payload.name);
      let code: string;
      do {
        code = Array.from(
          { length: 5 },
          () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(31)],
        ).join('');
      } while (store.getRoom(code));
      room = createRoom(code, name, makePlayer(user.id, user.name, user.color), settings);
      store.setRoom(room);
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
      const target = store.getRoom(code);
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
        store.removeRoom(room.code);
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
      startRound(room, random);
    } else if (type === 'next-round') {
      requireHost(room, user.id);
      if (room.phase !== 'round-end') throw new Error('Finish this round first.');
      startRound(room, random);
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
      store.setRoom(room);
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
      store.setRoom(room);
    } else if (type === 'action') {
      if (version !== room.version)
        throw new Error('The table just changed. Your view is refreshed; please try again.');
      room = applyAction(room, user.id, actionSchema.parse(payload.action), random);
      store.setRoom(room);
    } else throw new Error('Unknown table action.');
    commit(room);
  }
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws') return;
    try {
      if (!sameOrigin(req.headers.origin, req.headers.host)) {
        socket.destroy();
        return;
      }
      if (!allow(`upgrade:${clientIp(req)}`, 120)) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
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
        const own = sockets.get(user.id) ?? new Set<WebSocket>();
        own.add(ws);
        sockets.set(user.id, own);
        const room = roomFor(user.id);
        const p = room?.players.find((p) => p.id === user.id);
        const host = room?.players.find((p) => p.id === room.hostId);
        const reclaimHost =
          !!p && room!.hostId !== user.id && (!host || host.bot || !host.connected);
        if (p && (!p.connected || reclaimHost)) {
          p.connected = true;
          if (reclaimHost) room!.hostId = user.id;
          commit(room, [user.id]);
        } else {
          const state = stateFor(user.id);
          if (state) send(ws, state);
        }
        ws.on('pong', () => {
          const c = clients.get(ws);
          if (c) c.alive = true;
        });
        ws.on('error', () => ws.terminate());
        ws.on('message', (raw) => {
          let requestId = '';
          try {
            const client = clients.get(ws)!;
            const session = store.getSession(client.tokenHash);
            // Re-read the user so profile changes made over HTTP apply to table actions.
            const current = session && session.expires > Date.now() && store.getUser(user.id);
            if (!current) {
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
            handle(current, msg.type, msg.payload, msg.version);
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
            const state = stateFor(user.id);
            if (state) send(ws, state);
          }
        });
        ws.on('close', () => {
          clients.delete(ws);
          own.delete(ws);
          if (!own.size && sockets.get(user.id) === own) sockets.delete(user.id);
          if (closing || connected(user.id)) return;
          const room = roomFor(user.id);
          const p = room?.players.find((p) => p.id === user.id);
          if (!p?.connected) return;
          p.connected = false;
          if (room!.hostId === user.id)
            room!.hostId =
              room!.players.find((other) => !other.bot && other.connected)?.id ?? user.id;
          commit(room);
        });
      });
    } catch {
      socket.destroy();
    }
  });
  function cleanup(now = Date.now()) {
    for (const [key, value] of limits) if (value.reset < now) limits.delete(key);
    let changed = false;
    for (const room of [...store.rooms()])
      if (room.updatedAt < now - ROOM_TTL && !room.players.some((p) => !p.bot && connected(p.id))) {
        clearTimeout(timers.get(room.code));
        timers.delete(room.code);
        timerKeys.delete(room.code);
        store.removeRoom(room.code);
        indexRoom(room.code);
        changed = true;
      }
    const seated = new Set<string>();
    const games = new Set<string>();
    for (const room of store.rooms()) {
      games.add(room.gameId);
      for (const p of room.players) seated.add(p.id);
    }
    store.prune(now, seated, games);
    for (const [ws, c] of clients)
      if (!store.getSession(c.tokenHash)) ws.close(4001, 'Session expired');
    if (changed) publishRoomList();
  }
  const heartbeat = setInterval(() => {
    for (const [ws, c] of clients) {
      if (!c.alive) ws.terminate();
      else {
        c.alive = false;
        ws.ping();
      }
    }
    cleanup();
  }, 30000);
  heartbeat.unref();
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error: unknown, _req: Request, res: express.Response, _next: express.NextFunction) => {
    const status = clientErrorStatus(error);
    if (status)
      return res.status(status).json({
        error:
          status === 413 ? 'That request is too large.' : 'The request could not be processed.',
      });
    console.error(error);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });
  async function close() {
    closing = true;
    clearInterval(heartbeat);
    clearTimeout(roomListTimer);
    for (const timer of timers.values()) clearTimeout(timer);
    for (const ws of clients.keys()) ws.terminate();
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }
  return { app, server, store, close, cleanup };
}
