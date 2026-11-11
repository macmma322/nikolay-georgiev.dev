// Real Chromium, real passkey ceremony (virtual authenticator), real PostgreSQL,
// the real server and SDK. Only api.anthropic.com is replaced by the local mock.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startMock } from '../mock-anthropic.mjs';
import { startPostgres } from '../run.mjs';

const PORT = 18787;
const pg = await startPostgres(Number(process.env.E2E_PG_PORT ?? 25433));
const mock = await startMock();
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(PORT),
  DATABASE_URL: pg.url,
  APP_ORIGIN: `http://localhost:${PORT}`,
  RP_ID: 'localhost',
  PROXY_SHARED_SECRET: '',
  SETUP_TOKEN: 'e2e-setup-token',
  DOCUMENT_DIR: mkdtempSync(join(tmpdir(), 'studio-e2e-')),
  ANTHROPIC_API_KEY: 'sk-e2e-fake',
  ANTHROPIC_BASE_URL: mock.url,
  CLAUDE_REQUESTS_PER_MINUTE: '1000',
};
const run = (args) =>
  new Promise((resolve) =>
    spawn(process.execPath, args, { stdio: 'inherit', env }).on('close', (code) =>
      resolve(code ?? 1),
    ),
  );

let code = await run(['src/migrate.ts']);
const server = spawn(process.execPath, ['src/server.ts'], { stdio: 'inherit', env });
if (code === 0) {
  for (let i = 0; i < 50; i += 1) {
    if (
      await fetch(`http://localhost:${PORT}/healthz`).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const cli = join('node_modules', '@playwright', 'test', 'cli.js');
  code = await run([
    cli,
    'test',
    '-c',
    'tests/e2e/playwright.config.mjs',
    ...process.argv.slice(2),
  ]);
}
server.kill();
await mock.stop();
await pg.stop();
process.exit(code);
