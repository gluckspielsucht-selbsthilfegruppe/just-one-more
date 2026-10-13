import { Writable } from 'node:stream';
import { pino } from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApplication, type ApplicationOptions } from '../../src/server/app';

type Application = ReturnType<typeof createApplication>;
type Line = {
  level: number;
  msg: string;
  req?: { id: string; url: string };
  [key: string]: unknown;
};
const running: Application[] = [];

afterEach(async () => {
  for (const application of running.splice(0)) await application.close();
});
function capture() {
  const lines: Line[] = [];
  const raw: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      raw.push(chunk.toString());
      lines.push(JSON.parse(chunk.toString()));
      done();
    },
  });
  return { logger: pino({ level: 'debug' }, stream), lines, raw };
}
async function start(options: ApplicationOptions = {}) {
  const application = createApplication(options);
  running.push(application);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  return { application, base: `http://127.0.0.1:${address.port}` };
}
function post(base: string, path: string, body: unknown, cookie?: string) {
  return fetch(`${base}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe('structured logging', () => {
  it('logs API requests as JSON with a request ID and without cookies or tokens', async () => {
    const { logger, lines, raw } = capture();
    const { base } = await start({ logger });
    const res = await post(base, 'session', { name: 'Alice' });
    const cookie = res.headers.get('set-cookie')!.split(';')[0];
    await fetch(`${base}/api/bootstrap`, { headers: { Cookie: cookie } });
    await fetch(`${base}/api/health`);
    const requestId = res.headers.get('x-request-id');
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    const entry = lines.find((line) => line.req?.id === requestId)!;
    expect(entry).toMatchObject({
      msg: 'request completed',
      req: { method: 'POST', url: '/api/session' },
      res: { statusCode: 200 },
    });
    expect(lines.some((line) => line.req?.url === '/api/health')).toBe(false);
    const token = cookie.split('=')[1];
    expect(raw.join('')).not.toContain(token);
    expect(raw.join('').toLowerCase()).not.toContain('cookie');
  });

  it('logs unexpected failures as errors with the request ID', async () => {
    const { logger, lines } = capture();
    const { application, base } = await start({ logger });
    vi.spyOn(application.store, 'insertUser').mockImplementation(() => {
      throw new Error('disk I/O error');
    });
    const res = await post(base, 'session', { name: 'Alice' });
    expect(res.status).toBe(500);
    const failure = lines.find((line) => line.msg === 'Request failed')!;
    expect(failure.level).toBe(50);
    expect(failure.req?.id).toBe(res.headers.get('x-request-id'));
  });
});
