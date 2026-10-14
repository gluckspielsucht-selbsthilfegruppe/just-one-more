import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../../src/server/app';
import { serveClientBuild } from '../../src/server/serve';

const directory = mkdtempSync(join(tmpdir(), 'jom-client-'));
const application = createApplication();
let base: string;

beforeAll(async () => {
  mkdirSync(join(directory, 'assets'));
  writeFileSync(join(directory, 'index.html'), '<!doctype html><div id="root"></div>');
  writeFileSync(join(directory, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(directory, 'assets', 'index-Ab12Cd34.js'), `console.log(1);\n`.repeat(400));
  serveClientBuild(application, directory);
  await new Promise<void>((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await application.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('client build', () => {
  it('caches hashed assets for a year and compresses them', async () => {
    const res = await fetch(`${base}/assets/index-Ab12Cd34.js`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('content-encoding')).toBe('gzip');
  });

  it('revalidates index.html for the root and client routes', async () => {
    for (const path of ['/', '/?room=ABCDE', '/some/client/route']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('cache-control')).toBe('no-cache');
      expect(await res.text()).toContain('<div id="root">');
    }
  });

  it('answers missing files with 404 instead of the app shell', async () => {
    const missing = ['/assets/index-old.js', '/assets/', '/missing.png', '/robots.txt'];
    const statuses = await Promise.all(
      missing.map(async (path) => (await fetch(`${base}${path}`)).status),
    );
    expect(statuses).toEqual(missing.map(() => 404));
    expect((await fetch(`${base}/api/unknown`)).status).toBe(404);
  });

  it('serves other public files with a short cache lifetime', async () => {
    const res = await fetch(`${base}/favicon.svg`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });
});
