import Database from 'better-sqlite3';
import { constants, mkdirSync, renameSync, rmSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Profile, Room } from '../shared/types';

export interface User extends Profile {
  password?: string;
  salt?: string;
  username?: string;
}
export interface Session {
  userId: string;
  expires: number;
}
interface UserRow {
  id: string;
  name: string;
  color: string;
  theme: string;
  appearance: string;
  account: number;
  username: string | null;
  password_hash: string | null;
  salt: string | null;
  games: number;
  wins: number;
  best_score: number;
  rounds: number;
  best_round: number;
}

// Each entry upgrades the schema by one version; never edit an entry once it has shipped.
const migrations = [
  `CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    theme TEXT NOT NULL,
    appearance TEXT NOT NULL,
    account INTEGER NOT NULL DEFAULT 0,
    username TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    salt TEXT,
    games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    best_score INTEGER NOT NULL DEFAULT 0,
    rounds INTEGER NOT NULL DEFAULT 0,
    best_round INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX sessions_expires_at ON sessions(expires_at);
  CREATE INDEX sessions_user_id ON sessions(user_id);
  CREATE TABLE rooms (
    code TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    state TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE game_progress (
    game_id TEXT PRIMARY KEY,
    recorded_round INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0
  ) STRICT;`,
];

