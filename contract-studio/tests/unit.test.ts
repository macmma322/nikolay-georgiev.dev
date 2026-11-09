import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateCostUsd } from '../src/ai.ts';
import { RateLimiter } from '../src/auth.ts';
import {
  applyManualEdit,
  applyProposalContent,
  approvalProblems,
  canTransition,
  groundProposal,
  isEditable,
  paymentProblems,
  STATUSES,
  TRANSITIONS,
} from '../src/contracts.ts';
import { buildDocument, safeFilename, toHtml } from '../src/render.ts';
import {
  clientInput,
  contractContent,
  contractProposal,
  projectInput,
  scopeAssessment,
  terms,
} from '../src/schema.ts';
import { clausesFromTemplate, readTemplateFiles, unknownPlaceholders } from '../src/templates.ts';

const files = await readTemplateFiles();
const software = files.find((f) => f.key === 'software-development' && f.lang === 'bg')!;
const base = contractContent.parse({
  template_key: software.key,
  template_version: software.version,
  lang: 'bg',
  title: software.title,
  reference: 'CS-2026-0001',
  contractor: { kind: 'individual', name: 'Тест Тестов', address: 'Варна' },
  client: { kind: 'legal_entity', name: 'Примерна Фирма', address: 'София', eik: '123456789' },
  project: { title: 'Проект' },
  terms: { currency: 'EUR' },
  clauses: clausesFromTemplate(software, false),
});

test('client validation', () => {
  assert.equal(clientInput.safeParse({ kind: 'individual', name: '' }).success, false);
  assert.equal(clientInput.safeParse({ kind: 'robot', name: 'x' }).success, false);
  assert.equal(
    clientInput.safeParse({ kind: 'legal_entity', name: 'x', eik: '12' }).success,
    false,
  );
  assert.equal(
    clientInput.safeParse({ kind: 'legal_entity', name: 'x', email: 'nope' }).success,
    false,
  );
  const ok = clientInput.parse({
    kind: 'legal_entity',
    name: ' Фирма ',
    eik: '123456789',
    email: '',
    country: 'bg',
  });
  assert.equal(ok.name, 'Фирма');
  assert.equal(ok.country, 'BG');
  assert.equal(ok.email, undefined);
});

test('EGN is never required for a client', () => {
  assert.equal(clientInput.safeParse({ kind: 'individual', name: 'Иван Иванов' }).success, true);
});

test('project and contract field validation', () => {
  assert.equal(projectInput.safeParse({ client_id: 'x', title: 't' }).success, false);
  assert.equal(terms.safeParse({ price_amount: -5 }).success, false);
  assert.equal(terms.safeParse({ start_date: '12/01/2026' }).success, false);
  assert.equal(terms.safeParse({ currency: 'EURO' }).success, false);
  assert.equal(terms.safeParse({ hacker_field: 1 }).success, false);
  assert.deepEqual(terms.parse({ price_amount: '' }).price_amount, undefined);
});

test('status transitions follow the policy', () => {
  assert.equal(canTransition('draft', 'ready_for_review'), true);
  assert.equal(canTransition('draft', 'signed'), false);
  assert.equal(canTransition('draft', 'approved'), false, 'approval has its own checked path');
  assert.equal(canTransition('ready_for_review', 'approved'), false);
  assert.equal(canTransition('sent', 'signed'), true);
  assert.equal(canTransition('signed', 'draft'), false);
  assert.deepEqual(TRANSITIONS.archived, []);
  for (const status of STATUSES) assert.ok(TRANSITIONS[status], status);
  for (const status of ['signed', 'active', 'completed', 'terminated', 'archived'] as const)
    assert.equal(isEditable(status), false);
  for (const status of ['draft', 'approved', 'exported', 'sent'] as const)
    assert.equal(isEditable(status), true);
});

test('all templates load, stay unreviewed and match across languages', () => {
  assert.equal(files.length, 12);
  for (const file of files) {
    assert.equal(file.reviewStatus, 'unreviewed', `${file.key}.${file.lang}`);
    assert.equal(JSON.stringify(file).includes('lawyer-approved'), false);
  }
  for (const key of new Set(files.map((f) => f.key))) {
    const clauseKeys = (lang: string) =>
      files
        .find((f) => f.key === key && f.lang === lang)!
        .sections.flatMap((s) => s.clauses.map((c) => c.key));
    assert.deepEqual(clauseKeys('bg'), clauseKeys('en'), key);
  }
});

test('the contractor is never hardcoded as a company or VAT payer', () => {
  for (const file of files.filter((f) => f.lang === 'bg')) {
    const text = file.sections.flatMap((s) => s.clauses.map((c) => c.text)).join(' ');
    assert.doesNotMatch(text, /Изпълнител[а-я]* е (ЕООД|търговец)|регистриран по ЗДДС/, file.key);
  }
});

test('clause selection: optional clauses start disabled and are left out', () => {
  const disabled = base.clauses.filter((c) => !c.enabled);
  const model = buildDocument({
    ...base,
    clauses: base.clauses.map((c, i) => (i === 0 ? { ...c, enabled: false } : c)),
  });
  const articles = model.blocks.filter((b) => b.t === 'article').length;
  assert.equal(
    articles,
    base.clauses.length - disabled.length - (base.clauses[0]?.enabled ? 1 : 0),
  );
});

