// Renders the 1200x630 Open Graph cards. The artwork is not redrawn: each card
// captures the real figure from the built site (a case study's plate, the home
// page's layer stack, the Work index thumbnails), in both languages, so a card
// can never drift from the drawing it stands for. Text uses the site's fonts.
//
//   npm run og   (builds the site, renders public/og/, writes src/data/og.json)
//
// Files are named <card>-<lang>.<content hash>.png: a changed card gets a new
// URL, which is what makes social platforms fetch it again, and lets Caddy
// serve /og/* as immutable. Commit the PNGs, og.json and the Caddyfile.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const outDir = join(root, 'public/og');
if (!existsSync(join(dist, 'index.html'))) throw new Error('og: dist/ missing, run astro build');

const W = 1200;
const H = 630;

// Inline the fonts: a page created with setContent cannot load file:// URLs.
const font = (p) =>
  `data:font/woff2;base64,${readFileSync(join(root, 'node_modules/@fontsource-variable', p)).toString('base64')}`;
// Same Cyrillic range as the site's companion faces (astro.config.mjs).
const CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';

// The project accents (tokens.css).
const ACCENT = {
  zone: '#b289e6',
  jarvis: '#8be2eb',
  ussx: '#80bdfb',
  kobait: '#68ddb8',
  malrynth: '#f6bc5d',
  stemini: '#f2a868',
  steel: '#adc1cd',
};
const SIGNAL = '#f75f4c';

const LOCALES = {
  en: {
    prefix: '',
    text: 'src/content/projects',
    caseStudy: 'Case study',
    home: { eyebrow: 'Varna, Bulgaria', title: 'Nikolay Georgiev', sub: 'Software Engineer' },
    work: { eyebrow: 'Case studies', title: 'Work', sub: 'From web platforms to bare metal' },
  },
  bg: {
    prefix: '/bg',
    text: 'src/content/projects/bg',
    caseStudy: 'Проект',
    home: { eyebrow: 'Варна, България', title: 'Николай Георгиев', sub: 'Софтуерен инженер' },
    work: { eyebrow: 'Проекти', title: 'Проекти', sub: 'От уеб платформи до хардуера' },
  },
};

/** A one-line frontmatter value, unquoted. */
function field(src, key) {
  const front = src.split(/^---\s*$/m)[1] ?? '';
  const m = front.match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  if (!m) return '';
  const v = m[1].trim();
  if (/^[>|]/.test(v)) throw new Error(`og: ${key} must be a one-line value`);
  if (v.startsWith("'")) return v.slice(1, -1).replaceAll("''", "'");
  if (v.startsWith('"')) return JSON.parse(v);
  return v;
}

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

// A static server over dist/ with the site's clean URLs (/work/jarvis -> .html).
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://og').pathname);
  const file = [join(dist, p), join(dist, `${p}.html`), join(dist, p, 'index.html')].find(
    (f) => f.startsWith(dist) && existsSync(f) && statSync(f).isFile(),
  );
  if (!file) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0, '127.0.0.1');
await new Promise((ok) => server.once('listening', ok));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
// Reduced motion: every plate is captured fully drawn, never mid-animation.
// The site page is 2x so the figure stays crisp when the card scales it down.
const site = await browser.newPage({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
});

/** Screenshot one element of a built page as a transparent PNG data URL. */
async function capture(path, selector, { lit = 0, all = false } = {}) {
  await site.goto(base + path, { waitUntil: 'load' });
  await site.evaluate(() => document.fonts.ready);
  const shots = [];
  for (const el of all ? await site.locator(selector).all() : [site.locator(selector).first()]) {
    // Lit (0-1): the drawing takes the project accent, as when its title is hovered.
    if (lit) await el.evaluate((e, v) => e.style.setProperty('--plate-lit', v), String(lit));
    // The card draws its own background; the figure keeps only its lines.
    await el.evaluate((e) => Object.assign(e.style, { transition: 'none', background: 'none' }));
    const png = await el.screenshot({ omitBackground: true, animations: 'disabled' });
    shots.push(`data:image/png;base64,${png.toString('base64')}`);
  }
  return all ? shots : shots[0];
}