function toUser(row: UserRow): User {
  const user: User = {
    id: row.id,
    name: row.name,
    color: row.color,
    theme: row.theme as User['theme'],
    appearance: row.appearance as User['appearance'],
    account: row.account === 1,
    stats: {
      games: row.games,
      wins: row.wins,
      bestScore: row.best_score,
      rounds: row.rounds,
      bestRound: row.best_round,
    },
  };
  if (row.username !== null) user.username = row.username;
  if (row.password_hash !== null) user.password = row.password_hash;
  if (row.salt !== null) user.salt = row.salt;
  return user;
}
function userParams(user: User) {
  return {
    id: user.id,
    name: user.name,
    color: user.color,
    theme: user.theme,
    appearance: user.appearance,
    account: user.account ? 1 : 0,
    username: user.username ?? null,
    password_hash: user.password ?? null,
    salt: user.salt ?? null,
  };
}
function isCorrupt(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return code === 'SQLITE_NOTADB' || code === 'SQLITE_CORRUPT';
}
function openChecked(file: string) {
  const db = new Database(file);
  try {
    const result = db.pragma('quick_check', { simple: true });
    if (result !== 'ok')
      throw Object.assign(new Error(`Integrity check failed: ${String(result)}`), {
        code: 'SQLITE_CORRUPT',
      });
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
function open(file?: string) {
  if (!file) return new Database(':memory:');
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  try {
    return openChecked(file);
  } catch (error) {
    if (!isCorrupt(error)) throw error;
    const backup = `${file}.corrupt-${Date.now()}`;
    renameSync(file, backup);
    for (const suffix of ['-wal', '-shm']) rmSync(`${file}${suffix}`, { force: true });
    console.error(`Saved data is unreadable; moved it to ${backup} and started empty.`, error);
    return new Database(file);
  }
}
function migrate(db: Database.Database) {
  const version = db.pragma('user_version', { simple: true }) as number;
  for (let next = version; next < migrations.length; next++)
    db.transaction(() => {
      db.exec(migrations[next]);
      db.pragma(`user_version = ${next + 1}`);
    })();
}

export class Store {
  private readonly db: Database.Database;
  private readonly cache = new Map<string, Room>();
  private readonly statements;

  constructor(private readonly file?: string) {
    this.db = open(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    migrate(this.db);
    const db = this.db;
    this.statements = {
      user: db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?'),
      userByUsername: db.prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?'),
      insertUser: db.prepare(
        `INSERT INTO users (id, name, color, theme, appearance, account, username, password_hash, salt, created_at)
         VALUES (@id, @name, @color, @theme, @appearance, @account, @username, @password_hash, @salt, @created_at)`,
      ),
      updateUser: db.prepare(
        `UPDATE users SET name = @name, color = @color, theme = @theme, appearance = @appearance,
         account = @account, username = @username, password_hash = @password_hash, salt = @salt
         WHERE id = @id`,
      ),
      roundStats: db.prepare<[number, number, string]>(
        `UPDATE users SET rounds = rounds + 1, best_round = MAX(best_round, ?),
         best_score = MAX(best_score, ?) WHERE id = ?`,
      ),
      gameStats: db.prepare<[number, number, string]>(
        `UPDATE users SET games = games + 1, wins = wins + ?,
         best_score = MAX(best_score, ?) WHERE id = ?`,
      ),
      orphanedGuests: db.prepare<[], { id: string }>(
        `SELECT id FROM users WHERE account = 0
         AND NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.user_id = users.id)`,
      ),
      deleteUser: db.prepare<[string]>('DELETE FROM users WHERE id = ?'),
      session: db.prepare<[string], { user_id: string; expires_at: number }>(
        'SELECT user_id, expires_at FROM sessions WHERE token_hash = ?',
      ),
      insertSession: db.prepare<[string, string, number]>(
        'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      ),
      deleteSession: db.prepare<[string]>('DELETE FROM sessions WHERE token_hash = ?'),
      deleteExpiredSessions: db.prepare<[number]>('DELETE FROM sessions WHERE expires_at <= ?'),
      rooms: db.prepare<[], { state: string }>('SELECT state FROM rooms'),
      saveRoom: db.prepare<[string, string, string, number]>(
        `INSERT INTO rooms (code, game_id, state, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (code) DO UPDATE SET game_id = excluded.game_id, state = excluded.state,
         updated_at = excluded.updated_at`,
      ),
      deleteRoom: db.prepare<[string]>('DELETE FROM rooms WHERE code = ?'),
      progress: db.prepare<[string], { recorded_round: number; completed: number }>(
        'SELECT recorded_round, completed FROM game_progress WHERE game_id = ?',
      ),
      saveProgress: db.prepare<[string, number, number]>(
        `INSERT INTO game_progress (game_id, recorded_round, completed) VALUES (?, ?, ?)
         ON CONFLICT (game_id) DO UPDATE SET recorded_round = excluded.recorded_round,
         completed = excluded.completed`,
      ),
      progressGames: db.prepare<[], { game_id: string }>('SELECT game_id FROM game_progress'),
      deleteProgress: db.prepare<[string]>('DELETE FROM game_progress WHERE game_id = ?'),
    };
    for (const row of this.statements.rooms.all()) {
      const room = JSON.parse(row.state) as Room;
      for (const p of room.players) if (!p.bot) p.connected = false;
      this.cache.set(room.code, room);
    }
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  getUser(id: string) {
    const row = this.statements.user.get(id);
    return row && toUser(row);
  }
  findUserByUsername(username: string) {
    const row = this.statements.userByUsername.get(username);
    return row && toUser(row);
  }
  insertUser(user: User) {
    this.statements.insertUser.run({ ...userParams(user), created_at: Date.now() });
  }
  /** Saves profile and account fields; stats only change through recordResults. */
  updateUser(user: User) {
    this.statements.updateUser.run(userParams(user));
  }

  getSession(tokenHash: string): Session | undefined {
    const row = this.statements.session.get(tokenHash);
    return row && { userId: row.user_id, expires: row.expires_at };
  }
  createSession(tokenHash: string, userId: string, expires: number) {
    this.statements.insertSession.run(tokenHash, userId, expires);
  }
  deleteSession(tokenHash: string) {
    this.statements.deleteSession.run(tokenHash);
  }

  /** Active rooms live in memory; the database copy is what survives a restart. */
  rooms() {
    return this.cache.values();
  }
  roomCount() {
    return this.cache.size;
  }
  getRoom(code: string) {
    return this.cache.get(code);
  }
  /** Replaces the cached room; call saveRoom (usually via the server's commit) to persist it. */
  setRoom(room: Room) {
    this.cache.set(room.code, room);
  }
  saveRoom(room: Room) {
    this.statements.saveRoom.run(room.code, room.gameId, JSON.stringify(room), room.updatedAt);
  }
  removeRoom(code: string) {
    this.cache.delete(code);
    this.statements.deleteRoom.run(code);
  }

  /** Adds newly finished rounds and games to player stats exactly once. */
  recordResults(room: Room) {
    const progress = this.statements.progress.get(room.gameId);
    const recorded = progress?.recorded_round ?? 0;
    let completed = progress?.completed === 1;
    let latest = recorded;
    for (const round of room.history) {
      if (round.round <= recorded) continue;
      for (const result of round.scores)
        this.statements.roundStats.run(result.score, result.total, result.id);
      latest = Math.max(latest, round.round);
    }
    const finishing = room.phase === 'finished' && !completed;
    if (finishing) {
      for (const player of room.players)
        this.statements.gameStats.run(player.id === room.winnerId ? 1 : 0, player.total, player.id);
      completed = true;
    }
    if (latest > recorded || finishing)
      this.statements.saveProgress.run(room.gameId, latest, completed ? 1 : 0);
  }

  /**
   * Retention: drops expired sessions, guests that can no longer sign in and are not seated,
   * and stat bookkeeping for games that no longer have a room.
   */
  prune(now: number, seatedUserIds: Set<string>, activeGameIds: Set<string>) {
    return this.transaction(() => {
      let changes = this.statements.deleteExpiredSessions.run(now).changes;
      for (const { id } of this.statements.orphanedGuests.all())
        if (!seatedUserIds.has(id)) changes += this.statements.deleteUser.run(id).changes;
      for (const { game_id } of this.statements.progressGames.all())
        if (!activeGameIds.has(game_id)) this.statements.deleteProgress.run(game_id);
      return changes;
    });
  }

  async writable() {
    try {
      this.db.prepare('SELECT 1').get();
      if (this.file) await access(this.file, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  close() {
    if (!this.db.open) return;
    this.transaction(() => {
      for (const room of this.cache.values()) this.saveRoom(room);
    });
    this.db.close();
  }
}
