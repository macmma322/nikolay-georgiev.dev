// Logging out, session expiry and the way back to the portfolio.
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { loadSession } from '../src/auth.ts';
import { loadConfig, PORTFOLIO_HOME } from '../src/config.ts';
import { one, type Db } from '../src/db.ts';
import { BASE, fixtures, freshDb, harness, ORIGIN, testConfig } from './helpers.ts';

let db: Db;
let drop: () => Promise<void>;
const config = testConfig();
let h: ReturnType<typeof harness>;
let token: string;
before(async () => ({ db, drop } = await freshDb()));
after(() => drop());
beforeEach(async () => {
  h = harness(db, config);
  token = await h.login();
});

const revoked = async (value: string) =>
  (await loadSession(db, config, value, { rotate: false })) === null;
const idleOut = (value: string) =>
  db.query(
    "update sessions set last_seen_at = now() - interval '2 hours' where token_hash = sha256($1::bytea)",
    [Buffer.from(value)],
  );

test('logout ends the session on the server and lands on the public portfolio', async () => {
  assert.equal(config.portfolioUrl, 'https://nikolay-georgiev.dev/');
  const response = await h.call('/logout', { method: 'POST' });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://nikolay-georgiev.dev/');
  assert.notEqual(response.headers.get('location'), `${BASE}/login`);
  assert.match(response.headers.get('set-cookie') ?? '', /__Host-studio=;.*Max-Age=0/i);
  assert.equal(response.headers.get('clear-site-data'), '"cache"');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(await revoked(token), 'the token no longer loads a session');
  const row = await one(db, 'select revoked_at from sessions order by created_at desc limit 1');
  assert.ok(row?.['revoked_at'], 'revoked_at is recorded');
});

test('after logout the old cookie opens nothing', async () => {
  const { contract } = await fixtures(db);
  await h.call('/logout', { method: 'POST' });
  // Pages, including the one the browser would go Back to: sign-in, never content.
  for (const path of ['', '/clients', `/documents/${contract.id}`, '/settings']) {
    const response = await h.call(path);
    assert.equal(response.status, 303, path);
    assert.match(response.headers.get('location') ?? '', /\/login/, path);
    assert.doesNotMatch(await response.text(), /Примерна|Платформа/, path);
  }
  // Protected API calls: refused.
  const chat = await h.call(`/chat/${contract.id}`, { json: { message: 'hi' } });
  assert.equal(chat.status, 401);
  const preview = await h.call(`/documents/${contract.id}/preview`, { form: { title: 'x' } });
  assert.equal(preview.status, 401);
  const exported = await h.call(`/documents/${contract.id}/export/1/pdf`);
  assert.equal(exported.status, 401);
  const asset = await h.call('/assets/studio.js');
  assert.equal(asset.status, 401);
});

test('private pages can never be stored by the browser', async () => {
  const { contract } = await fixtures(db);
  for (const path of ['', '/clients', `/documents/${contract.id}`, '/settings', '/login']) {
    assert.equal((await h.call(path)).headers.get('cache-control'), 'no-store', path);
  }
});

test('a session that already idled out can still log out, and still lands home', async () => {
  await idleOut(token);
  const response = await h.call('/logout', { method: 'POST' });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), config.portfolioUrl);
  const row = await one(
    db,
    'select revoked_at from sessions where token_hash = sha256($1::bytea)',
    [Buffer.from(token)],
  );
  assert.ok(row?.['revoked_at']);
});

test('logout without a cookie is harmless, lands home and writes no audit row', async () => {
  const count = async () =>
    Number(
      (await one(db, "select count(*) from audit_logs where action = 'auth.logout'"))?.['count'],
    );
  const before = await count();
  const response = await h.call('/logout', { method: 'POST', noCookie: true });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), config.portfolioUrl);
  h.setCookie('__Host-studio=not-a-real-token');
  await h.call('/logout', { method: 'POST' });
  assert.equal(await count(), before, 'anonymous logouts are not recorded');
});

test('logout also kills the token the session just rotated away from', async () => {
  await db.query("update sessions set rotated_at = now() - interval '1 hour'");
  const rotated = await loadSession(db, config, token);
  assert.equal(rotated?.rotated, true);
  h.setCookie(`__Host-studio=${rotated!.token}`);
  await h.call('/logout', { method: 'POST' });
  assert.ok(await revoked(rotated!.token));
  assert.ok(await revoked(token), 'the previous token is inside its grace period no longer');
});

test('a cross-site logout is refused and the session survives', async () => {
  const response = await h.call('/logout', { method: 'POST', origin: 'https://evil.example' });
  assert.equal(response.status, 403);
  assert.equal(await revoked(token), false);
});

