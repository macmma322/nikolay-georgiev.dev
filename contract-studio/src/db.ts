import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// DATE stays a YYYY-MM-DD string: a JS Date would shift it across time zones.
pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(20, Number);

export type Db = pg.Pool;
export type Tx = pg.PoolClient;
export type Queryable = Db | Tx;

export const createPool = (connectionString: string): Db =>
  new pg.Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

export async function tx<T>(db: Db, work: (client: Tx) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export const one = async <T extends pg.QueryResultRow>(
  db: Queryable,
  sql: string,
  values: unknown[] = [],
): Promise<T | undefined> => (await db.query<T>(sql, values)).rows[0];

export const many = async <T extends pg.QueryResultRow>(
  db: Queryable,
  sql: string,
  values: unknown[] = [],
): Promise<T[]> => (await db.query<T>(sql, values)).rows;

export const audit = (
  db: Queryable,
  action: string,
  entityType: string | null,
  entityId: string | null,
  detail: Record<string, unknown> = {},
  ip: string | null = null,
) =>
  db.query(
    'insert into audit_logs (action, entity_type, entity_id, detail, ip) values ($1, $2, $3, $4, $5)',
    [action, entityType, entityId, detail, ip],
  );

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));

// Forward-only, in order, one transaction per file, under an advisory lock so
// two deploys cannot race. An edited, already-applied file stops the run.
export async function migrate(db: Db, dir = MIGRATIONS): Promise<string[]> {
  const client = await db.connect();
  const applied: string[] = [];
  try {
    await client.query('select pg_advisory_lock(727001)');
    await client.query(`create table if not exists schema_migrations (
      name text primary key, sha256 char(64) not null, applied_at timestamptz not null default now()
    )`);
    const done = new Map(
      (await client.query('select name, sha256 from schema_migrations')).rows.map((row) => [
        row.name as string,
        row.sha256 as string,
      ]),
    );
    for (const name of (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()) {
      const sql = await readFile(join(dir, name), 'utf8');
      const sha = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      if (done.has(name)) {
        if (done.get(name) !== sha) throw new Error(`Applied migration was edited: ${name}`);
        continue;
      }
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (name, sha256) values ($1, $2)', [
          name,
          sha,
        ]);
        await client.query('commit');
        applied.push(name);
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${name} failed: ${(error as Error).message}`);
      }
    }
    return applied;
  } finally {
    await client.query('select pg_advisory_unlock(727001)').catch(() => {});
    client.release();
  }
}
