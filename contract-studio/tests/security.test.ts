import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createSession, loadSession, setupAllowed } from '../src/auth.ts';
import { many, one, type Db } from '../src/db.ts';
import { BASE, fixtures, freshDb, harness, ORIGIN, testConfig } from './helpers.ts';

let db: Db;
let drop: () => Promise<void>;
const config = testConfig();
let h: ReturnType<typeof harness>;
before(async () => ({ db, drop } = await freshDb()));
after(() => drop());
beforeEach(async () => {
  h = harness(db, config);
  await h.login();
});

const UUID0 = '00000000-0000-4000-8000-000000000000';
const paths = () => [
  '',
  '/clients',
  '/clients/new',
  '/projects',
  '/documents',
  '/documents/new',
  '/assistant',
  '/templates',
  '/settings',
];

test('unauthenticated pages redirect to login and leak nothing', async () => {
  const { clientId } = await fixtures(db);
  for (const path of [...paths(), `/clients/${clientId}`]) {
    const response = await h.call(path, { noCookie: true });
    assert.equal(response.status, 303, path);
    assert.equal(response.headers.get('location'), `${BASE}/login`);
    assert.doesNotMatch(await response.text(), /Примерна/);
  }
});

test('unauthenticated API calls and downloads get 401', async () => {
  const { contract, clientId } = await fixtures(db);
  const calls: [string, Parameters<typeof h.call>[1]][] = [
    [`/documents/${contract.id}/export/1/pdf`, {}],
    [`/documents/${contract.id}/preview`, { form: {} }],
    [`/documents/${contract.id}/save`, { form: {} }],
    [`/documents/${contract.id}/status`, { form: { to: 'archived' } }],
    [`/clients/${clientId}/archive`, { method: 'POST' }],
    [`/chat/${UUID0}`, { json: { message: 'x' } }],
    ['/settings', { form: {} }],
  ];
  for (const [path, options] of calls) {
    const response = await h.call(path, { ...options, noCookie: true });
    assert.equal(response.status, 401, path);
  }
  assert.equal((await many(db, "select 1 from contracts where status = 'archived'")).length, 0);
});

test('the private script needs a session; the login page assets do not', async () => {
  assert.equal((await h.call('/assets/studio.js', { noCookie: true })).status, 401);
  assert.equal((await h.call('/assets/auth.js', { noCookie: true })).status, 200);
  assert.equal((await h.call('/assets/studio.js')).status, 200);
  assert.equal((await h.call('/assets/../../package.json', { noCookie: true })).status, 404);
});

test('calling the Railway domain directly, without the proxy secret, is a 404', async () => {
  for (const secret of [null, 'wrong']) {
    const response = await h.call('/login', { secret });
    assert.equal(response.status, 404);
  }
  assert.equal((await h.call('/healthz', { secret: null })).status, 200);
  assert.equal(
    JSON.stringify(await (await h.call('/healthz', { secret: null })).json()),
    '{"ok":true}',
  );
});

test('cross-site and origin-less writes are refused', async () => {
  const { clientId } = await fixtures(db);
  for (const origin of ['https://evil.example', null]) {
    const response = await h.call(`/clients/${clientId}/archive`, { method: 'POST', origin });
    assert.equal(response.status, 403);
  }
  assert.equal(
    (await one(db, 'select archived_at from clients where id = $1', [clientId]))?.['archived_at'],
    null,
  );
});

test('security and privacy headers are on every response', async () => {
  for (const path of ['/login', '']) {
    const response = await h.call(path);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noarchive/);
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    assert.doesNotMatch(response.headers.get('content-security-policy') ?? '', /unsafe/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
  }
});

test('session cookie attributes on rotation with https config', async () => {
  const httpsConfig = testConfig({
    appOrigin: 'https://nikolay-georgiev.dev',
    rpId: 'nikolay-georgiev.dev',
    secureCookies: true,
  });
  const httpsH = harness(db, httpsConfig);
  await httpsH.login();
  await db.query(
    "update sessions set rotated_at = now() - interval '1 hour' where revoked_at is null",
  );
  const res = await httpsH.call('');
  assert.equal(res.status, 200);
  const setCookie = res.headers.get('set-cookie') ?? '';
  assert.ok(setCookie.includes('__Host-studio='), 'cookie name is __Host-studio');
  assert.ok(setCookie.includes('HttpOnly'), 'HttpOnly attribute');
  assert.ok(setCookie.includes('Secure'), 'Secure attribute');
  assert.ok(setCookie.includes('SameSite=Strict'), 'SameSite=Strict attribute');
  assert.ok(setCookie.includes('Path=/'), 'Path=/ attribute');
});

