import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { createApplication } from './app';

export type Application = ReturnType<typeof createApplication>;
type Configure = (
  application: Application,
) => void | (() => Promise<void>) | Promise<void | (() => Promise<void>)>;

export async function serve(configure: Configure) {
  const port = Number(process.env.PORT ?? 3000);
  const application = createApplication({
    dataFile: resolve(process.env.DATA_DIR ?? 'data', 'game.json'),
  });
  const dispose = await configure(application);
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
    await dispose?.();
    await application.close();
    process.exit(0);
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => {
      void shutdown();
    });
}
