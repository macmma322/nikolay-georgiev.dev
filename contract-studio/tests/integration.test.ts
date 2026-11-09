import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  approveCurrent,
  createContract,
  getContract,
  getVersion,
  prepareAdditionalAgreement,
  Rejected,
  saveManualVersion,
  transition,
} from '../src/contracts.ts';
import { many, migrate, one, type Db } from '../src/db.ts';
import { seedTemplates } from '../src/templates.ts';
import { completeTerms, fixtures, freshDb } from './helpers.ts';

let db: Db;
let drop: () => Promise<void>;
before(async () => ({ db, drop } = await freshDb()));
after(() => drop());

const fill = (id: string) =>
  saveManualVersion(db, id, {
    contract_date: '2026-12-01',
    place: 'Варна',
    terms: completeTerms as never,
    clauses: [],
  });

const readyAndApprove = async (id: string) => {
  await transition(db, id, 'ready_for_review');
  await approveCurrent(db, id, 'ok');
};

test('migrations and template seeding are repeatable', async () => {
  assert.deepEqual(await migrate(db), []);
  assert.equal(await seedTemplates(db), 0);
  const tables = await many(
    db,
    "select table_name from information_schema.tables where table_schema = 'public'",
  );
  for (const name of [
    'clients',
    'projects',
    'contracts',
    'contract_versions',
    'ai_messages',
    'audit_logs',
  ]) {
    assert.ok(
      tables.some((t) => t['table_name'] === name),
      name,
    );
  }
});