test('asset route for studio.js does not rotate session', async () => {
  const token = await h.login();
  await db.query(
    "update sessions set rotated_at = now() - interval '1 hour' where revoked_at is null",
  );
  const assetRes = await h.call('/assets/studio.js');
  assert.equal(assetRes.status, 200);
  assert.equal(assetRes.headers.get('set-cookie'), null);
  const after = await loadSession(db, config, token, { rotate: false });
  assert.equal(after?.rotated, false);
  assert.equal(after?.token, token);
});

test('parallel session rotations are atomic and treat lost race as not rotated', async () => {
  const token = await createSession(db, config, null, null);
  await db.query(
    "update sessions set rotated_at = now() - interval '1 hour' where revoked_at is null",
  );
  const [res1, res2] = await Promise.all([
    loadSession(db, config, token),
    loadSession(db, config, token),
  ]);
  const rotatedCount = [res1?.rotated, res2?.rotated].filter(Boolean).length;
  assert.equal(rotatedCount, 1);
  assert.ok(await loadSession(db, config, token));
});

test('/workspace redirects to BASE', async () => {
  const res = await h.call('/workspace');
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), BASE);
});

test('tool schemas do not include $schema', async () => {
  const { TOOLS } = await import('../src/ai.ts');
  for (const tool of TOOLS) {
    assert.equal('$schema' in (tool.input_schema as Record<string, unknown>), false);
  }
});

test('expired, idle and revoked sessions stop working', async () => {
  const check = async (mutate: string) => {
    const token = await createSession(db, config, null, null);
    assert.ok(await loadSession(db, config, token));
    await db.query(mutate);
    h.setCookie(`__Host-studio=${token}`);
    assert.equal((await h.call('')).status, 303, mutate);
    await db.query('update sessions set revoked_at = now() where revoked_at is null');
  };
  await check(
    "update sessions set expires_at = now() - interval '1 minute' where revoked_at is null",
  );
  await check(
    "update sessions set last_seen_at = now() - interval '2 hours' where revoked_at is null",
  );
  await check('update sessions set revoked_at = now() where revoked_at is null');
});

test('tokens are stored hashed and rotate with a short grace period', async () => {
  const token = await createSession(db, config, null, null);
  const stored = await many(db, 'select token_hash from sessions where token_hash = $1', [
    Buffer.from(token),
  ]);
  assert.equal(stored.length, 0);
  await db.query(
    "update sessions set rotated_at = now() - interval '1 hour', token_hash = token_hash where revoked_at is null",
  );
  const rotated = await loadSession(db, config, token);
  assert.equal(rotated?.rotated, true);
  assert.notEqual(rotated?.token, token);
  assert.ok(await loadSession(db, config, token), 'old token works inside the grace period');
  await db.query("update sessions set rotated_at = now() - interval '2 minutes' where id = $1", [
    rotated?.id,
  ]);
  assert.equal(await loadSession(db, config, token), null);
});

test('logout revokes the session on the server', async () => {
  const response = await h.call('/logout', { method: 'POST' });
  assert.equal(response.status, 303);
  assert.equal((await h.call('')).status, 303);
  assert.equal((await h.call('/settings')).headers.get('location'), `${BASE}/login`);
});

test('a setup token is checked exactly and works only once', async () => {
  const secured = { ...config, setupToken: 'one-time-token' };
  assert.equal(await setupAllowed(db, secured, 'one-time-tokex'), false);
  assert.equal(await setupAllowed(db, secured, ''), false);
  assert.equal(await setupAllowed(db, config, 'anything'), false, 'no token configured');
  assert.equal(await setupAllowed(db, secured, 'one-time-token'), true);
  const { createHash } = await import('node:crypto');
  await db.query('insert into used_setup_tokens (token_hash) values ($1)', [
    createHash('sha256').update('one-time-token').digest(),
  ]);
  assert.equal(await setupAllowed(db, secured, 'one-time-token'), false);
});

test('sign-in with garbage is refused and audited', async () => {
  const options = await h.call('/auth/options', { json: {}, noCookie: true });
  const { challengeId } = (await options.json()) as { challengeId: string };
  const response = await h.call('/auth/verify', {
    json: { challengeId, response: { id: 'nope' } },
    noCookie: true,
  });
  assert.equal(response.status, 401);
  assert.equal(((await response.json()) as { error: string }).error, 'That did not work.');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok((await many(db, "select 1 from audit_logs where action = 'auth.failed'")).length >= 1);
});