test('when the server cannot revoke, logout says so and claims nothing', async () => {
  const failing = new Proxy(db, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (property !== 'query') return typeof value === 'function' ? value.bind(target) : value;
      return (sql: unknown, ...rest: unknown[]) =>
        /set revoked_at = now\(\)\s+where \(token_hash/.test(String(sql))
          ? Promise.reject(new Error('connection lost'))
          : (target.query as (...args: unknown[]) => unknown)(sql, ...rest);
    },
  });
  const broken = harness(failing, config);
  broken.setCookie(`__Host-studio=${token}`);
  const response = await broken.call('/logout', { method: 'POST' });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('set-cookie'), null, 'the cookie is not pretended away');
  assert.match(await response.text(), /Log out did not finish/);
  assert.equal(await revoked(token), false);
});

test('an expired session asks to sign in again and keeps private content out', async () => {
  const { contract } = await fixtures(db);
  await idleOut(token);
  const page = await h.call(`/documents/${contract.id}`);
  assert.equal(page.status, 303);
  assert.equal(page.headers.get('location'), `${BASE}/login?expired=1`);
  assert.match(page.headers.get('set-cookie') ?? '', /Max-Age=0/i, 'the dead cookie is dropped');
  // A plain form post (a navigation) goes to sign-in too; a fetch gets a 401.
  const navigation = await h.app.request(`${BASE}/documents/${contract.id}/save`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      cookie: `__Host-studio=${token}`,
      'sec-fetch-mode': 'navigate',
      'x-studio-proxy-secret': 'proxy-secret-for-tests',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'title=x',
  });
  assert.equal(navigation.status, 303);
  assert.equal(navigation.headers.get('location'), `${BASE}/login?expired=1`);
  const fetched = await h.call(`/documents/${contract.id}/preview`, { form: { title: 'x' } });
  assert.equal(fetched.status, 401);
  const login = await h.call('/login?expired=1', { noCookie: true });
  assert.match(await login.text(), /Your session has ended/);
});

test('signed-out visitors are sent to sign-in, without the expiry note', async () => {
  const response = await h.call('', { noCookie: true });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), `${BASE}/login`);
});

test('every workspace page offers the way back to the portfolio, separate from Log out', async () => {
  const { contract, clientId } = await fixtures(db);
  const paths = ['', '/clients', `/clients/${clientId}`, `/documents/${contract.id}`, '/settings'];
  for (const path of paths) {
    const body = await (await h.call(path)).text();
    const links = [...body.matchAll(/<a class="(back-link|mobile-back)" href="([^"]+)"/g)];
    assert.equal(links.length, 2, `${path}: header and phone menu`);
    for (const [, , href] of links) assert.equal(href, config.portfolioUrl);
    // A plain link, outside any form: following it cannot post a logout.
    for (const form of body.matchAll(/<form[^>]*>[\s\S]*?<\/form>/g))
      assert.doesNotMatch(form[0], /back-to-portfolio/, path);
    assert.match(body, /<form method="post" action="\/workspace\/contracts\/logout"/);
  }
  assert.equal(await revoked(token), false, 'looking at pages leaves the session alone');
});

test('the sign-in page links home but the portfolio never links in', async () => {
  const body = await (await h.call('/login', { noCookie: true })).text();
  assert.match(body, new RegExp(`class="back-link" href="${config.portfolioUrl}"`));
});

test('the logout redirect target is the operator setting, validated', () => {
  const base = { APP_ORIGIN: 'https://nikolay-georgiev.dev' };
  assert.equal(loadConfig(base).portfolioUrl, PORTFOLIO_HOME);
  assert.equal(
    loadConfig({ ...base, PORTFOLIO_URL: 'https://staging.example.dev/' }).portfolioUrl,
    'https://staging.example.dev/',
  );
  assert.equal(
    loadConfig({ ...base, PORTFOLIO_URL: 'http://localhost:4321/' }).portfolioUrl,
    'http://localhost:4321/',
  );
  for (const bad of [
    'javascript:alert(1)',
    'http://nikolay-georgiev.dev/',
    'https://nikolay-georgiev.dev/?next=https://evil.example',
    'https://user:pass@nikolay-georgiev.dev/',
    'not a url',
  ])
    assert.throws(() => loadConfig({ ...base, PORTFOLIO_URL: bad }), Error, bad);
});

test('the redirect is never taken from the request', async () => {
  const response = await h.call('/logout?next=https://evil.example/', {
    form: { next: 'https://evil.example/', redirect: 'https://evil.example/' },
  });
  assert.equal(response.headers.get('location'), config.portfolioUrl);
});

test('the CSP lets the logout form redirect to the portfolio and nowhere else', async () => {
  const csp = (await h.call('/login')).headers.get('content-security-policy') ?? '';
  assert.match(csp, /form-action 'self' https:\/\/nikolay-georgiev\.dev;/);
  const local = harness(db, testConfig({ portfolioUrl: 'http://localhost:4321/' }));
  const localCsp = (await local.call('/login')).headers.get('content-security-policy') ?? '';
  assert.match(localCsp, /form-action 'self' http:\/\/localhost:4321;/);
});
