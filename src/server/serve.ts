import express from 'express';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { createApplication, type ApplicationOptions } from './app';
import { readConfig } from './config';
import { createLogger } from './logger';

export type Application = ReturnType<typeof createApplication>;
type Configure = (
  application: Application,
) => void | (() => Promise<void>) | Promise<void | (() => Promise<void>)>;

export function serveClientBuild(application: Application, clientDir: string) {
  application.app.use(express.static(clientDir, { maxAge: '1h' }));
  application.app.get('/{*path}', (_req, res) => res.sendFile(resolve(clientDir, 'index.html')));
}

export async function serve(configure: Configure, options: ApplicationOptions = {}) {
  const { port, databaseFile, trustProxy, cookieSecure, logLevel } = readConfig();
  const logger = options.logger ?? createLogger({ level: logLevel });
  const application = createApplication({
    databaseFile,
    trustProxy,
    cookieSecure,
    ...options,
    logger,
  });
  const dispose = await configure(application);
  application.server.listen(port, '0.0.0.0', () => {
    logger.info({ url: `http://localhost:${port}` }, 'Just One More is listening');
    for (const interfaces of Object.values(networkInterfaces()))
      for (const address of interfaces ?? [])
        if (address.family === 'IPv4' && !address.internal)
          logger.info(
            { url: `http://${address.address}:${port}` },
            'Invite friends on your network',
          );
  });
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    logger.info('Shutting down');
    await dispose?.();
    await application.close();
    process.exit(0);
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => {
      void shutdown();
    });
}
