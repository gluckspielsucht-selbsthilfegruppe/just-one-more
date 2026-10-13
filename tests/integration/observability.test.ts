import { Writable } from 'node:stream';
import { pino } from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createApplication, type ApplicationOptions } from '../../src/server/app';
import { createMetricsServer } from '../../src/server/metrics';

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

describe('metrics', () => {
  it('reports connections, rooms, commands, and responses on a separate listener only', async () => {
    const { application, base } = await start();
    const metricsServer = createMetricsServer(application.metrics);
    await new Promise<void>((resolve) => metricsServer.listen(0, '127.0.0.1', resolve));
    const address = metricsServer.address();
    if (!address || typeof address === 'string') throw new Error('No metrics address');
    try {
      const cookie = (await post(base, 'session', { name: 'Alice' })).headers
        .get('set-cookie')!
        .split(';')[0];
      const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`, {
        headers: { Cookie: cookie, Origin: base },
      });
      const replies: { type: string; id?: string }[] = [];
      ws.on('message', (raw) => replies.push(JSON.parse(raw.toString())));
      await new Promise((resolve) => ws.once('open', resolve));
      ws.send(JSON.stringify({ id: 'create-table', type: 'create', payload: { name: 'Metrics' } }));
      ws.send(JSON.stringify({ id: 'unknown-type', type: 'bogus' }));
      await vi.waitFor(() => expect(replies.filter((m) => m.id)).toHaveLength(2));

      const res = await fetch(`http://127.0.0.1:${address.port}/metrics`);
      expect(res.headers.get('content-type')).toContain('text/plain');
      const text = await res.text();
      expect(text).toContain('jom_websocket_connections 1');
      expect(text).toContain('jom_rooms{phase="lobby"} 1');
      expect(text).toContain('jom_commands_total{result="ok"} 1');
      expect(text).toContain('jom_commands_total{result="rejected"} 1');
      expect(text).toMatch(/jom_http_responses_total\{status="2xx"\} [1-9]/);
      expect(text).toContain('# TYPE jom_commands_total counter');
      expect((await fetch(`http://127.0.0.1:${address.port}/other`)).status).toBe(404);
      expect((await fetch(`${base}/metrics`)).status).not.toBe(200);
      expect((await fetch(`${base}/api/metrics`)).status).toBe(404);
      ws.close();
    } finally {
      metricsServer.close();
    }
  });
});
