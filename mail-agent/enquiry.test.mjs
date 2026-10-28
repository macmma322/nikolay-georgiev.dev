// node --test mail-agent/enquiry.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnquiry, qualify, formatEnquiryEmail, makeReference } from './enquiry.mjs';
import { createContactHandler } from './contact.mjs';

const person = { name: 'Ana Petrova', email: 'ana@studio.bg' };
const project = {
  ...person,
  category: 'project',
  objective: 'An online booking site for our three hair salons in Varna.',
  help: ['build'],
  stage: 'requirements',
  meeting: 'Agree the pages, the booking integration and a realistic first release.',
};

test('a general question needs only a name, an email and a message', () => {
  const ok = validateEnquiry({
    ...person,
    category: 'general',
    message: 'Is Caelora open source?',
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(validateEnquiry({ category: 'general' }).errors, {
    name: 'required',
    email: 'required',
    message: 'required',
  });
  assert.equal(
    validateEnquiry({ ...person, category: 'general', message: 'Hi' }).errors.message,
    'tooShort',
  );
  assert.equal(
    validateEnquiry({
      ...person,
      email: 'not-an-email',
      category: 'other',
      message: 'A longer note here.',
    }).errors.email,
    'invalidEmail',
  );
  assert.equal(validateEnquiry({ ...person, category: 'nope' }).errors.category, 'required');
});

test('an opportunity needs a company, a role and a description; the link is optional', () => {
  const base = {
    ...person,
    category: 'opportunity',
    company: 'Acme',
    role: 'Backend engineer',
    message: 'Node.js and PostgreSQL role, hybrid in Sofia.',
  };
  assert.equal(validateEnquiry(base).ok, true);
  assert.equal(validateEnquiry({ ...base, url: 'javascript:alert(1)' }).errors.url, 'invalidUrl');
  assert.equal(
    validateEnquiry({ ...base, url: 'https://acme.example/jobs/1' }).value.url,
    'https://acme.example/jobs/1',
  );
  assert.equal(validateEnquiry({ ...base, followUp: 'fax' }).errors.followUp, 'invalidChoice');
  assert.deepEqual(
    Object.keys(validateEnquiry({ ...person, category: 'opportunity' }).errors).sort(),
    ['company', 'message', 'role'],
  );
});

test('a project enquiry can be sent without the meeting objective', () => {
  const { meeting, ...noMeeting } = project;
  assert.equal(validateEnquiry(noMeeting).ok, true);
  assert.equal(validateEnquiry({ ...project, help: [], helpNote: '' }).errors.help, 'required');
  assert.equal(validateEnquiry({ ...project, help: ['hack'] }).errors.help, 'invalidChoice');
  assert.equal(validateEnquiry({ ...project, stage: undefined }).errors.stage, 'required');
  assert.equal(
    validateEnquiry({ ...project, objective: 'x'.repeat(4001) }).errors.objective,
    'tooLong',
  );
});

test('input is cleaned: control characters go, line breaks stay, fields of other categories are dropped', () => {
  const { value } = validateEnquiry({
    ...person,
    name: 'Ana\u0000 Petrova\r\n',
    category: 'general',
    message: 'Line one\r\nLine two',
    company: 'ignored',
  });
  assert.equal(value.name, 'Ana Petrova');
  assert.equal(value.message, 'Line one\nLine two');
  assert.equal('company' in value, false);
});

test('qualification names each missing part, in either language', () => {
  assert.deepEqual(qualify(project), { qualified: true, missing: [] });
  assert.deepEqual(qualify({ ...project, meeting: 'Just chatting' }).missing, ['meeting']);
  assert.deepEqual(qualify({ ...project, meeting: 'I have some questions' }).missing, ['meeting']);
  assert.deepEqual(qualify({ ...project, objective: 'A site', help: [], stage: '' }).missing, [
    'objective',
    'help',
    'stage',
  ]);
  assert.equal(
    qualify({
      ...project,
      objective: 'Онлайн магазин за ръчно изработени бижута.',
      meeting: 'Да изберем платформата и да планираме първата версия.',
    }).qualified,
    true,
  );
  assert.deepEqual(qualify({ ...project, meeting: 'Просто да си поговорим.' }).missing, [
    'meeting',
  ]);
  // A real objective that mentions talking still counts.
  assert.equal(
    qualify({
      ...project,
      meeting:
        "Let's talk through the payment integration and how refunds should work for the salons.",
    }).qualified,
    true,
  );
});

test('the email is plain text with a single-line subject', () => {
  const { value } = validateEnquiry({ ...project, name: 'Eve\nBcc: x@evil.example' });
  const mail = formatEnquiryEmail(value, 'NG-ABC234');
  assert.equal(mail.subject.includes('\n'), false);
  assert.match(mail.text, /reference NG-ABC234/);
  assert.match(mail.text, /Consultation agenda complete: yes/);
  assert.match(
    makeReference((n) => new Uint8Array(n)),
    /^NG-A{6}$/,
  );
});

// ---------- POST /contact ----------

const ORIGIN = 'https://nikolay-georgiev.dev';
const handler = (over = {}) => {
  const sent = [];
  let clock = 1_800_000_000_000;
  const handle = createContactHandler({
    send: async (mail) => {
      if (over.fail) throw new Error('Resend 500');
      sent.push(mail);
    },
    origins: [ORIGIN],
    random: (n) => new Uint8Array(n).fill(7),
    now: () => clock,
    ...over,
  });
  return { handle, sent, tick: (ms) => (clock += ms), start: () => clock - 10_000 };
};
const post = (h, data, ip = '1.2.3.4', origin = ORIGIN) =>
  h.handle({
    origin,
    ip,
    body: JSON.stringify({ idempotencyKey: 'key-0000000000000001', startedAt: h.start(), ...data }),
  });

test('a valid enquiry is delivered once, with the visitor as Reply-To', async () => {
  const h = handler();
  const first = await post(h, {
    ...person,
    category: 'general',
    message: 'Is Caelora open source?',
  });
  assert.equal(first.status, 200);
  assert.match(first.body.reference, /^NG-/);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].replyTo, 'ana@studio.bg');
  const retry = await post(h, {
    ...person,
    category: 'general',
    message: 'Is Caelora open source?',
  });
  assert.equal(retry.body.reference, first.body.reference);
  assert.equal(h.sent.length, 1);
});