test('an edited, already-applied migration stops the run', async () => {
  await db.query(
    "update schema_migrations set sha256 = repeat('0', 64) where name = '0001_init.sql'",
  );
  await assert.rejects(migrate(db), /edited/);
  const real = (await import('node:crypto')).createHash('sha256');
  const { readFile } = await import('node:fs/promises');
  real.update(
    (await readFile(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8')).replace(
      /\r\n/g,
      '\n',
    ),
  );
  await db.query("update schema_migrations set sha256 = $1 where name = '0001_init.sql'", [
    real.digest('hex'),
  ]);
});

test('the application role can run the app but not change the schema or the audit trail', async () => {
  const { createAppRole } = await import('../src/create-app-role.ts');
  const { createPool } = await import('../src/db.ts');
  await createAppRole(db, "pa'ss-word");
  await createAppRole(db, "pa'ss-word"); // repeatable
  const url = new URL(
    (await db.query('select current_database() as d')).rows[0].d,
    process.env['TEST_PG_URL']!.replace(/postgres$/, ''),
  );
  url.username = 'studio_app';
  url.password = "pa'ss-word";
  const app = createPool(url.href);
  try {
    assert.ok((await app.query('select count(*) from clients')).rows[0]);
    await app.query("insert into audit_logs (action) values ('role.test')");
    await assert.rejects(app.query('drop table clients'), /must be owner/);
    await assert.rejects(app.query('alter table clients add column x int'), /must be owner/);
    await assert.rejects(app.query('delete from audit_logs'), /permission denied/);
    await assert.rejects(app.query("update audit_logs set action = 'x'"), /permission denied/);
    await assert.rejects(app.query('delete from schema_migrations'), /permission denied/);
  } finally {
    await app.end();
  }
});

test('database constraints hold', async () => {
  await assert.rejects(db.query("insert into clients (kind, name) values ('robot', 'x')"));
  await assert.rejects(
    db.query("insert into projects (client_id, title) values (gen_random_uuid(), 'x')"),
  );
  const { clientId, contract } = await fixtures(db);
  await assert.rejects(
    db.query('insert into projects (client_id, title, price) values ($1, $2, -1)', [clientId, 'x']),
  );
  await assert.rejects(
    db.query("update contracts set status = 'whatever' where id = $1", [contract.id]),
  );
  await assert.rejects(
    db.query('delete from clients where id = $1', [clientId]),
    'clients with contracts stay',
  );
});

test('client, project and contract round trip', async () => {
  const { clientId, projectId, contract } = await fixtures(db);
  const stored = await getContract(db, contract.id);
  assert.equal(stored?.client_id, clientId);
  assert.equal(stored?.project_id, projectId);
  assert.equal(stored?.status, 'draft');
  assert.match(stored!.reference, /^CS-\d{4}-\d{4}$/);
  const version = await getVersion(db, contract.id, 1);
  assert.equal(version?.source, 'template');
  assert.equal(version?.content.client.name, 'Примерна Фирма ЕООД');
  assert.equal(version?.content.contractor.kind, 'individual');
  assert.equal(version?.content.terms.price_amount, 2500);
  assert.equal(
    version?.content.clauses.every((c) => c.review_status === 'unreviewed'),
    true,
  );
  assert.match(version!.content_sha256, /^[0-9a-f]{64}$/);
});

test('a project of another client cannot be attached', async () => {
  const a = await fixtures(db);
  const b = await fixtures(db);
  await assert.rejects(
    createContract(db, {
      clientId: a.clientId,
      projectId: b.projectId,
      templateKey: 'software-development',
      lang: 'bg',
    }),
    Rejected,
  );
});

test('saving creates a new version and keeps the old one', async () => {
  const { contract } = await fixtures(db);
  const v2 = await fill(contract.id);
  assert.equal(v2.version, 2);
  assert.equal((await getContract(db, contract.id))?.current_version, 2);
  assert.equal((await getVersion(db, contract.id, 1))?.content.contract_date, undefined);
  assert.equal(v2.content.contract_date, '2026-12-01');
  assert.equal(v2.content.client.name, 'Примерна Фирма ЕООД');
});

test('approval is blocked while facts are missing', async () => {
  const { contract } = await fixtures(db);
  await transition(db, contract.id, 'ready_for_review');
  await assert.rejects(approveCurrent(db, contract.id, undefined), /Missing/);
  assert.equal((await getContract(db, contract.id))?.status, 'ready_for_review');
});

test('approval needs the review status first', async () => {
  const { contract } = await fixtures(db);
  await fill(contract.id);
  await assert.rejects(approveCurrent(db, contract.id, undefined), /ready for review/);
});

test('editing after approval starts a new draft; the approved version is untouched', async () => {
  const { contract } = await fixtures(db);
  await fill(contract.id);
  await readyAndApprove(contract.id);
  const approved = await getVersion(db, contract.id, 2);
  assert.equal(approved?.approval_state, 'approved');
  const v3 = await saveManualVersion(db, contract.id, {
    terms: { ...completeTerms, price_amount: 9999 } as never,
    clauses: [],
  });
  const after = await getVersion(db, contract.id, 2);
  assert.deepEqual(after?.content, approved?.content);
  assert.equal(after?.content_sha256, approved?.content_sha256);
  assert.equal(v3.approval_state, 'draft');
  const row = await getContract(db, contract.id);
  assert.equal(row?.status, 'draft');
  assert.equal(row?.approved_version, 2);
});

test('the database itself refuses to alter or delete an approved version', async () => {
  const { contract } = await fixtures(db);
  await fill(contract.id);
  await readyAndApprove(contract.id);
  await assert.rejects(
    db.query("update contract_versions set content = '{}' where contract_id = $1 and version = 2", [
      contract.id,
    ]),
    /immutable/,
  );
  await assert.rejects(
    db.query(
      "update contract_versions set approval_state = 'draft', approved_at = null where contract_id = $1 and version = 2",
      [contract.id],
    ),
    /immutable/,
  );
  await assert.rejects(
    db.query('delete from contract_versions where contract_id = $1 and version = 2', [contract.id]),
    /cannot be deleted/,
  );
  await assert.rejects(
    db.query("update contract_versions set content = '{}' where contract_id = $1 and version = 1", [
      contract.id,
    ]),
    /immutable/,
    'drafts are append-only too',
  );
});

test('signed contracts are frozen', async () => {
  const { contract } = await fixtures(db);
  await fill(contract.id);
  await readyAndApprove(contract.id);
  await transition(db, contract.id, 'sent');
  await transition(db, contract.id, 'signed');
  const row = await getContract(db, contract.id);
  assert.equal(row?.signature_status, 'signed');
  await assert.rejects(
    saveManualVersion(db, contract.id, { terms: completeTerms as never, clauses: [] }),
    /additional agreement/,
  );
});

test('illegal status jumps are refused and audited moves are recorded', async () => {
  const { contract } = await fixtures(db);
  await assert.rejects(transition(db, contract.id, 'signed'), /cannot go from/);
  await transition(db, contract.id, 'needs_information');
  const audit = await many(
    db,
    "select detail from audit_logs where action = 'contract.status' and entity_id = $1",
    [contract.id],
  );
  assert.equal(audit.length, 1);
});

test('the audit log never holds contract text', async () => {
  const { contract } = await fixtures(db);
  await fill(contract.id);
  const rows = await many(db, 'select detail from audit_logs where entity_id = $1', [contract.id]);
  assert.ok(rows.length >= 2);
  assert.doesNotMatch(JSON.stringify(rows), /Изработка на платформа|Примерна Фирма/);
});

test('a change request becomes an additional agreement and the original stays intact', async () => {
  const { contract } = await fixtures(db);
  await fill(contract.id);
  await readyAndApprove(contract.id);
  const before = await getVersion(db, contract.id, 2);
  const cr = await one<{ id: string }>(
    db,
    `insert into change_requests (contract_id, title, description, classification, reasoning, proposed_deliverables)
     values ($1, 'AI', 'Нова AI функция', 'excluded', 'Извън обхвата', '["AI асистент"]') returning id`,
    [contract.id],
  );
  const additional = await prepareAdditionalAgreement(db, cr!.id, {
    price: 800,
    delivery_date: '2027-04-01',
  });
  assert.equal(additional.parent_contract_id, contract.id);
  const content = (await getVersion(db, additional.id, 1))!.content;
  assert.equal(content.template_key, 'additional-agreement');
  assert.equal(content.parent?.reference, contract.reference);
  assert.equal(content.change?.price, 800);
  assert.deepEqual(content.change?.deliverables, ['AI асистент']);
  const after = await getVersion(db, contract.id, 2);
  assert.deepEqual(after?.content, before?.content);
  assert.equal((await getContract(db, contract.id))?.current_version, 2);
  await assert.rejects(prepareAdditionalAgreement(db, cr!.id, {}), /already prepared/);
});

test('a later profile change does not rewrite earlier contracts', async () => {
  const { contract, clientId } = await fixtures(db);
  await db.query(`update settings set data = jsonb_set(data, '{profile}', $1::jsonb)`, [
    JSON.stringify({
      legal_name: 'Иван',
      status: 'eood',
      company_name: 'Нова Компания ЕООД',
      eik: '111222333',
    }),
  ]);
  const later = await createContract(db, {
    clientId,
    templateKey: 'software-development',
    lang: 'bg',
  });
  assert.equal((await getVersion(db, later.id, 1))?.content.contractor.name, 'Нова Компания ЕООД');
  assert.equal((await getVersion(db, contract.id, 1))?.content.contractor.name, 'Тест Тестов');
  await db.query(`update settings set data = jsonb_set(data, '{profile}', $1::jsonb)`, [
    JSON.stringify({ legal_name: 'Тест Тестов', address: 'гр. Варна' }),
  ]);
});
