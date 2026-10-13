import { resolve } from 'node:path';
import { serve, serveClientBuild } from '../../src/server/serve';
import { seededRandom } from '../support/random';

// Production client build + real server, with reproducible shuffles and fast bots.
await serve((application) => serveClientBuild(application, resolve('dist/client')), {
  random: seededRandom(Number(process.env.E2E_SEED ?? 7)),
  botDelay: 100,
  disconnectDelay: 2000,
});
