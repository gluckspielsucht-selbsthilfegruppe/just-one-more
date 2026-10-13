import { createServer } from 'vite';
import { readConfig } from './config';
import { createLogger } from './logger';
import { serve } from './serve';

await serve(
  async (application) => {
    const vite = await createServer({
      server: { middlewareMode: true, ws: { server: application.server } },
      appType: 'spa',
    });
    application.app.use(vite.middlewares);
    return () => vite.close();
  },
  {
    contentSecurityPolicy: false,
    logger: createLogger({ level: readConfig().logLevel, pretty: true }),
  },
);
