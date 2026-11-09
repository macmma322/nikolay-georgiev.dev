import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  exportVersion,
  saveManualVersion,
  transition,
  approveCurrent,
  getContract,
} from '../src/contracts.ts';
import { many, type Db } from '../src/db.ts';
import { renderDocx, renderPdf } from '../src/exporters.ts';
import { buildDocument, type DocumentModel } from '../src/render.ts';
import { completeTerms, fixtures, freshDb, testConfig } from './helpers.ts';

let db: Db;
let drop: () => Promise<void>;
const config = testConfig();
before(async () => ({ db, drop } = await freshDb()));
after(() => drop());

const options = { draft: false, timestamp: new Date('2026-11-09T10:00:00Z'), pageNumbers: true };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function readPdf(bytes: Uint8Array) {
  const doc = await getDocument({ data: bytes.slice(), useSystemFonts: false, verbosity: 0 })
    .promise;
  const pages: string[] = [];
  let size: number[] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    size = page.view;
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return { pages, text: pages.join('\n'), size, count: doc.numPages };
}

const model = (over: Partial<DocumentModel> = {}): DocumentModel => ({
  lang: 'bg',
  title: 'ДОГОВОР ЗА ИЗРАБОТКА НА СОФТУЕР',
  missing: [],
  blocks: [
    { t: 'title', text: 'ДОГОВОР ЗА ИЗРАБОТКА НА СОФТУЕР' },
    { t: 'para', text: 'Шрифтът трябва да показва ъ, ю, я, щ, ж, ѝ и „кавички“ правилно.' },
    { t: 'section', text: 'ПРЕДМЕТ' },
    { t: 'article', label: 'Чл. 1.', text: 'Многоредова\nклауза', items: ['първи', 'втори'] },
    {
      t: 'signatures',
      left: ['ЗА ВЪЗЛОЖИТЕЛЯ', 'Фирма'],
      right: ['ЗА ИЗПЪЛНИТЕЛЯ', 'Тест Тестов'],
    },
  ],
  ...over,
});

test('PDF is A4 and Cyrillic text survives extraction', async () => {
  const { text, size, count } = await readPdf(await renderPdf(model(), options));
  assert.equal(Math.round(size[2]!), 595);
  assert.equal(Math.round(size[3]!), 842);
  assert.equal(count, 1);
  for (const word of [
    'ДОГОВОР',
    'показва',
    'ъ,',
    'ю,',
    'я,',
    'щ,',
    'ж,',
    'ѝ',
    'кавички',
    'Чл. 1.',
    'Многоредова',
    'клауза',
    'ЗА ИЗПЪЛНИТЕЛЯ',
    'Тест Тестов',
    '1 / 1',
  ]) {
    assert.ok(text.includes(word), word);
  }
  assert.doesNotMatch(text, /�/);
});

test('long documents paginate with numbered pages and keep every article', async () => {
  const blocks = Array.from({ length: 120 }, (_, i) => ({
    t: 'article' as const,
    label: `Чл. ${i + 1}.`,
    text: 'Дълъг текст на клаузата, който се пренася на няколко реда. '.repeat(5),
    items: [],
  }));
  const { pages, count, text } = await readPdf(await renderPdf(model({ blocks }), options));
  assert.ok(count > 3);
  assert.ok(text.includes('Чл. 120.'));
  assert.ok(pages[0]!.includes(`1 / ${count}`));
  assert.ok(pages[count - 1]!.includes(`${count} / ${count}`));
});

test('very long names and unbroken tokens do not overflow or crash', async () => {
  const long =
    'Многодългоимеизцялобезинтервалкоетонесепобираведнаколонанастраницатаинетрябвадачупиизхода'.repeat(
      3,
    );
  const bytes = await renderPdf(
    model({
      blocks: [
        { t: 'title', text: long },
        { t: 'para', text: long },
        { t: 'signatures', left: ['ЗА ВЪЗЛОЖИТЕЛЯ', long], right: ['ЗА ИЗПЪЛНИТЕЛЯ', 'X'] },
      ],
    }),
    options,
  );
  const { count } = await readPdf(bytes);
  assert.ok(count >= 1);
  assert.ok(await renderDocx(model({ blocks: [{ t: 'para', text: long }] }), options));
});

test('empty optional fields and an empty document render', async () => {
  assert.ok((await readPdf(await renderPdf(model({ blocks: [] }), options))).count >= 1);
  assert.ok((await renderDocx(model({ blocks: [] }), options)).length > 100);
});

test('draft mark appears only on drafts', async () => {
  const draft = await readPdf(await renderPdf(model(), { ...options, draft: true }));
  assert.ok(draft.text.includes('ЧЕРНОВА'));
  const final = await readPdf(await renderPdf(model(), options));
  assert.ok(!final.text.includes('ЧЕРНОВА'));
});

