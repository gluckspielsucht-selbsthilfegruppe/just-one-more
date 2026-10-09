import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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
export class Store {
  data: Database;
  constructor(private file?: string) {
    this.data =
      file && existsSync(file)
        ? JSON.parse(readFileSync(file, 'utf8'))
        : { users: {}, sessions: {}, rooms: {}, completed: [], recordedRounds: {} };
    this.data.recordedRounds ??= {};
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
}
