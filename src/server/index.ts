import express from 'express';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { createApplication } from './app';

const production = process.argv.includes('--production');
const port = Number(process.env.PORT ?? 3000);
const application = createApplication({
  dataFile: resolve(process.env.DATA_DIR ?? 'data', 'game.json'),
});
let closeDevelopmentServer: (() => Promise<void>) | undefined;
if (production) {
  application.app.use(express.static(resolve('dist'), { maxAge: '1h' }));
  application.app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, ws: { server: application.server } },
    appType: 'spa',
  });
  closeDevelopmentServer = () => vite.close();
  application.app.use(vite.middlewares);
}
application.server.listen(port, '0.0.0.0', () => {
  console.log(`\n  Just One More → http://localhost:${port}\n`);
  for (const interfaces of Object.values(networkInterfaces()))
    for (const address of interfaces ?? [])
      if (address.family === 'IPv4' && !address.internal)
        console.log(`  Invite friends on your network → http://${address.address}:${port}`);
});
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await closeDevelopmentServer?.();
  await application.close();
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void shutdown();
  });
