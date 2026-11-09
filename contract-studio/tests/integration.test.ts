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
import { completeTerms, fixtures, freshDb, harness, testConfig } from './helpers.ts';

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
    const { contract } = await fixtures(db);
    await fill(contract.id);
    await readyAndApprove(contract.id);
    const client = await app.connect();
    try {
      await client.query('begin');
      await client.query("set local studio.allow_purge = 'on'");
      await assert.rejects(
        client.query('delete from contract_versions where contract_id = $1 and version = 2', [
          contract.id,
        ]),
        /approved contract versions cannot be deleted/,
      );
      await client.query('rollback');
    } finally {
      client.release();
    }
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

test('for each of the 6 templates, over HTTP: create with a parent, fill, move to ready for review, approve, export PDF', async () => {
  const config = testConfig();
  const h = harness(db, config);
  await h.login();
  const { clientId, contract: parent } = await fixtures(db);
  // Approve parent so it can serve as a completed parent reference
  await fill(parent.id);
  await readyAndApprove(parent.id);

  const templates = [
    'software-development',
    'it-services',
    'additional-agreement',
    'acceptance-protocol',
    'payment-settlement',
    'technical-annex',
  ];

  for (const templateKey of templates) {
    // 1. Create with parent over HTTP
    const createRes = await h.call('/documents', {
      form: {
        client_id: clientId,
        parent_id: parent.id,
        template_key: templateKey,
        lang: 'bg',
      },
    });
    assert.equal(createRes.status, 303, `Create status for ${templateKey}`);
    const location = createRes.headers.get('location') ?? '';
    const id = location.split('/').pop()!;
    assert.ok(id, `Location had contract id for ${templateKey}`);

    // Verify parent is linked
    const loaded = await getContract(db, id);
    assert.equal(loaded?.parent_contract_id, parent.id, `Parent linked for ${templateKey}`);

    // 2. Fill over HTTP
    const saveRes = await h.call(`/documents/${id}/save`, {
      form: {
        title: `Договор ${templateKey}`,
        contract_date: '2026-12-01',
        place: 'Варна',
        project_title: 'Проект за тестване',
        project_description: 'Описание на проекта',
        scope_summary: 'Резюме на обхвата',
        deliverables: 'Сайт\nАдмин панел',
        exclusions: 'Мобилно приложение',
        acceptance_criteria: 'Работи без грешки',
        start_date: '2026-12-01',
        delivery_date: '2027-03-01',
        price_amount: '2500',
        currency: 'EUR',
        price_basis: 'бруто',
        payment_schedule: 'Аванс | 1000 | при подписване\nФинално плащане | 1500 | при приемане',
        payment_days: '10',
        acceptance_days: '7',
        revision_rounds: '2',
        warranty_days: '30',
        notice_days: '14',
        additional_work_rate: '40 EUR на час',
        liability_cap: 'размера на възнаграждението',
        dispute_forum: 'компетентния български съд',
        support_terms: 'Не е включена',
        hosting_terms: 'За сметка на клиента',
        ip_terms: 'прехвърляне след пълно плащане',
        change_description: 'Описание на промяната или забележки',
        change_deliverables: 'Допълнителна функция',
        change_price: '500',
        change_delivery_date: '2027-04-01',
        settlement_amount: '1500',
        settlement_due_date: '2027-05-01',
        settlement_reason: 'Приключване на договора',
        settlement_instalments: 'Първа вноска\nВтора вноска',
      },
    });
    assert.equal(saveRes.status, 303, `Save status for ${templateKey}`);

    // 3. Move to ready for review over HTTP
    const readyRes = await h.call(`/documents/${id}/status`, {
      form: { to: 'ready_for_review' },
    });
    assert.equal(readyRes.status, 303, `Ready for review for ${templateKey}`);

    // 4. Approve over HTTP
    const approveRes = await h.call(`/documents/${id}/approve`, {
      form: { note: 'Одобрен' },
    });
    assert.equal(approveRes.status, 303, `Approve for ${templateKey}`);

    // 5. Export PDF over HTTP
    const exportRes = await h.call(`/documents/${id}/export/2/pdf`);
    assert.equal(exportRes.status, 200, `Export status for ${templateKey}`);
    assert.equal(exportRes.headers.get('content-type'), 'application/pdf');
    const bytes = new Uint8Array(await exportRes.arrayBuffer());
    assert.ok(bytes.length > 1000, `PDF size for ${templateKey}`);

    const contractAfter = await getContract(db, id);
    assert.equal(contractAfter?.status, 'exported', `Final status for ${templateKey}`);
  }
});

test('migration failure against an unreachable database exits non-zero and prints no connection string', async () => {
  const { spawn } = await import('node:child_process');
  const secretUrl = 'postgres://app_user:super_secret_password_123@127.0.0.1:54399/fake_db';
  const child = spawn(process.execPath, ['src/migrate.ts'], {
    env: { ...process.env, DATABASE_URL: secretUrl },
  });
  let out = '';
  let err = '';
  child.stdout?.on('data', (d) => (out += d));
  child.stderr?.on('data', (d) => (err += d));
  const code = await new Promise((resolve) => child.on('close', resolve));
  assert.notEqual(code, 0, 'exits non-zero');
  assert.ok(err.includes('Migration failed:'), 'prints failure message');
  assert.equal(err.includes('super_secret_password_123'), false, 'does not leak password');
  assert.equal(
    out.includes('super_secret_password_123'),
    false,
    'does not leak password in stdout',
  );
  assert.equal(err.includes('postgres://'), false, 'does not print connection string URL');
});

test('src/migrate.ts configures studio_app role when APP_DB_PASSWORD is provided', async () => {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['src/migrate.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: process.env['TEST_PG_URL']!,
      APP_DB_PASSWORD: 'test_migrate_app_pw',
    },
  });
  let out = '';
  let err = '';
  child.stdout?.on('data', (d) => (out += d));
  child.stderr?.on('data', (d) => (err += d));
  const code = await new Promise((resolve) => child.on('close', resolve));
  assert.equal(code, 0, `migrate exited with code ${code}: ${err}`);
  assert.ok(out.includes('Application role studio_app configured.'), 'role configured log');
  const roleCheck = await db.query("select 1 from pg_roles where rolname = 'studio_app'");
  assert.equal(roleCheck.rowCount, 1, 'studio_app role exists in database');
});
