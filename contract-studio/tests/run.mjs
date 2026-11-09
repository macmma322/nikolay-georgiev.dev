// Starts a throwaway PostgreSQL (real server binaries, no Docker, no contact
// with any other database on this machine) and runs the suite against it.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

export async function startPostgres(port) {
  const databaseDir = mkdtempSync(join(tmpdir(), 'studio-pg-'));
  const server = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'test-only',
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await server.initialise();
  await server.start();
  return {
    url: `postgres://postgres:test-only@127.0.0.1:${port}/postgres`,
    stop: async () => {
      await server.stop();
      rmSync(databaseDir, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const pg = await startPostgres(54329);
  const child = spawn(
    process.execPath,
    ['--test', '--test-concurrency=4', ...process.argv.slice(2), 'tests/*.test.ts'],
    { stdio: 'inherit', env: { ...process.env, TEST_PG_URL: pg.url } },
  );
  const code = await new Promise((resolve) => child.on('close', resolve));
  await pg.stop();
  process.exit(code ?? 1);
}
