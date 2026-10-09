import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../server/app';
import { DEFAULT_SETTINGS, makePlayer, startRound } from '../shared/engine';
import type { Profile, PublicRoom } from '../shared/types';

type Snapshot = {
  type: 'state';
  profile: Profile;
  room: PublicRoom | null;
  rooms: { code: string }[];
};
type Client = {
  ws: WebSocket;
  cookie: string;
  state: Snapshot;
  request: (
    type: string,
    payload?: Record<string, unknown>,
    options?: { id?: string; version?: number },
  ) => Promise<void>;
};
let application: ReturnType<typeof createApplication>;
let base: string;
let clients: Client[] = [];
async function until(check: () => boolean, timeout = 4000) {
  const end = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > end) throw new Error('State did not arrive in time.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
async function listen() {
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  base = `http://127.0.0.1:${address.port}`;
}
async function request(path: string, body?: unknown, cookie?: string) {
  return fetch(`${base}/api/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function connect(name: string, cookie?: string): Promise<Client> {
  if (!cookie) {
    const res = await request('session', { name });
    expect(res.ok).toBe(true);
    cookie = res.headers.get('set-cookie')!.split(';')[0];
  }
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`, {
    headers: { Cookie: cookie, Origin: base },
  });
  const pending = new Map<string, { resolve: () => void; reject: (e: Error) => void }>();
  const c: Client = {
    ws,
    cookie,
    state: null as unknown as Snapshot,
    request(type, payload = {}, options = {}) {
      const id = options.id ?? randomUUID();
      return new Promise<void>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(
          JSON.stringify({ id, type, payload, version: options.version ?? c.state.room?.version }),
        );
      });
    },
  };
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'state') c.state = msg;
    if (msg.type === 'ack' || msg.type === 'error') {
      const p = pending.get(msg.id);
      if (p) {
        pending.delete(msg.id);
        if (msg.type === 'ack') p.resolve();
        else p.reject(new Error(msg.message));
      }
    }
  });
  ws.on('error', () => {});
  clients.push(c);
  await until(() => !!c.state);
  return c;
}
// Deal controlled hands, then exercise settlement through the real WebSocket commands.
async function dealStatsRound(host: Client, values: number[], totals?: number[]) {
  const room = application.store.data.rooms[host.state.room!.code];
  room.phase = 'playing';
  room.round++;
  room.turnId = room.players[0].id;
  room.players = room.players.map((player, index) => ({
    ...makePlayer(player.id, player.name, player.color, player.bot),
    connected: player.connected,
    total: totals?.[index] ?? player.total,
    hand: [{ id: `stats-${room.round}-${index}`, kind: 'number', value: values[index] }],
  }));
  await host.request('chat', { message: 'Ready for the next round.' });
  return room;
}
beforeEach(async () => {
  clients = [];
  application = createApplication({ botDelay: 5, disconnectDelay: 30 });
  await listen();
});
afterEach(async () => {
  for (const c of clients) c.ws.terminate();
  await application.close();
});