test('PDF rendering is deterministic', async () => {
  assert.equal(sha(await renderPdf(model(), options)), sha(await renderPdf(model(), options)));
});

test('DOCX is a valid package with A4 page, Cyrillic, numbering and signatures', async () => {
  const zip = await JSZip.loadAsync(await renderDocx(model(), options));
  assert.ok(zip.file('[Content_Types].xml'));
  assert.ok(zip.file('word/numbering.xml'));
  const xml = await zip.file('word/document.xml')!.async('string');
  assert.match(xml, /w:w="11906"/);
  assert.match(xml, /w:h="16838"/);
  for (const word of ['ДОГОВОР', 'ъ, ю, я', 'Чл. 1.', 'ЗА ИЗПЪЛНИТЕЛЯ', 'Тест Тестов'])
    assert.ok(xml.includes(word), word);
  assert.ok(xml.includes('<w:numPr>'));
  const opens = (xml.match(/<w:p[ >]/g) ?? []).length;
  const closes = (xml.match(/<\/w:p>/g) ?? []).length + (xml.match(/<w:p [^>]*\/>/g) ?? []).length;
  assert.equal(opens, closes);
});

test('every real template exports to both formats without leftovers', async () => {
  const { readTemplateFiles, clausesFromTemplate } = await import('../src/templates.ts');
  const { contractContent } = await import('../src/schema.ts');
  for (const file of await readTemplateFiles()) {
    const content = contractContent.parse({
      template_key: file.key,
      template_version: file.version,
      lang: file.lang,
      title: file.title,
      reference: 'CS-2026-0001',
      contract_date: '2026-12-01',
      place: 'Варна',
      contractor: { kind: 'individual', name: 'Тест Тестов' },
      client: { kind: 'legal_entity', name: 'Фирма', representative: 'Иван' },
      project: { title: 'Проект', description: 'Описание' },
      terms: completeTerms,
      clauses: clausesFromTemplate(file, false),
      parent: { reference: 'CS-2026-0000', date: '2026-01-01', title: 'Договор' },
      change: {
        description: 'Промяна',
        price: 100,
        delivery_date: '2027-01-01',
        deliverables: ['Нещо'],
      },
      settlement: {
        amount: 100,
        due_date: '2027-01-01',
        reason: 'Причина',
        instalments: ['Вноска'],
      },
    });
    const built = buildDocument(content);
    const { text } = await readPdf(await renderPdf(built, options));
    assert.doesNotMatch(text, /\{\{/, file.key);
    assert.ok((await renderDocx(built, options)).length > 1000, file.key);
    if (file.key !== 'acceptance-protocol')
      assert.deepEqual(built.missing, [], `${file.key}.${file.lang}`);
  }
});

test('exports are stored once, tied to their version, and checksum-verified', async () => {
  const { contract } = await fixtures(db);
  await saveManualVersion(db, contract.id, {
    contract_date: '2026-12-01',
    place: 'Варна',
    terms: completeTerms as never,
    clauses: [],
  });
  await transition(db, contract.id, 'ready_for_review');
  await approveCurrent(db, contract.id, undefined);
  const first = await exportVersion(db, config, contract.id, 2, 'pdf');
  assert.equal(first.row.filename.endsWith('-v2.pdf'), true);
  assert.equal(first.row.sha256, sha(first.bytes));
  assert.equal(first.row.byte_size, first.bytes.length);
  assert.equal((await getContract(db, contract.id))?.status, 'exported');
  const again = await exportVersion(db, config, contract.id, 2, 'pdf');
  assert.equal(again.row.id, first.row.id);
  assert.equal(sha(again.bytes), first.row.sha256);
  assert.equal((await many(db, 'select 1 from generated_documents')).length >= 1, true);
  const text = (await readPdf(first.bytes)).text;
  assert.ok(text.includes(contract.reference));
  assert.ok(text.includes('Примерна Фирма ЕООД'));
  assert.ok(!text.includes('ЧЕРНОВА'));
});

test('a tampered stored file is refused', async () => {
  const { contract } = await fixtures(db);
  const first = await exportVersion(db, config, contract.id, 1, 'pdf');
  const { writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  await writeFile(join(config.documentDir, first.row.storage_path), 'tampered');
  await assert.rejects(exportVersion(db, config, contract.id, 1, 'pdf'), /checksum/);
});

test('draft exports are marked and do not advance the contract', async () => {
  const { contract } = await fixtures(db);
  const { bytes } = await exportVersion(db, config, contract.id, 1, 'pdf');
  assert.ok((await readPdf(bytes)).text.includes('ЧЕРНОВА'));
  assert.equal((await getContract(db, contract.id))?.status, 'draft');
});
