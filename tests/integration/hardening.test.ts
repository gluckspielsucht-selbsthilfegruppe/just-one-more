import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createApplication, type ApplicationOptions } from '../../src/server/app';
import { createRoom, DEFAULT_SETTINGS, makePlayer } from '../../src/shared/engine';

type Application = ReturnType<typeof createApplication>;
let running: { application: Application; directory?: string }[] = [];

async function start(options: ApplicationOptions = {}) {
  const application = createApplication(options);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  running.push({ application });
  return { application, base: `http://127.0.0.1:${address.port}` };
}
function tempDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'jom-hardening-'));
  running.push({ application: undefined as never, directory });
  return directory;
}
function post(base: string, path: string, body: string, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}
async function guest(base: string, name: string) {
  const res = await post(base, 'session', JSON.stringify({ name }));
  return res.headers.get('set-cookie')!.split(';')[0];
}
async function authAttempts(base: string, count: number, ip: (i: number) => string) {
  const statuses: number[] = [];
  for (let i = 0; i < count; i++)
    statuses.push((await post(base, 'auth/login', '{}', { 'X-Forwarded-For': ip(i) })).status);
  return statuses;
}
function socket(base: string, cookie: string, origin = base) {
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`, {
    headers: { Cookie: cookie, Origin: origin },
  });
  const messages: { type: string; id?: string }[] = [];
  ws.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
  ws.on('error', () => {});
  return { ws, messages };
}
async function until(check: () => boolean, timeout = 4000) {
  const end = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > end) throw new Error('Condition not met in time.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
const runningAsRoot = process.getuid?.() === 0;

afterEach(async () => {
  const directories = running.flatMap(({ directory }) => (directory ? [directory] : []));
  for (const directory of directories) chmodSync(directory, 0o700);
  for (const { application } of running.reverse()) if (application) await application.close();
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
  running = [];
});

describe('security headers', () => {
  it('sends CSP, isolation, and permissions headers but no HSTS over plain HTTP', async () => {
    const { base } = await start();
    const res = await fetch(`${base}/api/health`);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(res.headers.get('permissions-policy')).toContain('camera=()');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  it('can disable CSP for the development server', async () => {
    const { base } = await start({ contentSecurityPolicy: false });
    const res = await fetch(`${base}/api/health`);
    expect(res.headers.get('content-security-policy')).toBeNull();
  });
});

describe('client IP and HTTPS behind a proxy', () => {
  it('ignores forwarded headers unless the proxy is trusted', async () => {
    const { base } = await start();
    const statuses = await authAttempts(base, 11, (i) => `203.0.113.${i}`);
    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses[10]).toBe(429);
    const res = await post(base, 'session', JSON.stringify({ name: 'Alice' }), {
      'X-Forwarded-Proto': 'https',
    });
    expect(res.headers.get('set-cookie')).not.toMatch(/Secure/i);
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  it('rate-limits each forwarded client separately when the proxy is trusted', async () => {
    const { base } = await start({ trustProxy: 'loopback' });
    const first = await authAttempts(base, 11, () => '203.0.113.1');
    expect(first[10]).toBe(429);
    const other = await authAttempts(base, 1, () => '203.0.113.2');
    expect(other[0]).toBe(400);
  });

  it('marks cookies Secure and sends HSTS for HTTPS forwarded by a trusted proxy', async () => {
    const { base } = await start({ trustProxy: 'loopback' });
    const res = await post(base, 'session', JSON.stringify({ name: 'Alice' }), {
      'X-Forwarded-Proto': 'https',
    });
    expect(res.headers.get('set-cookie')).toMatch(/; Secure/i);
    expect(res.headers.get('strict-transport-security')).toBe('max-age=31536000');
  });

  it('lets COOKIE_SECURE override the detected protocol', async () => {
    const forced = await start({ cookieSecure: true });
    const secure = await post(forced.base, 'session', JSON.stringify({ name: 'Alice' }));
    expect(secure.headers.get('set-cookie')).toMatch(/; Secure/i);
    const disabled = await start({ trustProxy: 'loopback', cookieSecure: false });
    const plain = await post(disabled.base, 'session', JSON.stringify({ name: 'Bob' }), {
      'X-Forwarded-Proto': 'https',
    });
    expect(plain.headers.get('set-cookie')).not.toMatch(/Secure/i);
  });
});

describe('error handling', () => {
  it('answers malformed and oversized JSON with client errors', async () => {
    const { base } = await start();
    const malformed = await post(base, 'session', '{"name":');
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'The request could not be processed.' });
    const oversized = await post(base, 'session', JSON.stringify({ name: 'x'.repeat(9000) }));
    expect(oversized.status).toBe(413);
  });

  it('rejects null and malformed origins without a server error', async () => {
    const { base } = await start();
    for (const origin of ['null', 'not a url', 'https://evil.example'])
      expect((await post(base, 'session', '{}', { Origin: origin })).status).toBe(403);
  });

  it('refuses WebSocket upgrades from a null origin and keeps serving', async () => {
    const { base } = await start();
    const cookie = await guest(base, 'Alice');
    const { ws } = socket(base, cookie, 'null');
    await new Promise((resolve) => ws.once('close', resolve));
    expect((await fetch(`${base}/api/health`)).status).toBe(200);
  });

  it.skipIf(runningAsRoot)(
    'returns 500 for unexpected failures and reports not ready when storage is read-only',
    async () => {
      const directory = tempDirectory();
      const { base } = await start({ dataFile: join(directory, 'game.json') });
      expect((await fetch(`${base}/api/ready`)).status).toBe(200);
      chmodSync(directory, 0o500);
      const ready = await fetch(`${base}/api/ready`);
      expect(ready.status).toBe(503);
      expect(await ready.json()).toEqual({ ok: false });
      const failed = await post(base, 'session', JSON.stringify({ name: 'Alice' }));
      expect(failed.status).toBe(500);
      expect(((await failed.json()) as { error: string }).error).toMatch(/on our side/);
    },
  );
});

describe('persisted data', () => {
  it.each([
    ['not JSON', 'not json at all'],
    ['the wrong shape', JSON.stringify({ users: [], sessions: 'x' })],
  ])('moves a snapshot with %s aside and starts empty', async (_label, content) => {
    const directory = tempDirectory();
    const dataFile = join(directory, 'game.json');
    writeFileSync(dataFile, content);
    const { application, base } = await start({ dataFile });
    expect(application.store.data.users).toEqual({});
    expect(readdirSync(directory).some((f) => f.startsWith('game.json.corrupt-'))).toBe(true);
    expect((await fetch(`${base}/api/bootstrap`)).status).toBe(200);
  });

  it('cleans up expired sessions and stale unoccupied rooms and persists the result', async () => {
    const directory = tempDirectory();
    const dataFile = join(directory, 'game.json');
    const { application, base } = await start({ dataFile });
    await guest(base, 'Alice');
    const store = application.store;
    for (const session of Object.values(store.data.sessions)) session.expires = Date.now() - 1;
    const stale = createRoom('OLD22', 'Old', makePlayer('ghost', 'Ghost'), DEFAULT_SETTINGS);
    stale.updatedAt = Date.now() - 2 * 86400000;
    store.data.rooms[stale.code] = stale;
    application.cleanup();
    expect(store.data.sessions).toEqual({});
    expect(store.data.rooms).toEqual({});
    const saved = JSON.parse(readFileSync(dataFile, 'utf8'));
    expect(saved.sessions).toEqual({});
    expect(saved.rooms).toEqual({});
  });
});

describe('WebSocket error refreshes', () => {
  it('sends the refreshed state only to the client whose command failed', async () => {
    const { base } = await start();
    const a = socket(base, await guest(base, 'Alice'));
    const b = socket(base, await guest(base, 'Bob'));
    await until(() => a.messages.length > 0 && b.messages.length > 0);
    await until(() => a.messages.length >= 2);
    const seenByB = b.messages.length;
    a.messages.length = 0;
    a.ws.send(JSON.stringify({ id: 'invalid-command', type: 'bogus' }));
    await until(() => a.messages.some((m) => m.type === 'error'));
    await until(() => a.messages.some((m) => m.type === 'state'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(b.messages.length).toBe(seenByB);
    a.ws.close();
    b.ws.close();
  });
});
