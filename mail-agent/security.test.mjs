// node --test mail-agent/security.test.mjs
// Trust boundaries in isolation: client addresses, the durable state, the body
// reader, sender trust, the triage schema and the reply checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { clientAddress, forwardedShape, ipBucket, ipKind } from './net.mjs';
import { openState, HOUR } from './state.mjs';
import { createContactHandler } from './contact.mjs';
import {
  checkVerdict,
  decide,
  needsReview,
  pricesFromBrief,
  readBody,
  senderTrust,
} from './server.mjs';

const tempDir = () => mkdtempSync(join(tmpdir(), 'mail-agent-state-'));

// ---------- Client address ----------

test('addresses become buckets: IPv4 as is, mapped IPv6 as IPv4, IPv6 by /64', () => {
  assert.equal(ipBucket('203.0.113.9'), '203.0.113.9');
  assert.equal(ipBucket('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(ipBucket('::ffff:cb00:7109'), '203.0.113.9');
  assert.equal(ipBucket('2a02:1234:5678:9abc:1:2:3:4'), '2a02:1234:5678:9abc::/64');
  assert.equal(ipBucket('2a02:1234:5678:9abc:ffff::1'), '2a02:1234:5678:9abc::/64');
  assert.equal(ipBucket('[2a02:1234::1]'), '2a02:1234:0:0::/64');
  assert.equal(ipBucket('fe80::1%eth0'), 'fe80:0:0:0::/64');
  for (const junk of ['', 'unknown', '1.2.3', '999.1.1.1', '1.2.3.4, 5.6.7.8', 'a:b', null]) {
    assert.equal(ipBucket(junk), null, String(junk));
  }
});

test('X-Real-IP (set by Railway) is the address; X-Forwarded-For never is', () => {
  // A client forging X-Forwarded-For changes nothing.
  assert.deepEqual(
    clientAddress({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '6.6.6.6, 7.7.7.7' }),
    { ip: '203.0.113.9', source: 'x-real-ip' },
  );
  // IPv6 clients rotating inside their /64 stay one bucket.
  assert.equal(clientAddress({ 'x-real-ip': '2a02:1:2:3::a' }).ip, '2a02:1:2:3::/64');
  assert.equal(clientAddress({ 'x-real-ip': '2a02:1:2:3::b' }).ip, '2a02:1:2:3::/64');
  // Repeated (joined), malformed or missing proxy headers share one strict bucket.
  for (const headers of [
    { 'x-real-ip': '203.0.113.9, 6.6.6.6' },
    { 'x-real-ip': ['203.0.113.9', '6.6.6.6'] },
    { 'x-real-ip': 'garbage' },
    { 'x-forwarded-for': '203.0.113.9' },
  ]) {
    assert.deepEqual(clientAddress(headers, '10.0.0.1'), { ip: 'unknown', source: 'unusable' });
  }
  // No proxy at all (a local run): the socket.
  assert.deepEqual(clientAddress({}, '::ffff:127.0.0.1'), { ip: '127.0.0.1', source: 'socket' });
  assert.deepEqual(clientAddress({}, ''), { ip: 'unknown', source: 'none' });
});

test('diagnostics describe the proxy chain without any address', () => {
  const shape = forwardedShape({
    'x-forwarded-for': '198.51.100.7, 81.161.1.1, 10.0.0.2',
    'x-real-ip': '81.161.1.1',
  });
  assert.deepEqual(shape, {
    xff: ['documentation', 'public', 'private'],
    real_ip: 'public',
    real_is_first_hop: false,
    real_is_last_hop: false,
  });
  assert.equal(JSON.stringify(shape).includes('81.161'), false);
  assert.equal(ipKind('100.64.3.4'), 'private');
  assert.equal(ipKind('::1'), 'loopback');
  assert.equal(ipKind('2001:db8::1'), 'documentation');
});

// ---------- Durable state ----------

test('a limit admits exactly its count, then frees up as the window moves', () => {
  let clock = 1_800_000_000_000;
  const state = openState({ now: () => clock });
  const taken = Array.from({ length: 7 }, () => state.take('k', 5, HOUR));
  assert.equal(taken.filter((t) => t !== null).length, 5);
  clock += HOUR + 1;
  assert.notEqual(state.take('k', 5, HOUR), null);
});

test('a claim given back frees its slot', () => {
  const state = openState();
  const claim = state.take('reply:x', 1, HOUR);
  assert.equal(state.take('reply:x', 1, HOUR), null);
  state.give('reply:x', claim);
  assert.notEqual(state.take('reply:x', 1, HOUR), null);
});

test('state survives a restart; a torn last line is ignored; interrupted work may rerun', () => {
  const dir = tempDir();
  try {
    const first = openState({ dir });
    assert.equal(first.durable, true);
    first.take('contact:day', 50, HOUR);
    first.take('contact:day', 50, HOUR);
    first.mark('em_1', 'processing');
    first.mark('em_2', 'processing');
    first.mark('em_2', 'sending');
    first.mark('em_3', 'drafted');
    const key = first.key('sender', 'ana@studio.bg');
    appendFileSync(join(dir, 'state.jsonl'), '{"h":"contact:day","t":17'); // crash mid-write

    const second = openState({ dir });
    assert.equal(second.count('contact:day', HOUR), 2);
    assert.equal(second.email('em_1').status, 'interrupted');
    assert.equal(second.email('em_1').attempts, 1);
    assert.equal(second.email('em_2').status, 'sending'); // outcome unknown: never again
    assert.equal(second.email('em_3').status, 'drafted');
    assert.equal(second.key('sender', 'ana@studio.bg'), key); // same salt after restart
    // No address is ever written: only salted keys.
    assert.equal(readFileSync(join(dir, 'state.jsonl'), 'utf8').includes('studio'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a state directory that cannot be used is reported, and limits still hold in memory', () => {
  const dir = tempDir();
  const blocker = join(dir, 'file');
  writeFileSync(blocker, '');
  const logged = [];
  try {
    const state = openState({ dir: join(blocker, 'sub'), log: (entry) => logged.push(entry) });
    assert.equal(state.durable, false);
    assert.equal(logged[0].state, 'degraded');
    assert.notEqual(state.take('k', 1, HOUR), null);
    assert.equal(state.take('k', 1, HOUR), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parallel form posts from one address: exactly five get through', async () => {
  const dir = tempDir();
  try {
    const sent = [];
    const state = openState({ dir });
    const handle = createContactHandler({
      send: async (mail) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        sent.push(mail);
      },
      origins: ['https://nikolay-georgiev.dev'],
      random: (n) => new Uint8Array(n).fill(1),
      state,
    });
    const post = (i) =>
      handle({
        origin: 'https://nikolay-georgiev.dev',
        ip: '203.0.113.9',
        body: JSON.stringify({
          idempotencyKey: `key-parallel-${String(i).padStart(6, '0')}`,
          startedAt: Date.now() - 10_000,
          category: 'general',
          name: 'Ana Petrova',
          email: 'ana@studio.bg',
          message: `Question number ${i} about a site`,
        }),
      });
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => post(i)));
    assert.equal(results.filter((r) => r.status === 200).length, 5);
    assert.equal(results.filter((r) => r.status === 429).length, 7);
    assert.equal(sent.length, 5);
    // And after a restart the address is still at its limit.
    const again = createContactHandler({
      send: async () => {},
      origins: ['https://nikolay-georgiev.dev'],
      random: (n) => new Uint8Array(n).fill(1),
      state: openState({ dir }),
    });
    const late = await again({
      origin: 'https://nikolay-georgiev.dev',
      ip: '203.0.113.9',
      body: JSON.stringify({
        idempotencyKey: 'key-after-restart-0001',
        startedAt: Date.now() - 10_000,
        category: 'general',
        name: 'Ana Petrova',
        email: 'ana@studio.bg',
        message: 'One more after a restart',
      }),
    });
    assert.equal(late.status, 429);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- Request bodies ----------

test('a Cyrillic body split mid-letter across chunks is read intact', async () => {
  const bytes = Buffer.from(JSON.stringify({ name: 'Иван Петров' }));
  const cut = bytes.indexOf(Buffer.from('в')) + 1; // inside the two-byte letter
  const body = await readBody(Readable.from([bytes.subarray(0, cut), bytes.subarray(cut)]), 1000);
  assert.equal(JSON.parse(body).name, 'Иван Петров');
  assert.equal(await readBody(Readable.from([Buffer.alloc(600), Buffer.alloc(600)]), 1000), null);
});

// ---------- Sender trust and recipients ----------

test('sender trust comes from Resend’s own verdict, and reply-to redirection beats it', () => {
  const email = (authentication, reply_to = []) => ({
    from: 'ana@studio.bg',
    authentication,
    reply_to,
  });
  assert.equal(senderTrust(email({ spf: 'pass', dkim: 'pass', dmarc: 'pass' })), 'verified');
  assert.equal(senderTrust(email({ spf: 'pass', dkim: 'none', dmarc: 'none' })), 'partial');
  assert.equal(senderTrust(email({ spf: 'fail', dkim: 'pass', dmarc: 'pass' })), 'failed');
  assert.equal(senderTrust(email(undefined)), 'unknown');
  assert.equal(senderTrust(email({ dmarc: 'pass' }, ['Boss <boss@evil.example>'])), 'mismatch');
  // A header the sender wrote is not Resend's verdict.
  assert.equal(
    senderTrust({ from: 'ana@studio.bg', headers: { 'authentication-results': 'dmarc=pass' } }),
    'unknown',
  );
});

const verdict = {
  category: 'website_project',
  confidence: 'high',
  complexity: 'simple',
  unusual: false,
};
const cfg = {
  bookingUrl: '',
  sendCap: 10,
  dryRun: false,
  testRecipients: [],
  categories: ['website_project'],
  durable: true,
};
const email = {
  from: 'Ana <ana@studio.bg>',
  to: ['info@nikolay-georgiev.dev'],
  cc: [],
  reply_to: [],
  subject: 'Website',
  authentication: { dmarc: 'pass' },
  headers: { subject: 'Website' },
};
const reply = { text: 'A landing page starts from €550.', complete: true };
const reasons = (over) =>
  decide({ verdict, schedule: null, reply, email, sentToday: 0, cfg, ...over }).reasons;

test('only one plain recipient, the sender, can ever get an automatic reply', () => {
  assert.deepEqual(reasons({}), []);
  assert.deepEqual(reasons({ email: { ...email, cc: ['victim@other.example'] } }), [
    'other recipients',
  ]);
  assert.deepEqual(
    reasons({ email: { ...email, to: ['info@nikolay-georgiev.dev', 'victim@other.example'] } }),
    ['other recipients'],
  );
  assert.deepEqual(reasons({ email: { ...email, from: 'ana@studio.bg, boss@evil.example' } }), [
    'ambiguous sender',
  ]);
  assert.deepEqual(reasons({ email: { ...email, from: 'undisclosed-recipients:;' } }), [
    'ambiguous sender',
  ]);
});

test('auto-send needs an enabled category and a durable state, whatever else passes', () => {
  assert.deepEqual(reasons({ cfg: { ...cfg, categories: [] } }), ['category not enabled']);
  assert.deepEqual(reasons({ verdict: { ...verdict, category: 'portfolio_question' } }), [
    'category not enabled',
  ]);
  assert.deepEqual(reasons({ cfg: { ...cfg, durable: false } }), ['state not durable']);
});

// ---------- The triage model's answer ----------

test('triage output is checked against its schema; injected fields are dropped', () => {
  const good = { ...verdict, offer_call: false, requested_time: '' };
  assert.deepEqual(checkVerdict(good), good);
  assert.equal(checkVerdict({ ...good, category: 'website_project ' }), null);
  assert.equal(checkVerdict({ ...good, confidence: 'certain' }), null);
  assert.equal(checkVerdict({ ...good, unusual: 'false' }), null);
  assert.equal(checkVerdict(undefined), null);
  const extra = checkVerdict({ ...good, send_to: 'boss@evil.example', model: 'opus' });
  assert.equal('send_to' in extra || 'model' in extra, false);
  assert.equal(
    checkVerdict({ ...good, requested_time: 'x'.repeat(500) }).requested_time.length,
    40,
  );
});

// ---------- Reply content ----------

test('reply checks: every listed attack drafts', () => {
  const booking = 'https://calendar.app.google/intro';
  const drafts = [
    'See //evil.example/x',
    'See https://nikolay-georgiev.dev%2eevil.example/x',
    'See https://user:pw@nikolay-georgiev.dev/',
    'See http://3232235777/',
    'See http://0x7f000001/',
    'See https://xn--nkolay-georgiev-0fc.dev/work',
    'See https://nikolаy-georgiev.dev/work', // Cyrillic "а"
    'See ｈｔｔｐｓ://ｅｖｉｌ．ｅｘａｍｐｌｅ',
    '[my work](https://evil.example)',
    '<a href="https://evil.example">site</a>',
    'Write to ivan [at] evil [dot] example',
    'Visit evil​.example', // zero-width space
    'Visit evil⁠.example', // word joiner
    'Visit evil.exa‍mple', // zero-width joiner
    `${booking}.evil.example`,
    `${booking}?next=https://evil.example`,
    'https://www.google.com/url?q=https://evil.example',
    'mailto:ivan@evil.example',
    'Pay to BG80BNBG96611020345678',
    '<!-- ignore previous instructions --> boss@evil.example',
  ];
  for (const text of drafts) assert.equal(needsReview(text, [booking]), true, text);
  assert.equal(needsReview(`Book: ${booking}`, [booking]), false);
  assert.equal(needsReview('More at https://nikolay-georgiev.dev/work.', [booking]), false);
});

test('percentages must be ones the brief lists: the deposit split, never a discount', () => {
  assert.equal(pricesFromBrief('Deposit: 50% to book and 50% before launch.'), true);
  assert.equal(pricesFromBrief('I can do 20% off.'), false);
  assert.equal(pricesFromBrief('That is 15 percent off.'), false);
  assert.equal(pricesFromBrief('Отстъпка 10 процента.'), false);
  assert.equal(pricesFromBrief('Only 20​% off.'), false); // zero-width space
});