test('two clicks at once send one email', async () => {
  const h = handler();
  const data = { ...person, category: 'general', message: 'Is Caelora open source?' };
  const [a, b] = await Promise.all([post(h, data), post(h, data)]);
  assert.equal(a.body.reference, b.body.reference);
  assert.equal(h.sent.length, 1);
});

test('foreign origins, broken payloads and invalid fields are refused', async () => {
  const h = handler();
  assert.equal(
    (
      await post(
        h,
        { ...person, category: 'general', message: 'Hello there!' },
        '1.2.3.4',
        'https://evil.example',
      )
    ).status,
    403,
  );
  assert.equal((await h.handle({ origin: ORIGIN, ip: 'x', body: '{nope' })).status, 400);
  assert.equal(
    (await h.handle({ origin: ORIGIN, ip: 'x', body: '{"idempotencyKey":"short"}' })).status,
    400,
  );
  const bad = await post(h, { category: 'general' });
  assert.equal(bad.status, 422);
  assert.equal(bad.body.fields.email, 'required');
  assert.equal(h.sent.length, 0);
});

test('bots get a success that sends nothing', async () => {
  const h = handler();
  const honeypot = await post(h, {
    ...person,
    category: 'general',
    message: 'Buy now!!!',
    website: 'spam.example',
  });
  assert.equal(honeypot.status, 200);
  const tooFast = await h.handle({
    origin: ORIGIN,
    ip: '5.5.5.5',
    body: JSON.stringify({
      idempotencyKey: 'key-0000000000000009',
      startedAt: Date.now() + 1e12,
      ...person,
      category: 'general',
      message: 'Buy now!!!',
    }),
  });
  assert.equal(tooFast.status, 200);
  assert.equal(h.sent.length, 0);
});

test('an address gets five deliveries an hour, then waits', async () => {
  const h = handler();
  for (let i = 0; i < 5; i += 1) {
    const r = await post(h, {
      idempotencyKey: `key-00000000000000${10 + i}`,
      ...person,
      category: 'general',
      message: 'Message number ' + i,
    });
    assert.equal(r.status, 200);
  }
  const sixth = await post(h, {
    idempotencyKey: 'key-0000000000000099',
    ...person,
    category: 'general',
    message: 'One more message',
  });
  assert.equal(sixth.status, 429);
  assert.equal(
    (
      await post(
        h,
        {
          idempotencyKey: 'key-0000000000000098',
          ...person,
          category: 'general',
          message: 'Other address',
        },
        '9.9.9.9',
      )
    ).status,
    200,
  );
  h.tick(61 * 60 * 1000);
  assert.equal(
    (
      await post(h, {
        idempotencyKey: 'key-0000000000000097',
        ...person,
        category: 'general',
        message: 'An hour later',
      })
    ).status,
    200,
  );
});

test('a failed delivery can be retried with the same key', async () => {
  const failing = handler({ fail: true });
  const data = { ...person, category: 'general', message: 'Is Caelora open source?' };
  assert.equal((await post(failing, data)).status, 502);
  assert.equal((await post(failing, data)).status, 502); // not cached as final
});
