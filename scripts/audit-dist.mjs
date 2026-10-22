// Post-build audit of dist/: secret and privacy leaks, per-page SEO (titles,
// descriptions, canonical, hreflang, Open Graph, JSON-LD graph, sitemap) and
// accessibility basics, CSP presence and internal link integrity.
// Exits non-zero on any failure so `npm run build` fails loudly.
//   node scripts/audit-dist.mjs [distDir] [--report]
// --report prints one line per page (URL, lang, title, description length,
// canonical, hreflang).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const report = args.includes('--report');
const distArg = args.find((a) => !a.startsWith('--'));
const dist = distArg ? resolve(distArg) : resolve(import.meta.dirname, '..', 'dist');
if (!existsSync(dist)) {
  console.error(`audit: ${dist} not found, run astro build first`);
  process.exit(1);
}

const ORIGIN = 'https://nikolay-georgiev.dev';
const LANGS = { en: { og: 'en_GB', prefix: '' }, bg: { og: 'bg_BG', prefix: '/bg' } };
const NOT_FOUND = new Set(['404.html', 'bg/404.html']);
const CONTACT = new Set(['contact.html', 'bg/contact.html']);
const CYRILLIC = /[Ѐ-ӿ]/;
const FOREIGN_HOST = /localhost|127\.0\.0\.1|railway\.app/;
// Open Graph cards: /og/<card>-<lang>.<hash>.png, written by scripts/og.mjs.
const OG_CARD = /^\/og\/[a-z0-9-]+-(en|bg)\.[0-9a-f]{10}\.png$/;
const OG_MAX_BYTES = 300 * 1024;
const usedCards = new Set();
/** A PNG's pixel size, from its IHDR chunk. */
const pngSize = (file) => {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})(dist);

const failures = [];
const warnings = [];
const relOf = (file) => relative(dist, file).replaceAll('\\', '/');
const fail = (file, msg) => failures.push(`${relOf(file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relOf(file)}: ${msg}`);

const TEXT = new Set(['.html', '.xml', '.txt', '.js', '.css', '.json', '.webmanifest', '.svg']);
const ALLOWED_EMAILS = new Set(['nikolay.georgiev00@outlook.com']);

const LEAKS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\b(sk|rk)_(live|test)_[0-9A-Za-z]{10,}/, 'Stripe secret key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bgh[pousr]_[0-9A-Za-z]{30,}/, 'GitHub token'],
  [/\bxox[abpr]-[0-9A-Za-z-]{10,}/, 'Slack token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\bsk-(proj-)?[0-9A-Za-z_-]{20,}/, 'OpenAI-style key'],
  [/[A-Za-z]:\\Users\\/, 'Windows user path'],
  [/(?<![\w.-])\/(home|root|Users)\/[\w.-]+/, 'local filesystem path'],
  [/railway\.internal/, 'Railway private hostname'],
  [/abv\.bg|macmma422@/, 'private email'],
  [/\.env(\.|\b)/, 'env file reference'],
];

// Bulgarian numbers in international (+359 / 00359) and national (08x, 09x)
// form, with any mix of spaces, dots, dashes or brackets. The owner's number
// may appear only in the body of the two contact pages, never in <head>,
// JSON-LD, scripts, styles, the sitemap or any other page. The second pattern
// also catches it without a prefix ("89 367 0247").
const PHONE = /(?:\+|00)359[\s().-]*\d(?:[\s().-]*\d){7,8}|\b0[89]\d(?:[\s-]?\d){6,7}\b/g;
const OWNER_CORE =
  /8[\s().-]*9[\s().-]*3[\s().-]*6[\s().-]*7[\s().-]*0[\s().-]*2[\s().-]*4[\s().-]*7/g;
const OWNER = '359893670247';
const normalizePhone = (s) => s.replace(/\D/g, '').replace(/^00/, '').replace(/^0/, '359');