test('template rendering marks missing facts instead of inventing them', () => {
  const model = buildDocument(base);
  assert.ok(model.missing.includes('terms.price'));
  assert.ok(model.missing.includes('terms.delivery_date'));
  const html = toHtml(model);
  assert.match(html, /<mark>\[ЛИПСВА: Цена\]<\/mark>/);
  assert.ok(approvalProblems(base).length > 0);
  assert.doesNotMatch(html, /\{\{/);
});

test('rendered output escapes hostile values', () => {
  const html = toHtml(
    buildDocument({ ...base, client: { ...base.client, name: '<script>alert(1)</script>' } }),
  );
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&#60;script&#62;/);
});

test('money carries the contract currency exactly once', () => {
  const model = buildDocument({
    ...base,
    terms: { ...base.terms, price_amount: 2500, price_basis: 'бруто' },
  });
  const clause = model.blocks.find((b) => b.t === 'article' && b.text.includes('2500,00'));
  assert.ok(clause && clause.t === 'article');
  assert.equal(clause.text.match(/EUR/g)?.length, 1);
});

test('a date at the end of a sentence has one full stop', () => {
  const text = toHtml(
    buildDocument({ ...base, terms: { ...base.terms, delivery_date: '2027-03-01' } }),
  );
  assert.match(text, /01\.03\.2027 г\./);
  assert.doesNotMatch(text, /г\.\./);
});

test('payment milestones must add up to the price', () => {
  const schedule = [
    { label: 'a', amount: 1000, due: '' },
    { label: 'b', amount: 1000, due: '' },
  ];
  assert.equal(
    paymentProblems({ ...base.terms, price_amount: 2500, payment_schedule: schedule }).length,
    1,
  );
  assert.equal(
    paymentProblems({ ...base.terms, price_amount: 2000, payment_schedule: schedule }).length,
    0,
  );
});

test('filenames are ASCII, bounded and identifier free', () => {
  assert.equal(
    safeFilename('software-development', 'CS-2026-0001', 3, 'pdf'),
    'software-development-CS-2026-0001-v3.pdf',
  );
  assert.equal(safeFilename('../../etc', 'a/b\\c"d', 1, 'pdf'), 'etc-a-b-c-d-v1.pdf');
  assert.match(safeFilename('Иван', 'Договор', 1, 'docx'), /^contract-draft-v1\.docx$/);
});

test('manual edits mark changed clauses and reject unknown placeholders', () => {
  const key = base.clauses[0]!.key;
  const edited = applyManualEdit(base, {
    terms: base.terms,
    clauses: [{ key, text: 'Нов текст', enabled: true }],
  });
  assert.equal(edited.clauses[0]!.origin, 'manual');
  assert.equal(edited.clauses[1]!.origin, 'template');
  assert.throws(() =>
    applyManualEdit(base, {
      terms: base.terms,
      clauses: [{ key, text: '{{client.egn}}', enabled: true }],
    }),
  );
  assert.deepEqual(unknownPlaceholders('{{client.name}} {{evil}}'), ['evil']);
});

test('proposals cannot reach outside the allowed fields', () => {
  assert.equal(
    contractProposal.safeParse({ summary: 'x', contractor: { name: 'Fake' } }).success,
    false,
  );
  assert.equal(
    contractProposal.safeParse({ summary: 'x', set_terms: { status: 'approved' } }).success,
    false,
  );
  assert.equal(
    contractProposal.safeParse({ summary: 'x', sql: 'drop table clients' }).success,
    false,
  );
  assert.equal(
    scopeAssessment.safeParse({
      title: 't',
      request_summary: 'r',
      classification: 'excluded',
      reasoning: 'x',
      price: 500,
    }).success,
    false,
  );
});

test('applying a proposal marks AI clauses unreviewed and leaves the base alone', () => {
  const key = base.clauses[0]!.key;
  const proposal = contractProposal.parse({
    summary: 's',
    set_terms: { price_amount: 100 },
    clause_edits: [{ op: 'replace', key, new_text: 'Текст от Claude', reason: 'r' }],
  });
  const next = applyProposalContent(base, proposal);
  assert.equal(next.clauses[0]!.origin, 'ai');
  assert.equal(next.clauses[0]!.review_status, 'unreviewed');
  assert.equal(next.terms.price_amount, 100);
  assert.equal(base.terms.price_amount, undefined);
  assert.notEqual(base.clauses[0]!.text, 'Текст от Claude');
  const bad = contractProposal.parse({
    summary: 's',
    clause_edits: [{ op: 'replace', key: 'nope', new_text: 'x', reason: 'r' }],
  });
  assert.throws(() => applyProposalContent(base, bad));
});

test('amounts nobody stated are dropped and turned into questions', () => {
  const proposal = contractProposal.parse({
    summary: 's',
    set_terms: { price_amount: 7777, payment_schedule: [{ label: 'a', amount: 999, due: '' }] },
  });
  const grounded = groundProposal(proposal, 'Проектът е за €2,500 общо');
  assert.equal(grounded.set_terms.price_amount, undefined);
  assert.equal(grounded.set_terms.payment_schedule, undefined);
  assert.equal(grounded.questions.length, 2);
  for (const source of ['2500', '€2,500', '2 500 лв', '2.500,00']) {
    const ok = groundProposal(
      contractProposal.parse({ summary: 's', set_terms: { price_amount: 2500 } }),
      source,
    );
    assert.equal(ok.set_terms.price_amount, 2500, source);
  }
});

test('rate limiter enforces its window', () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.allow('a', 0), true);
  assert.equal(limiter.allow('a', 1), true);
  assert.equal(limiter.allow('a', 2), false);
  assert.equal(limiter.allow('b', 2), true);
  assert.equal(limiter.allow('a', 1500), true);
});

test('cost estimate applies per-model rates', () => {
  const usage = {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  } as never;
  assert.equal(estimateCostUsd('claude-sonnet-5-5', usage), 12);
  assert.equal(estimateCostUsd('claude-opus-5-5', usage), 24);
});
