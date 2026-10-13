import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createRoom, DEFAULT_SETTINGS, makePlayer } from '../../src/shared/engine';
import { Store, type User } from '../../src/server/store';

const stores: Store[] = [];
const directories: string[] = [];
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function open(file?: string) {
  const store = new Store(file);
  stores.push(store);
  return store;
}
function user(id: string, extra: Partial<User> = {}): User {
  return {
    id,
    name: id,
    color: '#ffffff',
    theme: 'classic',
    appearance: 'neon',
    account: false,
    stats: { games: 0, wins: 0, bestScore: 0, rounds: 0, bestRound: 0 },
    ...extra,
  };
}
function playedRoom() {
  const room = createRoom('ABCDE', 'Stats', makePlayer('alice', 'Alice'), DEFAULT_SETTINGS);
  room.players.push(makePlayer('bot-1', 'Cleo', '#000000', true));
  room.round = 1;
  const result = { status: 'banked', roulette: 0, qualified: true } as const;
  room.history = [
    {
      round: 1,
      scores: [
        { id: 'alice', name: 'Alice', score: 30, total: 30, ...result },
        { id: 'bot-1', name: 'Cleo', score: 10, total: 10, ...result },
      ],
    },
  ];
  return room;
}

describe('SQLite store', () => {
  it('records each round and finished game exactly once and ignores bots', () => {
    const store = open();
    store.insertUser(user('alice'));
    const room = playedRoom();
    store.recordResults(room);
    store.recordResults(room);
    expect(store.getUser('alice')!.stats).toEqual({
      games: 0,
      wins: 0,
      bestScore: 30,
      rounds: 1,
      bestRound: 30,
    });
    room.phase = 'finished';
    room.winnerId = 'alice';
    room.players[0].total = 30;
    store.recordResults(room);
    store.recordResults(room);
    expect(store.getUser('alice')!.stats).toMatchObject({ games: 1, wins: 1, rounds: 1 });
    expect(store.getUser('bot-1')).toBeUndefined();
  });

  it('keeps usernames unique regardless of case', () => {
    const store = open();
    store.insertUser(user('a', { account: true, username: 'alice' }));
    expect(() => store.insertUser(user('b', { account: true, username: 'ALICE' }))).toThrow(
      /UNIQUE/,
    );
    expect(store.findUserByUsername('Alice')?.id).toBe('a');
  });

  it('rolls back a failed transaction', () => {
    const store = open();
    expect(() =>
      store.transaction(() => {
        store.insertUser(user('alice'));
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(store.getUser('alice')).toBeUndefined();
  });

  it('prunes expired sessions, unreachable guests, and bookkeeping of closed games', () => {
    const store = open();
    for (const id of ['guest', 'alice', 'account'])
      store.insertUser(user(id, { account: id === 'account' }));
    store.createSession('expired', 'guest', 1000);
    store.createSession('seated-expired', 'alice', 1000);
    store.createSession('account-expired', 'account', 1000);
    store.createSession('kept', 'account', 5000);
    const room = playedRoom();
    store.recordResults(room);

    const seated = new Set(['alice']);
    expect(store.prune(2000, seated, new Set([room.gameId]))).toBe(4);
    expect(store.getSession('expired')).toBeUndefined();
    expect(store.getSession('kept')).toEqual({ userId: 'account', expires: 5000 });
    expect(store.getUser('guest')).toBeUndefined();
    expect(store.getUser('alice')).toBeDefined();
    expect(store.getUser('account')).toBeDefined();

    store.recordResults(room);
    expect(store.getUser('alice')!.stats.rounds).toBe(1);
    store.prune(2000, seated, new Set());
    // The game's bookkeeping is gone, so replaying the same room would count again.
    store.recordResults(room);
    expect(store.getUser('alice')!.stats.rounds).toBe(2);
  });

  it('deletes the sessions of a deleted user', () => {
    const store = open();
    store.insertUser(user('guest'));
    store.createSession('token', 'guest', 1000);
    store.prune(0, new Set(), new Set());
    expect(store.getUser('guest')).toBeDefined();
    store.prune(1000, new Set(), new Set());
    expect(store.getSession('token')).toBeUndefined();
    expect(store.getUser('guest')).toBeUndefined();
  });

  it('restores saved rooms with every human disconnected after a restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'jom-store-'));
    directories.push(directory);
    const file = join(directory, 'just-one-more.db');
    const first = open(file);
    const room = playedRoom();
    room.players[0].connected = true;
    first.setRoom(room);
    first.saveRoom(room);
    first.close();
    const second = open(file);
    const restored = second.getRoom('ABCDE')!;
    expect(restored.history).toEqual(room.history);
    expect(restored.players.map((p) => p.connected)).toEqual([false, true]);
    second.removeRoom('ABCDE');
    second.close();
    expect(open(file).roomCount()).toBe(0);
  });
});
