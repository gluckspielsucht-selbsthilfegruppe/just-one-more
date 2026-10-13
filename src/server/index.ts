import { resolve } from 'node:path';
import { serve, serveClientBuild } from './serve';

// Built to dist/server; the client bundle sits next to it in dist/client.
const clientDir = resolve(import.meta.dirname, '../client');

await serve((application) => serveClientBuild(application, clientDir));
