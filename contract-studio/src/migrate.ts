// Runs from Railway's pre-deploy step. Prefers the owner role when the app runs
// under a restricted one (docs/contract-studio/06-railway-deployment.md).
import { createAppRole } from './create-app-role.ts';
import { createPool, migrate } from './db.ts';
import { seedTemplates } from './templates.ts';

const url = process.env['MIGRATION_DATABASE_URL'] || process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL is not set; nothing was migrated.');
  process.exit(1);
}
const db = createPool(url);
try {
  const applied = await migrate(db);
  const seeded = await seedTemplates(db);
  console.log(`Migrations applied: ${applied.length}. Template versions added: ${seeded}.`);
  const appPassword = process.env['APP_DB_PASSWORD'];
  if (appPassword) {
    await createAppRole(db, appPassword);
    console.log('Application role studio_app configured.');
  }
} catch (error) {
  // pg errors can quote the connection string; print the reason only.
  console.error(`Migration failed: ${(error as Error).message.replace(/postgres\S+/g, '[url]')}`);
  process.exitCode = 1;
} finally {
  await db.end();
}
