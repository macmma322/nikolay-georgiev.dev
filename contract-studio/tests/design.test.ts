// The studio wears the portfolio's design system, not an imitation of it.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Db } from '../src/db.ts';
import { BASE, fixtures, freshDb, harness, testConfig } from './helpers.ts';

const file = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const studioTokens = readFileSync(file('../assets/tokens.css'), 'utf8');
const studioCss = readFileSync(file('../assets/studio.css'), 'utf8');
const portfolioTokens = file('../../src/styles/tokens.css');

const defined = (css: string) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));

test("tokens.css is the portfolio's own file, byte for byte", (t) => {
  if (!existsSync(portfolioTokens)) return t.skip('portfolio sources not beside the studio');
  assert.equal(
    studioTokens,
    readFileSync(portfolioTokens, 'utf8'),
    'Run `npm run sync:tokens` after changing src/styles/tokens.css',
  );
});

test('the studio overrides no portfolio token and invents no colour token', () => {
  const portfolio = defined(studioTokens);
  const own = defined(studioCss);
  for (const name of own) assert.ok(!portfolio.has(name), `${name} redefines a portfolio token`);
  // Its own names: the font hooks Astro provides on the portfolio, two
  // semantic aliases of portfolio accents, and the A4 paper.
  assert.deepEqual([...own].sort(), [
    '--btn-bg',
    '--btn-border',
    '--btn-fg',
    '--font-body',
    '--font-cyr',
    '--font-display',
    '--font-mono',
    '--font-mono-cyr',
    '--ok',
    '--paper',
    '--paper-ink',
    '--paper-mark',
    '--warn',
  ]);
  assert.match(studioCss, /--ok: var\(--acc-kobait\)/);
  assert.match(studioCss, /--warn: var\(--acc-malrynth\)/);
});

test('every variable the stylesheet reads exists', () => {
  const known = new Set([...defined(studioTokens), ...defined(studioCss), '--lit', '--plate-lit']);
  for (const [, name] of studioCss.matchAll(/var\((--[\w-]+)/g))
    assert.ok(known.has(name!), `${name} is not defined`);
});

test('transitions use only the portfolio durations and curves', () => {
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}\n/;
  assert.match(studioCss, reduced, 'reduced-motion block present');
  const css = studioCss.replace(reduced, '');
  const transitions = [...css.matchAll(/transition(?:-[\w-]+)?\s*:([^;]*);/g)].map((m) => m[1]);
  assert.ok(transitions.length > 10);
  for (const value of transitions) {
    const raw = value!.replace(/var\([^)]*\)/g, '');
    assert.doesNotMatch(raw, /\d+m?s\b/, `raw duration in: ${value}`);
    assert.doesNotMatch(raw, /cubic-bezier|\bease\b|ease-in|\blinear\b/, `raw curve in: ${value}`);
  }
});

test('one committed dark theme, with paper that stays paper', () => {
  assert.match(studioTokens, /color-scheme: dark/);
  const paper = studioCss.match(/\.paper \{[^}]*\}/)?.[0] ?? '';
  assert.match(paper, /background: var\(--paper\)/);
  assert.match(paper, /color: var\(--paper-ink\)/);
  assert.match(paper, /max-width: 210mm/);
  assert.match(studioCss, /--paper: #fbfaf7/);
});

test('the faces are the portfolio files, Cyrillic mono included', () => {
  for (const family of [
    'Hubot Sans',
    'Mona Sans',
    'Martian Mono',
    'TikTok Sans',
    'Martian Mono Cyrillic',
  ])
    assert.match(studioCss, new RegExp(`font-family: '${family}'`));
});

let db: Db;
let drop: () => Promise<void>;
const config = testConfig();
before(async () => ({ db, drop } = await freshDb()));
after(() => drop());

test('every page loads the shared tokens first, then the studio sheet', async () => {
  const h = harness(db, config);
  await h.login();
  const { contract, clientId, projectId } = await fixtures(db);
  const pages = [
    '',
    '/clients',
    '/clients/new',
    `/clients/${clientId}`,
    '/projects',
    `/projects/${projectId}`,
    '/documents',
    `/documents/${contract.id}`,
    '/assistant',
    '/templates',
    '/settings',
  ];
  for (const path of pages) {
    const body = await (await h.call(path)).text();
    const tokens = body.indexOf(`${BASE}/assets/tokens.css`);
    const studio = body.indexOf(`${BASE}/assets/studio.css`);
    assert.ok(tokens > 0 && studio > tokens, path);
    assert.match(body, /class="site-header"/, path);
    assert.match(body, /class="mark-signal"/, `${path}: the portfolio monogram`);
    assert.match(body, /class="atmosphere"/, path);
    assert.match(body, /popovertarget="studio-menu"/, `${path}: phone menu`);
  }
  for (const path of ['/login', '/logout-failed-is-not-a-page']) {
    const response = await h.call(path, { noCookie: true });
    if (response.status === 200) assert.match(await response.text(), /tokens\.css/);
  }
});

test('shared tokens and the new mono face are served to signed-out pages', async () => {
  const h = harness(db, config);
  for (const [asset, type] of [
    ['tokens.css', 'text/css'],
    ['studio.css', 'text/css'],
    ['martian-cyrillic.woff2', 'font/woff2'],
  ]) {
    const response = await h.call(`/assets/${asset}`, { noCookie: true });
    assert.equal(response.status, 200, asset);
    assert.match(response.headers.get('content-type') ?? '', new RegExp(type!), asset);
  }
});

test('statuses use the portfolio glyph shapes', async () => {
  const h = harness(db, config);
  await h.login();
  const body = await (await h.call('/documents')).text();
  assert.match(body, /class="badge shape-hollow s-draft"/);
  assert.match(body, /<svg\s+class="glyph"/);
});
