import { chownSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { serve } from '@hono/node-server';
import { createAnthropic } from './ai.ts';
import { createApp } from './app.ts';
import { housekeeping } from './auth.ts';
import { loadConfig } from './config.ts';
import { getSettings } from './contracts.ts';
import { createPool } from './db.ts';

const config = loadConfig();
mkdirSync(config.documentDir, { recursive: true });
// Railway mounts volumes as root: claim it, then run as the unprivileged user.
if (process.getuid?.() === 0) {
  chownSync(dirname(config.documentDir), 1000, 1000);
  chownSync(config.documentDir, 1000, 1000);
  process.setgid?.(1000);
  process.setuid?.(1000);
}
const db = createPool(config.databaseUrl);

const tidy = () =>
  getSettings(db)
    .then((settings) => housekeeping(db, settings.retention_days))
    .catch((error: Error) =>
      console.error(JSON.stringify({ event: 'housekeeping_failed', name: error.name })),
    );
void tidy();
const timer = setInterval(tidy, 6 * 60 * 60 * 1000);

const app = createApp({ db, config, anthropic: createAnthropic(config) });
const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, () =>
  console.log(
    JSON.stringify({ event: 'listening', port: config.port, ai: Boolean(config.anthropicApiKey) }),
  ),
);

const stop = () => {
  clearInterval(timer);
  server.close(() => void db.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 8000).unref();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
