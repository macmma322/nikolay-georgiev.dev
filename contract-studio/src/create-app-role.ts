// Creates the restricted role the application runs as, so a bug or injection in
// the app cannot change the schema or rewrite the audit trail. Run once with the
// owner connection; the password comes from the environment and is never printed.
import { createPool, type Queryable } from './db.ts';

export async function createAppRole(db: Queryable, password: string, role = 'studio_app') {
  if (!/^[a-z_]+$/.test(role)) throw new Error('Bad role name');
  const exists = (await db.query('select 1 from pg_roles where rolname = $1', [role])).rowCount;
  const literal = password.replace(/'/g, "''");
  await db.query(
    `${exists ? 'alter' : 'create'} role ${role} with login password '${literal}' nosuperuser nocreatedb nocreaterole`,
  );
  await db.query(`grant usage on schema public to ${role}`);
  await db.query(`grant select, insert, update, delete on all tables in schema public to ${role}`);
  await db.query(`grant usage, select on all sequences in schema public to ${role}`);
  await db.query(`revoke insert, update, delete on schema_migrations from ${role}`);
  await db.query(`revoke update, delete, truncate on audit_logs from ${role}`);
  await db.query(
    `alter default privileges in schema public grant select, insert, update, delete on tables to ${role}`,
  );
  await db.query(
    `alter default privileges in schema public grant usage, select on sequences to ${role}`,
  );
}

if (process.argv[1]?.endsWith('create-app-role.ts')) {
  const url = process.env['MIGRATION_DATABASE_URL'] || process.env['DATABASE_URL'];
  const password = process.env['APP_DB_PASSWORD'];
  if (!url || !password) {
    console.error('Set MIGRATION_DATABASE_URL (owner) and APP_DB_PASSWORD.');
    process.exit(1);
  }
  const db = createPool(url);
  try {
    await createAppRole(db, password);
    console.log('Role studio_app is ready.');
  } catch (error) {
    console.error(`Failed: ${(error as Error).message.replace(/postgres\S+/g, '[url]')}`);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}