describe('four-player real-time server', () => {
  it('lets the solo host reveal AI Hackathon once and broadcasts the real card event', async () => {
    const host = await connect('Alice');
    await host.request('create', { name: 'Bot demo', settings: DEFAULT_SETTINGS });
    await host.request('add-bot');
    await expect(host.request('trigger-hackathon')).rejects.toThrow('Start a round');
    const room = application.store.data.rooms[host.state.room!.code];
    startRound(room, () => 0.9999);
    await host.request('chat', { message: 'Ready for the demo.' });
    const secondScreen = await connect('Alice', host.cookie);
    const before = host.state.room!;
    expect(before.reversed).toBe(false);
    await expect(
      host.request('trigger-hackathon', {}, { version: before.version - 1 }),
    ).rejects.toThrow('table just changed');
    await host.request('trigger-hackathon');
    await until(() => Boolean(host.state.room?.reversed && secondScreen.state.room?.reversed));
    const after = host.state.room!;
    expect(after.turnId).toBe(before.turnId);
    expect(after.deckCount).toBe(before.deckCount - 1);
    expect(after.events.at(-1)?.moment).toBe('hackathon');
    expect(secondScreen.state.room!.events.at(-1)?.id).toBe(after.events.at(-1)?.id);
    expect(
      application.store.data.rooms[room.code].used.filter((card) => card.kind === 'hackathon'),
    ).toHaveLength(1);
    await expect(host.request('trigger-hackathon')).rejects.toThrow('already active');
  });

  it('keeps the practice shortcut out of multiplayer tables', async () => {
    const host = await connect('Alice');
    const friend = await connect('Bob');
    await host.request('create', { name: 'Friends and a bot', settings: DEFAULT_SETTINGS });
    await host.request('add-bot');
    await friend.request('join', { code: host.state.room!.code });
    await expect(friend.request('trigger-hackathon')).rejects.toThrow('host');
    await expect(host.request('trigger-hackathon')).rejects.toThrow('solo bot');
  });

  it('updates round stats immediately and counts completed games once across replay, reconnect and rematch', async () => {
    const a = await connect('Alice');
    const b = await connect('Bob');
    await a.request('create', { name: 'Stats table', settings: DEFAULT_SETTINGS });
    await b.request('join', { code: a.state.room!.code });
    await dealStatsRound(a, [12, 8]);
    await a.request('action', { action: { type: 'bank', roulette: false } });
    expect(a.state.profile.stats.rounds).toBe(0);
    await until(() => b.state.room?.turnId === b.state.profile.id);
    const replay = { id: randomUUID(), version: b.state.room!.version };
    await b.request('action', { action: { type: 'bank', roulette: false } }, replay);
    await until(() => a.state.profile.stats.rounds === 1);
    expect(a.state.profile.stats).toEqual({
      games: 0,
      wins: 0,
      rounds: 1,
      bestRound: 12,
      bestScore: 12,
    });
    expect(b.state.profile.stats).toEqual({
      games: 0,
      wins: 0,
      rounds: 1,
      bestRound: 8,
      bestScore: 8,
    });
    await b.request('action', { action: { type: 'bank', roulette: false } }, replay);
    await a.request('chat', { message: 'One round counted.' });
    const again = await connect('Alice', a.cookie);
    expect(again.state.profile.stats).toEqual(a.state.profile.stats);
    expect(again.state.profile.stats.rounds).toBe(1);

    await dealStatsRound(a, [12, 8], [190, 8]);
    await a.request('action', { action: { type: 'bank', roulette: false } });
    await until(() => b.state.room?.turnId === b.state.profile.id);
    await b.request('action', { action: { type: 'bank', roulette: false } });
    await until(() => a.state.room?.phase === 'finished');
    expect(a.state.profile.stats).toEqual({
      games: 1,
      wins: 1,
      rounds: 2,
      bestRound: 12,
      bestScore: 202,
    });
    expect(b.state.profile.stats).toEqual({
      games: 1,
      wins: 0,
      rounds: 2,
      bestRound: 8,
      bestScore: 16,
    });
    const previousGame = a.state.room!.gameId;
    await a.request('chat', { message: 'A finished game counts once.' });
    await a.request('rematch');
    expect(a.state.room!.gameId).not.toBe(previousGame);
    await dealStatsRound(a, [1, 12], [0, 190]);
    await a.request('action', { action: { type: 'bank', roulette: false } });
    await until(() => b.state.room?.turnId === b.state.profile.id);
    await b.request('action', { action: { type: 'bank', roulette: false } });
    await until(() => a.state.profile.stats.games === 2);
    expect(a.state.profile.stats).toEqual({
      games: 2,
      wins: 1,
      rounds: 3,
      bestRound: 12,
      bestScore: 202,
    });
    expect(b.state.profile.stats).toEqual({
      games: 2,
      wins: 1,
      rounds: 3,
      bestRound: 12,
      bestScore: 202,
    });
  });

  it('counts a busted practice round when a bot settles it and retains stats after leaving', async () => {
    const a = await connect('Alice');
    await a.request('create', { name: 'Practice stats', settings: DEFAULT_SETTINGS });
    await a.request('add-bot');
    const room = await dealStatsRound(a, [12, 8], [0, 200]);
    room.deck = [{ id: 'duplicate', kind: 'number', value: 12 }];
    await a.request('action', { action: { type: 'draw' } });
    await until(() => a.state.room?.phase === 'finished');
    expect(a.state.room!.players[0].status).toBe('busted');
    const stats = { games: 1, wins: 0, rounds: 1, bestRound: 0, bestScore: 0 };
    expect(a.state.profile.stats).toEqual(stats);
    await a.request('leave');
    expect(a.state.room).toBeNull();
    expect((await (await request('bootstrap', undefined, a.cookie)).json()).profile.stats).toEqual(
      stats,
    );
  });

  it('persists round checkpoints, backfills older unfinished games and preserves already counted games', async () => {
    await application.close();
    const directory = mkdtempSync(join(tmpdir(), 'jom-stats-'));
    try {
      const dataFile = join(directory, 'game.json');
      application = createApplication({ dataFile });
      await listen();
      const a = await connect('Alice');
      const b = await connect('Bob');
      await a.request('create', { name: 'Saved stats', settings: DEFAULT_SETTINGS });
      await b.request('join', { code: a.state.room!.code });
      await dealStatsRound(a, [12, 8]);
      await a.request('action', { action: { type: 'bank', roulette: false } });
      await until(() => b.state.room?.turnId === b.state.profile.id);
      await b.request('action', { action: { type: 'bank', roulette: false } });
      await until(() => a.state.profile.stats.rounds === 1);
      const stats = structuredClone(a.state.profile.stats);
      await application.close();

      application = createApplication({ dataFile });
      await listen();
      let restored = await connect('Alice', a.cookie);
      expect(restored.state.profile.stats).toEqual(stats);
      await restored.request('chat', { message: 'Still only one round.' });
      expect(restored.state.profile.stats).toEqual(stats);
      await application.close();

      // Simulate a pre-fix save: unfinished games had no recorded stats or checkpoint.
      let legacy = JSON.parse(readFileSync(dataFile, 'utf8'));
      delete legacy.recordedRounds;
      for (const user of Object.values(legacy.users) as Profile[])
        user.stats = { games: 0, wins: 0, rounds: 0, bestRound: 0, bestScore: 0 };
      writeFileSync(dataFile, JSON.stringify(legacy));
      application = createApplication({ dataFile });
      await listen();
      restored = await connect('Alice', a.cookie);
      expect(restored.state.profile.stats).toEqual(stats);
      await application.close();

      // Older finished games already had round stats, so migration must not add them again.
      legacy = JSON.parse(readFileSync(dataFile, 'utf8'));
      delete legacy.recordedRounds;
      const room = legacy.rooms[restored.state.room!.code];
      room.phase = 'finished';
      room.winnerId = a.state.profile.id;
      legacy.completed.push(room.gameId);
      legacy.users[a.state.profile.id].stats.games = 1;
      legacy.users[a.state.profile.id].stats.wins = 1;
      writeFileSync(dataFile, JSON.stringify(legacy));
      application = createApplication({ dataFile });
      await listen();
      restored = await connect('Alice', a.cookie);
      expect(restored.state.profile.stats).toEqual({ ...stats, games: 1, wins: 1 });
      await restored.request('chat', { message: 'Migration does not count twice.' });
      expect(restored.state.profile.stats).toEqual({ ...stats, games: 1, wins: 1 });
    } finally {
      await application.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('shares identical state, validates turns, deduplicates commands, settles a round and reconnects to the same seat', async () => {
    const four: Client[] = [];
    for (const name of ['Alice', 'Bob', 'Cleo', 'Drew']) four.push(await connect(name));
    const host = four[0];
    await host.request('create', { name: 'Four friends', settings: DEFAULT_SETTINGS });
    const code = host.state.room!.code;
    for (const c of four.slice(1)) {
      await c.request('join', { code });
      await c.request('ready');
    }
    await until(() => four.every((c) => c.state.room?.players.length === 4));
    await host.request('start');
    for (let count = 0; count < 60 && host.state.room!.phase === 'playing'; count++) {
      const r = host.state.room!;
      const actor = four.find((c) => c.state.profile.id === (r.prompt?.actorId ?? r.turnId))!;
      await until(() => four.every((c) => c.state.room?.version === r.version));
      for (const c of four) expect(c.state.room).toEqual(host.state.room);
      const wrong = four.find(
        (c) =>
          c !== actor && r.players.find((p) => p.id === c.state.profile.id)!.status === 'active',
      );
      if (wrong)
        await expect(wrong.request('action', { action: { type: 'draw' } })).rejects.toThrow();
      const action =
        r.prompt?.kind === 'target'
          ? { type: 'target', targetId: actor.state.profile.id }
          : r.prompt?.kind === 'guess'
            ? { type: 'guess', value: 12 }
            : { type: 'bank', roulette: false };
      const id = randomUUID();
      const version = r.version;
      await actor.request('action', { action }, { id, version });
      const after = actor.state.room!.version;
      await actor.request('action', { action }, { id, version });
      expect(actor.state.room!.version).toBe(after);
      await expect(actor.request('action', { action }, { version })).rejects.toThrow(
        'table just changed',
      );
    }
    await until(() => four.every((c) => c.state.room?.phase === 'round-end'));
    expect(host.state.room!.history).toHaveLength(1);
    const cookie = four[2].cookie;
    const id = four[2].state.profile.id;
    four[2].ws.close();
    await until(() => host.state.room!.players.find((p) => p.id === id)?.connected === false);
    const again = await connect('Cleo', cookie);
    expect(again.state.profile.id).toBe(id);
    expect(again.state.room!.players).toHaveLength(4);
    expect(again.state.room!.history).toEqual(host.state.room!.history);
    expect('deck' in again.state.room!).toBe(false);
    expect(JSON.stringify(again.state).includes('password')).toBe(false);
  });
  it('enforces host permissions, readiness, settings, capacity and private discovery', async () => {
    const a = await connect('Alice');
    const b = await connect('Bob');
    const c = await connect('Cleo');
    await a.request('create', {
      name: 'Private club',
      settings: { ...DEFAULT_SETTINGS, isPublic: false, maxPlayers: 2 },
    });
    const code = a.state.room!.code;
    expect(a.state.rooms).toEqual([]);
    await b.request('join', { code });
    await expect(c.request('join', { code })).rejects.toThrow('full');
    await expect(b.request('start')).rejects.toThrow('host');
    await expect(b.request('add-bot')).rejects.toThrow('host');
    await expect(a.request('start')).rejects.toThrow('ready');
    await b.request('ready');
    await a.request('settings', {
      settings: { ...DEFAULT_SETTINGS, maxNumber: 15, endMode: 'seven' },
    });
    expect(a.state.room!.players[1].ready).toBe(false);
    expect(a.state.room!.settings.maxNumber).toBe(15);
    await expect(
      a.request('settings', { settings: { ...DEFAULT_SETTINGS, maxNumber: 999 } }),
    ).rejects.toThrow('invalid');
    await expect(a.request('remove-player', { playerId: a.state.profile.id })).rejects.toThrow(
      'Leave table',
    );
    await a.request('remove-player', { playerId: b.state.profile.id });
    await until(() => b.state.room === null);
    await a.request('add-bot');
    expect(a.state.room!.players[1].bot).toBe(true);
    await a.request('leave');
    expect(a.state.room).toBeNull();
  });
  it('hands hosting to a connected person and lets disconnected turns complete automatically', async () => {
    const a = await connect('Alice');
    const b = await connect('Bob');
    await a.request('create', { name: 'Resilient room', settings: DEFAULT_SETTINGS });
    await b.request('join', { code: a.state.room!.code });
    await b.request('ready');
    await a.request('start');
    const code = a.state.room!.code;
    a.ws.close();
    await until(() => b.state.room!.hostId === b.state.profile.id);
    expect(application.store.data.rooms[code].hostId).toBe(b.state.profile.id);
    await until(
      () =>
        b.state.room!.phase !== 'playing' ||
        (b.state.room!.prompt?.actorId ?? b.state.room!.turnId) === b.state.profile.id,
    );
    expect(b.state.room!.players.find((p) => p.id === a.state.profile.id)!.connected).toBe(false);
  });
  it('does not accept missing sessions or cross-origin writes', async () => {
    expect(
      (await request('profile', { name: 'Someone', color: 'sage', theme: 'classic' })).status,
    ).toBe(401);
    const res = await fetch(`${base}/api/session`, {
      method: 'POST',
      headers: { Origin: 'http://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Someone' }),
    });
    expect(res.status).toBe(403);
    const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`, { headers: { Origin: base } });
    const status = await new Promise<number>((resolve) => {
      ws.on('unexpected-response', (_req, res) => {
        resolve(res.statusCode!);
        ws.terminate();
      });
      ws.on('error', () => {});
    });
    expect(status).toBe(401);
  });
  it('supports optional accounts, profile design, sign out and signing in from a fresh session', async () => {
    const a = await connect('Alice');
    const saved = await request(
      'profile',
      { name: 'Ace Alice', color: 'lavender', theme: 'midnight', appearance: 'velvet' },
      a.cookie,
    );
    expect(saved.ok).toBe(true);
    const registration = await request(
      'auth/register',
      { username: 'alice_test', password: 'test-password-only' },
      a.cookie,
    );
    expect(registration.ok).toBe(true);
    const cookie = registration.headers.get('set-cookie')!.split(';')[0];
    const user = await registration.json();
    expect(user.profile.account).toBe(true);
    expect(user.profile.name).toBe('Ace Alice');
    expect(user.profile.theme).toBe('midnight');
    expect(user.profile.appearance).toBe('velvet');
    const stored = application.store.data.users[user.profile.id];
    expect(stored.password).not.toBe('test-password-only');
    expect(stored.salt).toBeTruthy();
    const logout = await request('logout', {}, cookie);
    expect(logout.ok).toBe(true);
    expect((await (await request('bootstrap', undefined, cookie)).json()).profile).toBeNull();
    expect(
      (await request('auth/login', { username: 'alice_test', password: 'incorrect-pass' })).status,
    ).toBe(401);
    const login = await request('auth/login', {
      username: 'ALICE_TEST',
      password: 'test-password-only',
    });
    expect(login.ok).toBe(true);
    expect((await login.json()).profile).toMatchObject({
      id: user.profile.id,
      appearance: 'velvet',
      theme: 'midnight',
    });
  });
  it('saves all app themes independently per player without changing their game or card design', async () => {
    const a = await connect('Alice');
    const b = await connect('Bob');
    expect(a.state.profile.appearance).toBe('neon');
    await a.request('create', { name: 'Theme table', settings: DEFAULT_SETTINGS });
    await b.request('join', { code: a.state.room!.code });
    await b.request('ready');
    await a.request('start');
    const before = structuredClone(a.state.room!);
    for (const appearance of ['velvet', 'pop', 'neon'] as const) {
      const res = await request(
        'profile',
        { name: 'Alice', color: a.state.profile.color, theme: 'midnight', appearance },
        a.cookie,
      );
      expect(res.ok).toBe(true);
      await until(() => a.state.profile.appearance === appearance);
      const reloaded = await (await request('bootstrap', undefined, a.cookie)).json();
      expect(reloaded.profile).toMatchObject({ appearance, theme: 'midnight' });
      expect(b.state.profile.appearance).toBe('neon');
      expect(a.state.room).toMatchObject({
        phase: before.phase,
        round: before.round,
        turnId: before.turnId,
        players: before.players,
      });
    }
    const invalid = await request(
      'profile',
      { name: 'Alice', color: a.state.profile.color, theme: 'midnight', appearance: 'unknown' },
      a.cookie,
    );
    expect(invalid.status).toBe(400);
    expect(a.state.profile.appearance).toBe('neon');
    await request(
      'profile',
      { name: 'Alice', color: a.state.profile.color, theme: 'midnight', appearance: 'pop' },
      a.cookie,
    );
    const legacyRequest = await request(
      'profile',
      { name: 'Alice', color: a.state.profile.color, theme: 'mint' },
      a.cookie,
    );
    expect((await legacyRequest.json()).profile).toMatchObject({
      appearance: 'pop',
      theme: 'mint',
    });
  });
  it('loads older saved profiles with Neon Arcade while preserving their existing data', async () => {
    await application.close();
    const directory = mkdtempSync(join(tmpdir(), 'jom-theme-migration-'));
    try {
      const dataFile = join(directory, 'game.json');
      application = createApplication({ dataFile });
      await listen();
      const a = await connect('Alice');
      const original = structuredClone(a.state.profile);
      await application.close();
      const oldData = JSON.parse(readFileSync(dataFile, 'utf8'));
      delete oldData.users[original.id].appearance;
      writeFileSync(dataFile, JSON.stringify(oldData));
      application = createApplication({ dataFile });
      await listen();
      const restored = await connect('Alice', a.cookie);
      expect(restored.state.profile).toEqual(original);
    } finally {
      await application.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('persists sessions, rooms, used cards, and departed seats across a server restart', async () => {
    await application.close();
    const directory = mkdtempSync(join(tmpdir(), 'jom-test-'));
    try {
      const dataFile = join(directory, 'game.json');
      application = createApplication({ dataFile });
      await listen();
      const a = await connect('Alice');
      const b = await connect('Bob');
      await request(
        'profile',
        { name: 'Bob', color: b.state.profile.color, theme: 'classic', appearance: 'pop' },
        b.cookie,
      );
      await a.request('create', { name: 'Persistent table', settings: DEFAULT_SETTINGS });
      await b.request('join', { code: a.state.room!.code });
      await b.request('ready');
      await a.request('start');
      const code = a.state.room!.code;
      await a.request('leave');
      const before = structuredClone(application.store.data.rooms[code]);
      // A bot may have inherited hosting while all humans were away.
      application.store.data.rooms[code].hostId = 'missing-host';
      await application.close();
      application = createApplication({ dataFile });
      await listen();
      const again = await connect('Bob', b.cookie);
      expect(again.state.profile.appearance).toBe('pop');
      expect(again.state.room!.code).toBe(code);
      expect(again.state.room!.round).toBe(before.round);
      expect(again.state.room!.hostId).toBe(again.state.profile.id);
      expect(application.store.data.rooms[code].deck).toEqual(before.deck);
      const alice = await connect('Alice', a.cookie);
      expect(alice.state.room).toBeNull();
      await alice.request('join', { code });
      expect(alice.state.room!.players).toHaveLength(2);
    } finally {
      await application.close();
      rmSync(directory, { recursive: true, force: true });
      application = createApplication();
      await listen();
    }
  });
  it('does not let chat postpone an absent player’s automatic bank', async () => {
    const a = await connect('Alice');
    const b = await connect('Bob');
    await a.request('create', { name: 'Keep it moving', settings: DEFAULT_SETTINGS });
    await b.request('join', { code: a.state.room!.code });
    const room = application.store.data.rooms[a.state.room!.code];
    room.phase = 'playing';
    room.round = 1;
    room.turnId = a.state.profile.id;
    a.ws.close();
    await until(() => b.state.room!.players[0].connected === false);
    for (let i = 0; i < 12; i++) {
      await b.request('chat', { message: 'Still here' });
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(b.state.room!.players[0].status).toBe('banked');
    expect(b.state.room!.turnId).toBe(b.state.profile.id);
  });
});