const cards = [];
const enDir = join(root, LOCALES.en.text);
const slugs = readdirSync(enDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

for (const [lang, loc] of Object.entries(LOCALES)) {
  cards.push({
    key: 'home',
    lang,
    ...loc.home,
    accent: SIGNAL,
    art: 'stack',
    img: await capture(`${loc.prefix || '/'}`, '.hero .stack'),
  });
  cards.push({
    key: 'work',
    lang,
    ...loc.work,
    accent: SIGNAL,
    art: 'grid',
    img: await capture(`${loc.prefix}/work`, '.thumb .project-plate', { lit: 1, all: true }),
  });
  for (const slug of slugs) {
    const en = readFileSync(join(enDir, `${slug}.md`), 'utf8');
    const file = join(root, loc.text, `${slug}.md`);
    if (!existsSync(file)) {
      console.warn(`og: no ${lang} text for ${slug}, card skipped`);
      continue;
    }
    const src = readFileSync(file, 'utf8');
    const path = `${loc.prefix}/work/${slug}`;
    // Lit as on hover: the frame and wires take the project accent. A partial value
    // mixes hues in oklch (amber through teal), so it is all or nothing.
    const img = await capture(path, '.hero-art .plate-canvas', { lit: 1 });
    // The status as the case study prints it ("Prototype", "In production").
    // Its "Status:" prefix is for screen readers; the eyebrow already reads as one.
    const status = (await site.locator('main .status .label-text').first().innerText())
      .replace(/^[^:]*:\s*/, '')
      .trim();
    cards.push({
      key: slug,
      lang,
      eyebrow: `${loc.caseStudy} · ${status}`,
      // Project names are never translated.
      title: field(en, 'name'),
      sub: field(src, 'kicker'),
      accent: ACCENT[field(en, 'accent')] ?? ACCENT.steel,
      art: 'plate',
      img,
    });
  }
}

// lang drives the fonts' Bulgarian letterforms (locl), as on the site.
const html = (c) => `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:Cyr;src:url(${font('tiktok-sans/files/tiktok-sans-cyrillic-wdth-normal.woff2')}) format('woff2');font-weight:300 900;font-stretch:75% 150%;unicode-range:${CYRILLIC}}
@font-face{font-family:MonoCyr;src:url(${font('martian-mono/files/martian-mono-cyrillic-wght-normal.woff2')}) format('woff2');font-weight:100 800;unicode-range:${CYRILLIC}}
@font-face{font-family:Hubot;src:url(${font('hubot-sans/files/hubot-sans-latin-standard-normal.woff2')}) format('woff2');font-weight:200 900;font-stretch:75% 125%}
@font-face{font-family:Mona;src:url(${font('mona-sans/files/mona-sans-latin-wght-normal.woff2')}) format('woff2');font-weight:200 900}
@font-face{font-family:Martian;src:url(${font('martian-mono/files/martian-mono-latin-wght-normal.woff2')}) format('woff2');font-weight:100 800}
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:#0b0d10;color:#f0ece4;font-family:Cyr,Mona;position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(150,160,175,.06) 1px,transparent 1px),linear-gradient(to bottom,rgba(150,160,175,.06) 1px,transparent 1px);background-size:30px 30px;background-position:-1px -1px;mask-image:radial-gradient(760px 560px at 74% 50%,#000 20%,transparent 75%)}
.glow{position:absolute;left:560px;top:-40px;width:720px;height:720px;border-radius:50%;background:radial-gradient(circle,${c.accent}2e,transparent 62%)}
.corner{position:absolute;width:18px;height:18px;border-color:rgba(173,193,205,.45);border-style:solid;border-width:0}
.tl{left:32px;top:32px;border-left-width:1px;border-top-width:1px}.tr{right:32px;top:32px;border-right-width:1px;border-top-width:1px}
.bl{left:32px;bottom:32px;border-left-width:1px;border-bottom-width:1px}.br{right:32px;bottom:32px;border-right-width:1px;border-bottom-width:1px}
.col{position:absolute;left:72px;top:64px;bottom:64px;width:${{ plate: 456, stack: 470, grid: 440 }[c.art]}px;display:flex;flex-direction:column}
.eyebrow{font-family:MonoCyr,Martian;font-size:18px;letter-spacing:.14em;text-transform:uppercase;color:#9aa1a9;display:flex;align-items:center;gap:14px;white-space:nowrap}
.tick{flex:none;width:30px;height:3px;background:${c.accent}}
h1{margin-top:auto;font-family:Cyr,Hubot;font-stretch:118%;font-weight:780;font-size:112px;line-height:.9;letter-spacing:-.04em;text-transform:${c.art === 'plate' ? 'none' : 'uppercase'};overflow-wrap:normal}
.sub{margin-top:26px;font-family:Cyr,Mona;font-size:36px;font-weight:500;line-height:1.16;letter-spacing:-.01em;color:#d8d3ca;text-wrap:balance}
.foot{margin-top:auto;padding-top:28px;display:flex;flex-direction:column;gap:10px;font-family:MonoCyr,Martian;font-size:17px;letter-spacing:.12em;text-transform:uppercase;color:#9aa1a9}
.mark{display:flex;align-items:center;gap:12px;color:#f0ece4}
.sq{width:12px;height:12px;background:${SIGNAL}}
.art{position:absolute;display:flex;align-items:center;justify-content:center}
.plate{right:56px;top:95px;width:580px;height:440px}
.plate img{width:580px;height:auto}
.stack{right:44px;top:50px;width:600px;height:530px}
.stack img{height:530px;width:auto}
.grid6{right:56px;top:128px;width:636px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.grid6 img{width:100%;height:auto;display:block}
</style></head><body><div class="grid"></div><div class="glow"></div>
<div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
<div class="col"><div class="eyebrow"><span class="tick"></span><span class="eb">${esc(c.eyebrow)}</span></div>
<h1>${esc(c.title)}</h1><p class="sub">${esc(c.sub)}</p>
<div class="foot">${c.key === 'home' ? '' : '<span class="mark"><span class="sq"></span>Nikolay Georgiev</span>'}<span>nikolay-georgiev.dev</span></div></div>
${
  c.art === 'grid'
    ? `<div class="art grid6">${c.img.map((src) => `<img src="${src}">`).join('')}</div>`
    : `<div class="art ${c.art}"><img src="${c.img}"></div>`
}
</body></html>`;

const card = await browser.newPage({ viewport: { width: W, height: H } });
const manifest = { en: {}, bg: {} };
const written = new Set();
mkdirSync(outDir, { recursive: true });
for (const c of cards) {
  await card.setContent(html(c), { waitUntil: 'load' });
  await card.evaluate(() => document.fonts.ready);
  // Long (Bulgarian) text steps down, never clipped: the eyebrow to one line,
  // the title to two lines of the column, then the subline and title together
  // until the column's height fits.
  const size = await card.evaluate(() => {
    const $ = (sel) => document.querySelector(sel);
    const [col, eb, h1, sub] = ['.col', '.eyebrow', 'h1', '.sub'].map($);
    const px = (el) => parseFloat(getComputedStyle(el).fontSize);
    const step = (el, by) => (el.style.fontSize = `${px(el) - by}px`);
    const wide = (el) => el.scrollWidth > col.clientWidth + 0.5;
    const tall = () => col.scrollHeight > col.clientHeight + 0.5;
    const lines = (el) => Math.round(el.offsetHeight / (px(el) * 0.9));
    while (wide(eb) && px(eb) > 13) step(eb, 1);
    while ((wide(h1) || lines(h1) > 2) && px(h1) > 64) step(h1, 2);
    while (tall() && px(sub) > 26) step(sub, 1);
    while (tall() && px(h1) > 64) step(h1, 2);
    if (wide(eb) || wide(h1) || tall()) throw new Error('card text does not fit');
    return [px(h1), px(sub), px(eb)];
  });
  const raw = await card.screenshot();
  // Palette PNG: flat graphite and hairlines quantize without visible loss.
  const png = await sharp(raw).png({ palette: true, quality: 92, effort: 10 }).toBuffer();
  const hash = createHash('sha256').update(png).digest('hex').slice(0, 10);
  const name = `${c.key}-${c.lang}.${hash}.png`;
  writeFileSync(join(outDir, name), png);
  written.add(name);
  manifest[c.lang][c.key] = `/og/${name}`;
  console.log(`og ${name}  ${(png.length / 1024).toFixed(0)} KB  title/sub/eyebrow px ${size}`);
}

// Contact sheet for review: every card at half size, English beside
// Bulgarian, then the home and project cards at 300px, about the width a
// chat app gives a link preview. Not published: og-review/ is ignored.
const pairs = cards
  .filter((c) => c.lang === 'en')
  .map((c) => [manifest.en[c.key], manifest.bg[c.key]]);
const img = (url, w) =>
  `<img width="${w}" src="data:image/png;base64,${readFileSync(join(root, 'public', url)).toString('base64')}">`;
await card.setViewportSize({ width: 1260, height: 400 });
await card.setContent(`<body style="margin:0;padding:20px;background:#1b1e22;color:#9aa1a9;font:13px monospace">
${pairs.map(([en, bg]) => `<div style="display:flex;gap:20px;margin-bottom:6px">${img(en, 600)}${img(bg, 600)}</div><p style="margin:0 0 16px">${en} · ${bg}</p>`).join('')}
<div style="display:flex;flex-wrap:wrap;gap:12px">${pairs.map(([en]) => img(en, 300)).join('')}</div></body>`);
mkdirSync(join(root, 'og-review'), { recursive: true });
await card.screenshot({ path: join(root, 'og-review/og-contact-sheet.png'), fullPage: true });

await browser.close();
server.close();

// Only the current cards stay: old names would otherwise ship forever.
for (const name of readdirSync(outDir)) {
  if (!written.has(name)) rmSync(join(outDir, name), { recursive: true });
}
writeFileSync(join(root, 'src/data/og.json'), `${JSON.stringify(manifest, null, 2)}\n`);
// The old site's card URL (Caddyfile legacy map) follows the English home card.
const caddyfile = join(root, 'Caddyfile');
writeFileSync(
  caddyfile,
  readFileSync(caddyfile, 'utf8').replace(/(\/opengraph-image )\/og\/\S+/, `$1${manifest.en.home}`),
);
