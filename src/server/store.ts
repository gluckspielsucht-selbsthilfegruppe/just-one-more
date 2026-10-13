import { constants, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import type { Profile, Room } from '../shared/types';

export interface User extends Profile {
  password?: string;
  salt?: string;
  username?: string;
}
export interface Database {
  users: Record<string, User>;
  sessions: Record<string, { userId: string; expires: number }>;
  rooms: Record<string, Room>;
  completed: string[];
  recordedRounds: Record<string, number>;
}
// Checks only what loading relies on, so snapshots from older versions stay valid.
const snapshotSchema = z.object({
  users: z.record(z.string(), z.looseObject({ id: z.string(), stats: z.looseObject({}) })),
  sessions: z.record(z.string(), z.looseObject({ userId: z.string(), expires: z.number() })),
  rooms: z.record(
    z.string(),
    z.looseObject({
      code: z.string(),
      gameId: z.string(),
      players: z.array(z.looseObject({ id: z.string() })),
      history: z.array(z.unknown()),
    }),
  ),
  completed: z.array(z.string()).default([]),
  recordedRounds: z.record(z.string(), z.number()).default({}),
});
function empty(): Database {
  return { users: {}, sessions: {}, rooms: {}, completed: [], recordedRounds: {} };
}
function load(file?: string): Database {
  if (!file || !existsSync(file)) return empty();
  const text = readFileSync(file, 'utf8');
  try {
    return snapshotSchema.parse(JSON.parse(text)) as unknown as Database;
  } catch (error) {
    const backup = `${file}.corrupt-${Date.now()}`;
    renameSync(file, backup);
    console.error(`Saved data is unreadable; moved it to ${backup} and started empty.`, error);
    return empty();
  }
}
export class Store {
  data: Database;
  constructor(private file?: string) {
    if (file) mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    this.data = load(file);
    for (const user of Object.values(this.data.users)) user.appearance ??= 'neon';
    for (const room of Object.values(this.data.rooms)) {
      room.departedIds ??= [];
      for (const p of room.players) if (!p.bot) p.connected = false;
      this.recordResults(room);
    }
    for (const [token, session] of Object.entries(this.data.sessions))
      if (session.expires < Date.now()) delete this.data.sessions[token];
  }
  recordResults(room: Room) {
    const completed = this.data.completed.includes(room.gameId);
    // Older snapshots already included all rounds of completed games in their stats.
    const recorded = this.data.recordedRounds[room.gameId] ?? (completed ? room.round : 0);
    let latest = recorded;
    for (const round of room.history) {
      if (round.round <= recorded) continue;
      for (const result of round.scores) {
        const user = this.data.users[result.id];
        if (!user) continue;
        user.stats.rounds++;
        user.stats.bestRound = Math.max(user.stats.bestRound, result.score);
        user.stats.bestScore = Math.max(user.stats.bestScore, result.total);
      }
      latest = Math.max(latest, round.round);
    }
    if (latest > 0) this.data.recordedRounds[room.gameId] = latest;
    if (room.phase !== 'finished' || completed) return;
    for (const player of room.players) {
      const user = this.data.users[player.id];
      if (!user) continue;
      user.stats.games++;
      if (player.id === room.winnerId) user.stats.wins++;
      user.stats.bestScore = Math.max(user.stats.bestScore, player.total);
    }
    this.data.completed.push(room.gameId);
  }
  save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.data), { mode: 0o600 });
    renameSync(`${this.file}.tmp`, this.file);
  }
  async writable() {
    if (!this.file) return true;
    try {
      await access(dirname(this.file), constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
