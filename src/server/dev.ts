import { createServer } from 'vite';
import { serve } from './serve';

await serve(async (application) => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: { server: application.server } },
    appType: 'spa',
  });
  application.app.use(vite.middlewares);
  return () => vite.close();
});