function checkPhones(file, text) {
  const rel = relOf(file);
  const bodyStart = rel.endsWith('.html') ? text.indexOf('</head>') : -1;
  const jsonLd = [...text.matchAll(/<script type="application\/ld\+json"[\s\S]*?<\/script>/g)].map(
    (m) => [m.index, m.index + m[0].length],
  );
  const allowed = (index, owner) =>
    owner &&
    CONTACT.has(rel) &&
    bodyStart !== -1 &&
    index > bodyStart &&
    !jsonLd.some(([a, b]) => index >= a && index < b);
  for (const m of text.matchAll(PHONE)) {
    if (!allowed(m.index, normalizePhone(m[0]) === OWNER)) {
      fail(file, `phone number "${m[0].slice(0, 6)}…" outside the contact page body`);
    }
  }
  for (const m of text.matchAll(OWNER_CORE)) {
    if (!allowed(m.index, true)) fail(file, 'owner phone number outside the contact page body');
  }
}

const htmlPages = [];
const sitemaps = [];

for (const file of files) {
  const ext = extname(file);
  const rel = relOf(file);
  if (/\.(map|env)$/.test(file) || rel.startsWith('.env')) fail(file, 'forbidden file in output');
  if (!TEXT.has(ext)) continue;
  const text = readFileSync(file, 'utf8');

  for (const [re, what] of LEAKS) {
    const m = text.match(re);
    if (m) fail(file, `possible ${what}: "${m[0].slice(0, 40)}"`);
  }
  checkPhones(file, text);
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) {
    const email = m[0].replace(/\.$/, '');
    if (/\.(png|webp|svg|jpg|woff2|js|css)$/.test(email)) continue;
    if (!ALLOWED_EMAILS.has(email)) fail(file, `unexpected email address "${email}"`);
  }
  if (ext === '.html') htmlPages.push([file, text]);
  if (/^sitemap-\d+\.xml$/.test(rel)) sitemaps.push([file, text]);
}

const exists = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  if (clean === '' || clean === '/') return existsSync(join(dist, 'index.html'));
  const base = join(dist, clean);
  // A bare directory is not a page: /bg must resolve to bg.html, not to dist/bg/.
  return (
    (existsSync(base) && statSync(base).isFile()) ||
    existsSync(`${base}.html`) ||
    existsSync(join(base, 'index.html'))
  );
};

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();
const meta = (html, attr, key) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};
/** The canonical URL a built file must declare: /, /bg, /work/jarvis, /bg/work/jarvis. */
const selfUrl = (rel) => {
  const path = `/${rel}`.replace(/\.html$/, '').replace(/\/index$/, '');
  return path === '' || path === '/index' ? `${ORIGIN}/` : `${ORIGIN}${path}`;
};
const onSite = (url) => url === `${ORIGIN}/` || url.startsWith(`${ORIGIN}/`);
const sitePath = (url) => url.slice(ORIGIN.length) || '/';

/** @type {Map<string, {file: string, rel: string, lang: string, title: string, description: string, alternates: Record<string, string>, graph: any[]}>} */
const pages = new Map();
const allIds = new Set();