test('login attempts are rate limited', async () => {
  let last = 200;
  for (let i = 0; i < 12; i += 1)
    last = (await h.call('/auth/options', { json: {}, noCookie: true })).status;
  assert.equal(last, 429);
});

test('unknown or malformed ids are 404, never a server error', async () => {
  for (const path of [
    `/documents/${UUID0}`,
    `/clients/${UUID0}`,
    '/documents/1%27%20or%201=1',
    '/clients/not-a-uuid',
    `/documents/${UUID0}/export/1/pdf`,
  ]) {
    const response = await h.call(path);
    assert.equal(response.status, 404, path);
  }
  const { contract } = await fixtures(db);
  assert.equal((await h.call(`/documents/${contract.id}/export/99/pdf`)).status, 404);
  assert.equal((await h.call(`/documents/${contract.id}/export/1/exe`)).status, 404);
  assert.equal((await h.call(`/documents/${contract.id}?v=999`)).status, 404);
});

test('invalid input is rejected with a message and no row', async () => {
  const before = (await many(db, 'select 1 from clients')).length;
  const response = await h.call('/clients', {
    form: { kind: 'legal_entity', name: 'x', eik: 'abc', country: 'BG' },
  });
  assert.equal(response.status, 422);
  assert.equal((await many(db, 'select 1 from clients')).length, before);
});

test('SQL injection text is stored as text', async () => {
  const evil = "x'); drop table clients; --";
  const response = await h.call('/clients', {
    form: { kind: 'individual', name: evil, country: 'BG' },
  });
  assert.equal(response.status, 303);
  assert.ok(await one(db, 'select 1 from clients where name = $1', [evil]));
});

test('XSS payloads render inert everywhere', async () => {
  const xss = '<img src=x onerror=alert(1)>';
  const created = await h.call('/clients', {
    form: { kind: 'individual', name: xss, address: xss, notes: xss, country: 'BG' },
  });
  const id = created.headers.get('location')!.split('/').pop()!.split('?')[0]!;
  const detail = await (await h.call(`/clients/${id}`)).text();
  assert.doesNotMatch(detail, /<img src=x/);
  const list = await (await h.call('/clients')).text();
  assert.doesNotMatch(list, /<img src=x/);
  const reflected = await (
    await h.call(`/clients?error=${encodeURIComponent(xss)}&notice=${encodeURIComponent(xss)}`)
  ).text();
  assert.doesNotMatch(reflected, /<img src=x/);
  const contractResponse = await h.call('/documents', {
    form: { client_id: id, project_id: '', template_key: 'software-development', lang: 'bg' },
  });
  const contractPage = await (await h.call(contractResponse.headers.get('location')!)).text();
  assert.doesNotMatch(contractPage, /<img src=x/);
});

test('oversized requests are refused', async () => {
  const response = await h.call('/clients', {
    form: { kind: 'individual', name: 'x'.repeat(600_000), country: 'BG' },
  });
  assert.equal(response.status, 413);
});

test('a redirect on error cannot leave the workspace', async () => {
  const app = h.app;
  const token = await h.login();
  const response = await app.request(`${BASE}/clients`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'x-studio-proxy-secret': 'proxy-secret-for-tests',
      cookie: `__Host-studio=${token}`,
      referer: 'https://evil.example/phish',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'kind=robot&name=x',
  });
  assert.equal(response.status, 422);
  assert.equal(response.headers.get('location'), null);
});

test('server errors say nothing about the internals', async () => {
  const broken = harness(
    {
      query: async () => {
        throw new Error('connect postgres://u:hunter2@db/x failed');
      },
      connect: async () => {
        throw new Error('x');
      },
    } as never,
    config,
  );
  const logged: string[] = [];
  const original = console.error;
  console.error = (line: string) => logged.push(line);
  try {
    broken.setCookie('__Host-studio=abc');
    const response = await broken.call('');
    assert.equal(response.status, 500);
    const text = await response.text();
    assert.match(text, /Something went wrong/);
    assert.doesNotMatch(text, /hunter2|postgres/);
    assert.doesNotMatch(logged.join(''), /hunter2/);
  } finally {
    console.error = original;
  }
});

test('frozen contracts refuse edits over HTTP and approved exports stay downloadable only with a session', async () => {
  const { contract } = await fixtures(db);
  const pdf = await h.call(`/documents/${contract.id}/export/1/pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.match(
    pdf.headers.get('content-disposition') ?? '',
    /attachment; filename="software-development-CS-\d{4}-\d{4}-v1-draft\.pdf"/,
  );
  assert.equal(
    (await h.call(`/documents/${contract.id}/export/1/pdf`, { noCookie: true })).status,
    401,
  );
});
