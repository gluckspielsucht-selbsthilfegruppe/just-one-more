import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createApplication, type ApplicationOptions } from '../../src/server/app';
import { DEFAULT_SETTINGS } from '../../src/shared/engine';

type Message = {
  type: string;
  id?: string;
  room?: { code: string; players: { connected: boolean }[] } | null;
  rooms?: { code: string }[];
};
type Application = ReturnType<typeof createApplication>;
const running: Application[] = [];

afterEach(async () => {
  for (const application of running.splice(0)) await application.close();
});
async function start(options: ApplicationOptions = {}) {
  const application = createApplication(options);
  running.push(application);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  return { application, base: `http://127.0.0.1:${address.port}` };
}
async function until(check: () => boolean, timeout = 4000) {
  const end = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > end) throw new Error('Condition not met in time.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
async function guest(base: string, name: string) {
  const res = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.headers.get('set-cookie')!.split(';')[0];
}
async function open(base: string, cookie: string) {
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`, {
    headers: { Cookie: cookie, Origin: base },
  });
  const messages: Message[] = [];
  ws.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
  await until(() => messages.some((m) => m.type === 'state'));
  const states = () => messages.filter((m) => m.type === 'state');
  return {
    ws,
    messages,
    states,
    latest: () => states().at(-1)!,
    async request(type: string, payload: Record<string, unknown> = {}) {
      const id = randomUUID();
      ws.send(JSON.stringify({ id, type, payload }));
      await until(() => messages.some((m) => m.id === id));
      const reply = messages.find((m) => m.id === id)!;
      if (reply.type === 'error') throw new Error('Command failed');
    },
  };
}
async function table(base: string, name: string, isPublic = false) {
  const player = await open(base, await guest(base, name));
  await player.request('create', {
    name: `${name}'s table`,
    settings: { ...DEFAULT_SETTINGS, isPublic },
  });
  return player;
}

describe('scoped broadcasting', () => {
  it('sends table updates only to that table and the public list only to the lobby', async () => {
    const { base } = await start({ roomListInterval: 0 });
    const lobby = await open(base, await guest(base, 'Lena'));
    const a = await table(base, 'Alice', true);
    const b = await table(base, 'Bob');
    await settle();
    const statesForB = b.states().length;
    const statesForLobby = lobby.states().length;
    await a.request('chat', { message: 'Only for table A' });
    await a.request('add-bot');
    await settle();
    expect(b.states()).toHaveLength(statesForB);
    expect(b.messages.filter((m) => m.type === 'rooms')).toHaveLength(0);
    expect(lobby.states()).toHaveLength(statesForLobby);
    const lists = lobby.messages.filter((m) => m.type === 'rooms');
    expect(lists.at(-1)!.rooms!.map((room) => room.code)).toEqual([a.latest().room!.code]);
  });

  it('sends the public list on change only, at most once per interval', async () => {
    const { base } = await start({ roomListInterval: 300 });
    const lobby = await open(base, await guest(base, 'Lena'));
    const host = await table(base, 'Alice', true);
    for (let i = 0; i < 5; i++) await host.request('chat', { message: `Message ${i}` });
    await host.request('add-bot');
    await until(() => lobby.messages.filter((m) => m.type === 'rooms').length >= 2);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const lists = lobby.messages.filter((m) => m.type === 'rooms');
    expect(lists).toHaveLength(2);
    expect(lists[1].rooms).toEqual([expect.objectContaining({ players: 2 })]);
  });

  it('tells a player who left the table, even after the room closed', async () => {
    const { application, base } = await start();
    const host = await table(base, 'Alice');
    const code = host.latest().room!.code;
    await host.request('leave');
    await until(() => host.latest().room === null);
    expect(application.store.getRoom(code)).toBeUndefined();
  });
});

describe('connection changes', () => {
  it('neither saves nor broadcasts when another tab of a seated player opens or closes', async () => {
    const { application, base } = await start();
    const cookie = await guest(base, 'Alice');
    const alice = await open(base, cookie);
    await alice.request('create', { name: 'Two tabs', settings: DEFAULT_SETTINGS });
    const bob = await open(base, await guest(base, 'Bob'));
    await bob.request('join', { code: alice.latest().room!.code });
    await settle();
    const save = vi.spyOn(application.store, 'saveRoom');
    const statesForBob = bob.states().length;

    const second = await open(base, cookie);
    expect(second.latest().room!.code).toBe(alice.latest().room!.code);
    second.ws.close();
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(bob.states()).toHaveLength(statesForBob);

    alice.ws.close();
    await until(() => bob.latest().room!.players[0].connected === false);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('sends nothing to others when a player without a table connects or disconnects', async () => {
    const { application, base } = await start();
    const host = await table(base, 'Alice', true);
    await settle();
    const save = vi.spyOn(application.store, 'saveRoom');
    const seen = host.messages.length;
    const visitor = await open(base, await guest(base, 'Vic'));
    visitor.ws.close();
    await settle();
    expect(host.messages).toHaveLength(seen);
    expect(save).not.toHaveBeenCalled();
  });
});