for (const [file, html] of htmlPages) {
  const rel = relOf(file);
  const is404 = NOT_FOUND.has(rel);
  const lang = rel === 'bg.html' || rel.startsWith('bg/') ? 'bg' : 'en';
  const self = selfUrl(rel);
  const head = html.slice(0, html.indexOf('</head>'));

  const titles = [...html.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => decode(m[1]));
  if (titles.length !== 1) fail(file, `expected one <title>, found ${titles.length}`);
  const title = titles[0] ?? '';
  const description = meta(html, 'name', 'description') ?? '';
  if (description.length < 50 || description.length > 170)
    fail(file, `meta description is ${description.length} characters (50–170)`);
  if (!/<meta http-equiv="content-security-policy"/i.test(html)) fail(file, 'missing CSP meta');
  if (!html.includes(`<html lang="${lang}"`)) fail(file, `missing lang="${lang}"`);
  if (/<meta name="keywords"/i.test(html)) fail(file, 'meta keywords');
  const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)];
  if (h1s.length !== 1) fail(file, `expected one <h1>, found ${h1s.length}`);
  if (/\sstyle="/.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')))
    fail(file, 'inline style attribute (blocked by CSP)');
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt(="|\s|>|$)/.test(m[0])) fail(file, `img without alt: ${m[0].slice(0, 80)}`);
  }
  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(href)) continue;
    if (!href.startsWith('/')) continue;
    if (!exists(href)) fail(file, `broken internal link ${href}`);
  }
  // Pages link within their own locale; only the language switch (hreflang)
  // and files such as the CV cross over.
  for (const [tag, href] of html.matchAll(/<a\b[^>]*?\shref="(\/[^"]*)"[^>]*>/g)) {
    if (/\.\w+(?=$|[?#])/.test(href)) continue;
    const target = /^\/bg(?=$|[/?#])/.test(href) ? 'bg' : 'en';
    if (target !== lang && !new RegExp(`\\shreflang="${target}"`).test(tag))
      fail(file, `link to the ${target} page ${href}`);
  }
  for (const m of html.matchAll(/\shref="#([^"]+)"/g)) {
    const id = m[1];
    if (id === 'main' || id === 'contact') continue;
    if (!new RegExp(`\\sid="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
      fail(file, `anchor #${id} has no target on the page`);
    }
  }

  // Language of the text.
  if (lang === 'bg') {
    if (!CYRILLIC.test(title)) fail(file, `Bulgarian page with a non-Bulgarian title "${title}"`);
    if (!CYRILLIC.test(description)) fail(file, 'Bulgarian page with a non-Bulgarian description');
    const h1 = decode(h1s[0]?.[0] ?? '');
    const lede = html.match(/<(\w+)[^>]*data-vt-lang="lede"[^>]*>([\s\S]*?)<\/\1>/);
    if (!CYRILLIC.test(h1) && !CYRILLIC.test(decode(lede?.[2] ?? '')))
      fail(file, 'Bulgarian page with neither a Bulgarian h1 nor a Bulgarian lede');
  } else {
    if (CYRILLIC.test(title)) fail(file, 'English page with Cyrillic in the title');
    if (CYRILLIC.test(description)) fail(file, 'English page with Cyrillic in the description');
  }

  // Open Graph.
  const ogLocale = meta(head, 'property', 'og:locale');
  if (ogLocale !== LANGS[lang].og)
    fail(file, `og:locale "${ogLocale}", expected ${LANGS[lang].og}`);
  const ogImage = meta(head, 'property', 'og:image');
  if (!ogImage || !onSite(ogImage) || !exists(sitePath(ogImage)))
    fail(file, `og:image "${ogImage}" is not a file of this site`);
  else {
    const card = sitePath(ogImage);
    usedCards.add(card);
    if (!OG_CARD.test(card)) fail(file, `og:image ${card} is not a content-hashed card`);
    else if (!card.includes(`-${lang}.`)) fail(file, `og:image ${card} is another language's card`);
    const { width, height } = pngSize(join(dist, card));
    for (const [key, want] of [
      ['og:image:width', String(width)],
      ['og:image:height', String(height)],
      ['og:image:type', 'image/png'],
    ]) {
      if (meta(head, 'property', key) !== want) fail(file, `${key} is not ${want}`);
    }
  }
  const alt = meta(head, 'property', 'og:image:alt');
  if (!alt) fail(file, 'missing og:image:alt');
  for (const [key, want] of [
    ['twitter:card', 'summary_large_image'],
    ['twitter:image', ogImage],
    ['twitter:image:alt', alt],
    ['twitter:title', meta(head, 'property', 'og:title')],
    ['twitter:description', meta(head, 'property', 'og:description')],
  ]) {
    if (!want || meta(head, 'name', key) !== want) fail(file, `${key} does not match Open Graph`);
  }
  if (FOREIGN_HOST.test(`${ogImage} ${meta(head, 'name', 'twitter:image')}`))
    fail(file, 'localhost or railway.app in a card URL');

  const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
  const alternates = Object.fromEntries(
    [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)"/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(head);
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ];

  if (is404) {
    if (!noindex) fail(file, '404 page without robots noindex');
    if (canonicals.length || Object.keys(alternates).length)
      fail(file, '404 page with canonical or hreflang');
    if (blocks.length) fail(file, '404 page with JSON-LD');
    continue;
  }

  if (noindex) fail(file, 'indexable page with robots noindex');
  if (canonicals.length !== 1 || canonicals[0] !== self)
    fail(file, `canonical ${canonicals.join(', ') || 'missing'}, expected ${self}`);
  if (meta(head, 'property', 'og:url') !== self) fail(file, 'og:url is not the canonical URL');
  const urls = [
    ...canonicals,
    ...Object.values(alternates),
    meta(head, 'property', 'og:url') ?? '',
  ];
  if (urls.some((u) => FOREIGN_HOST.test(u)))
    fail(file, 'localhost or railway.app in canonical/hreflang/og:url');
  for (const code of [...Object.keys(LANGS), 'x-default']) {
    const href = alternates[code];
    if (!href) fail(file, `missing hreflang ${code}`);
    else if (!onSite(href) || !exists(sitePath(href)))
      fail(file, `hreflang ${code} "${href}" is not a page of this site`);
  }
  if (alternates[lang] !== self) fail(file, `hreflang ${lang} does not point to the page itself`);
  if (alternates['x-default'] !== alternates.en)
    fail(file, 'hreflang x-default is not the English page');
  if (Object.keys(alternates).some((code) => !(code in LANGS) && code !== 'x-default'))
    fail(file, `unexpected hreflang ${Object.keys(alternates).join(', ')}`);

  // JSON-LD: one @graph per page.
  let graph = [];
  if (blocks.length !== 1) fail(file, `expected one JSON-LD block, found ${blocks.length}`);
  for (const [, body] of blocks) {
    if (FOREIGN_HOST.test(body)) fail(file, 'localhost or railway.app in JSON-LD');
    try {
      const data = JSON.parse(body);
      if (data['@context'] !== 'https://schema.org' || !Array.isArray(data['@graph']))
        fail(file, 'JSON-LD is not a schema.org @graph');
      else graph = data['@graph'];
    } catch (error) {
      fail(file, `JSON-LD does not parse: ${error.message}`);
    }
  }
  for (const node of graph) if (node['@id']) allIds.add(node['@id']);

  if (title.length > 70) fail(file, `title is ${title.length} characters (max 70): "${title}"`);
  else if (title.length > 60)
    warn(file, `title is ${title.length} characters (aim for 60): "${title}"`);

  pages.set(self, { file, rel, lang, title, description, alternates, graph });
}

// Reciprocal hreflang: every alternate names this page back.
for (const [url, page] of pages) {
  for (const code of Object.keys(LANGS)) {
    const other = pages.get(page.alternates[code]);
    if (!other)
      fail(page.file, `hreflang ${code} points to ${page.alternates[code]}, not an indexable page`);
    else if (other.alternates[page.lang] !== url)
      fail(page.file, `hreflang ${code} page does not link back (${other.alternates[page.lang]})`);
  }
}

// Titles and descriptions are unique across indexable pages.
for (const key of ['title', 'description']) {
  const seen = new Map();
  for (const page of pages.values()) {
    const prev = seen.get(page[key]);
    if (prev) fail(page.file, `duplicate ${key} (also ${prev})`);
    else seen.set(page[key], page.rel);
  }
}

// Graph coherence.
const REQUIRED = {
  Person: ['name', 'url'],
  WebSite: ['name', 'url', 'inLanguage'],
  WebPage: ['url', 'name', 'inLanguage', 'isPartOf'],
  CollectionPage: ['url', 'name', 'inLanguage', 'isPartOf', 'breadcrumb'],
  ProfilePage: ['url', 'name', 'inLanguage', 'isPartOf', 'mainEntity', 'breadcrumb'],
  ContactPage: ['url', 'name', 'inLanguage', 'isPartOf', 'breadcrumb'],
  BreadcrumbList: ['itemListElement'],
  CreativeWork: ['name', 'description', 'author', 'mainEntityOfPage', 'inLanguage'],
  SoftwareSourceCode: ['name', 'description', 'author', 'mainEntityOfPage', 'inLanguage'],
};
const isRef = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).join() === '@id';

for (const [url, { file, rel, lang, graph }] of pages) {
  const ids = new Set();
  for (const node of graph) {
    const type = node['@type'];
    if (!REQUIRED[type]) fail(file, `JSON-LD: unexpected @type ${type}`);
    if (!node['@id']) fail(file, `JSON-LD: ${type} without @id`);
    else if (ids.has(node['@id'])) fail(file, `JSON-LD: duplicate @id ${node['@id']}`);
    ids.add(node['@id']);
    for (const prop of REQUIRED[type] ?? []) {
      if (node[prop] === undefined) fail(file, `JSON-LD: ${type} without ${prop}`);
    }
  }
  const walk = (value, where) => {
    if (value === null || value === '' || (Array.isArray(value) && !value.length))
      return fail(file, `JSON-LD: empty value at ${where}`);
    if (typeof value === 'string' && /undefined|\[object Object\]|NaN/.test(value))
      return fail(file, `JSON-LD: suspicious value at ${where}: ${value}`);
    // Every URL on this site (pages, the portrait, cards) must be a built file.
    if (typeof value === 'string' && onSite(value) && !exists(sitePath(value)))
      return fail(file, `JSON-LD: ${value} at ${where} is not a file of this site`);
    if (isRef(value)) {
      const id = value['@id'];
      if (!ids.has(id) && !(allIds.has(id) && onSite(id)))
        fail(file, `JSON-LD: reference ${id} at ${where} resolves nowhere`);
      return;
    }
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${where}[${i}]`));
    if (typeof value === 'object') {
      if (!Object.keys(value).length) return fail(file, `JSON-LD: empty object at ${where}`);
      for (const [k, v] of Object.entries(value)) {
        if (/telephone|faxNumber/i.test(k)) fail(file, `JSON-LD: ${k} is not allowed`);
        walk(v, `${where}.${k}`);
      }
    }
  };
  graph.forEach((node, i) => walk(node, `@graph[${i}]`));

  const byType = (type) => graph.filter((n) => n['@type'] === type);
  const pageNode = graph.find((n) => n['@id'] === url);
  const section = rel.replace(/^bg(\.html|\/)/, '').replace(/\.html$/, '');
  if (!pageNode) fail(file, 'JSON-LD: no page node with the canonical URL as @id');
  else if (pageNode.inLanguage !== lang)
    fail(file, `JSON-LD: page inLanguage ${pageNode.inLanguage}`);
  if (byType('Person').length !== 1) fail(file, 'JSON-LD: expected one Person');
  const home = section === '' || section === 'index';
  if (home !== (byType('WebSite').length === 1))
    fail(file, 'JSON-LD: WebSite belongs on home pages only');
  if (section === 'about' && pageNode?.['@type'] !== 'ProfilePage')
    fail(file, 'JSON-LD: /about is not a ProfilePage');
  if (section === 'contact' && pageNode?.['@type'] !== 'ContactPage')
    fail(file, 'JSON-LD: /contact is not a ContactPage');
  if (!home) {
    const crumbs = byType('BreadcrumbList')[0]?.itemListElement ?? [];
    if (crumbs.at(-1)?.item !== url) fail(file, 'JSON-LD: breadcrumb does not end at this page');
    crumbs.forEach((c, i) => {
      if (c.position !== i + 1 || !c.name || !pages.has(c.item))
        fail(file, `JSON-LD: breadcrumb item ${i + 1} is not an indexable page of this locale`);
      else if (pages.get(c.item).lang !== lang)
        fail(file, `JSON-LD: breadcrumb item ${i + 1} in another language`);
    });
  }
  if (section.startsWith('work/')) {
    const project = graph.find((n) => n['@id'] === `${url}#project`);
    if (!project) fail(file, 'JSON-LD: case study without its #project node');
    else if (project.mainEntityOfPage?.['@id'] !== url)
      fail(file, 'JSON-LD: #project mainEntityOfPage');
  }
}

// Sitemap: exactly the indexable canonical URLs, with the same alternates.
if (!existsSync(join(dist, 'sitemap-index.xml'))) failures.push('sitemap-index.xml: missing');
const listed = new Set();
for (const [file, xml] of sitemaps) {
  if (/<lastmod>|<priority>|<changefreq>/.test(xml)) fail(file, 'lastmod, priority or changefreq');
  for (const [, entry] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
    listed.add(loc);
    if (FOREIGN_HOST.test(entry)) fail(file, `localhost or railway.app in ${loc}`);
    const page = pages.get(loc);
    if (!page) {
      fail(file, `${loc} is not an indexable page`);
      continue;
    }
    const links = Object.fromEntries(
      [...entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
    );
    if (
      JSON.stringify(links, Object.keys(links).sort()) !==
      JSON.stringify(page.alternates, Object.keys(page.alternates).sort())
    )
      fail(file, `${loc}: alternates differ from the page's hreflang`);
  }
}
for (const url of pages.keys()) if (!listed.has(url)) failures.push(`sitemap: ${url} is missing`);
for (const rel of NOT_FOUND) if (!existsSync(join(dist, rel))) failures.push(`${rel}: missing`);

// Every card: hashed name, 1200x630, within budget, used by some page.
const ogDir = join(dist, 'og');
for (const name of existsSync(ogDir) ? readdirSync(ogDir) : []) {
  const card = `/og/${name}`;
  if (!OG_CARD.test(card)) failures.push(`${card}: not a content-hashed card`);
  const { width, height } = pngSize(join(ogDir, name));
  if (width !== 1200 || height !== 630) failures.push(`${card}: ${width}x${height}, not 1200x630`);
  const bytes = statSync(join(ogDir, name)).size;
  if (bytes > OG_MAX_BYTES) failures.push(`${card}: ${(bytes / 1024) | 0} KB, over 300 KB`);
  if (!usedCards.has(card)) failures.push(`${card}: no page uses it (run npm run og)`);
}
// Caddy's legacy redirects into /og/ must land on a current card.
const caddy = join(import.meta.dirname, '..', 'Caddyfile');
if (existsSync(caddy)) {
  for (const [, target] of readFileSync(caddy, 'utf8').matchAll(/\s(\/og\/[\w.-]+\.png)\b/g)) {
    if (!existsSync(join(dist, target)))
      failures.push(`Caddyfile: redirect target ${target} missing`);
  }
}

if (report) {
  const rows = [...pages.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [url, p] of rows) {
    console.log(
      [
        url.replace(ORIGIN, '') || '/',
        p.lang,
        `${p.title.length}`.padStart(2),
        p.title,
        `desc ${p.description.length}`,
        'canonical=self',
        `hreflang ${Object.entries(p.alternates)
          .map(([k, v]) => `${k}:${v.replace(ORIGIN, '') || '/'}`)
          .join(' ')}`,
      ].join(' | '),
    );
  }
}

const count = htmlPages.length;
for (const w of warnings) console.warn(`audit warning: ${w}`);
if (failures.length) {
  console.error(
    `audit: ${failures.length} problem(s) in ${count} pages\n  ${failures.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(
  `audit: ${files.length} files, ${count} pages (${pages.size} indexable), no leaks; SEO, hreflang, JSON-LD, sitemap, a11y basics and links OK`,
);
