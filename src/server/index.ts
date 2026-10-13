import express from 'express';
import { resolve } from 'node:path';
import { serve } from './serve';

// Built to dist/server; the client bundle sits next to it in dist/client.
const clientDir = resolve(import.meta.dirname, '../client');

await serve((application) => {
  application.app.use(express.static(clientDir, { maxAge: '1h' }));
  application.app.get('/{*path}', (_req, res) => res.sendFile(resolve(clientDir, 'index.html')));
});
