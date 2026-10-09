import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../server/app';
import { DEFAULT_SETTINGS } from '../shared/engine';
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
      { name: 'Ace Alice', color: 'lavender', theme: 'midnight' },
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
    expect((await login.json()).profile.id).toBe(user.profile.id);
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
