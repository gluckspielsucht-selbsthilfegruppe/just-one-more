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
}
export class Store {
  data: Database;
  constructor(private file?: string) {
    this.data =
      file && existsSync(file)
        ? JSON.parse(readFileSync(file, 'utf8'))
        : { users: {}, sessions: {}, rooms: {}, completed: [] };
    for (const user of Object.values(this.data.users)) user.appearance ??= 'neon';
    for (const room of Object.values(this.data.rooms)) {
      room.departedIds ??= [];
      for (const p of room.players) if (!p.bot) p.connected = false;
    }
    for (const [token, session] of Object.entries(this.data.sessions))
      if (session.expires < Date.now()) delete this.data.sessions[token];
  }
  save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.data), { mode: 0o600 });
    renameSync(`${this.file}.tmp`, this.file);
  }
}
