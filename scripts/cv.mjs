// Renders the downloadable one-page CV (public/Nikolay-Georgiev-CV.pdf) with
// Playwright and the site fonts. The text is real, selectable PDF text so
// applicant tracking systems can parse it. Run with `npm run cv` after editing
// the content below; the PDF is committed.
//
// The public copy deliberately has no phone number or postal address. Every
// project line matches the verified case studies on the site.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const font = (p) =>
  `data:font/woff2;base64,${readFileSync(join(root, 'node_modules/@fontsource-variable', p)).toString('base64')}`;

const cv = {
  name: 'Nikolay Georgiev',
  headline: 'Software Engineer · React · Next.js · TypeScript · Node.js',
  contact: [
    'Varna, Bulgaria (open to fully remote)',
    'nikolay.georgiev00@outlook.com',
    'linkedin.com/in/nikolaygeorgiev0049',
    'github.com/macmma322',
    'nikolay-georgiev.dev',
  ],
  profile:
    'Software engineer with a Computer Science degree and a year of professional experience delivering and debugging enterprise systems for international clients at DXC Technology. Alongside that, I design and build full-stack products end to end on TypeScript, React, Next.js, Node.js, PostgreSQL and Redis: a community and commerce platform with Stripe payments, realtime messaging and WebRTC calls, and a production education platform delivered for a client. Comfortable owning a feature from database schema through API to accessible UI. Looking for a frontend or full-stack engineering role on a remote or distributed team.',
  skills: [
    [
      'Frontend',
      'React, Next.js (App Router), TypeScript, JavaScript (ES2020+), Tailwind CSS, HTML, CSS, Astro, accessible UI (WCAG, keyboard navigation)',
    ],
    [
      'Backend',
      'Node.js, Express, REST APIs, OpenAPI (contract-first), Socket.IO, WebRTC, Server-Sent Events, BullMQ job queues',
    ],
    ['Data', 'PostgreSQL (raw SQL, schema design, versioned migrations, row locks), Redis'],
    [
      'Security',
      'JWT in HttpOnly cookies, TOTP 2FA, Google OAuth, cross-domain SSO, RBAC, rate limiting, audit logging',
    ],
    [
      'Practices',
      'Git, Linux, CI with GitHub Actions, Docker, Railway, root-cause debugging, code review, Stripe integrations',
    ],
    [
      'Also',
      'C++ on Arduino (embedded), Rust (bare-metal x86-64, learning), local LLMs with llama.cpp, MCP',
    ],
  ],
  experience: [
    {
      title: 'Junior Backend Developer',
      org: 'DXC Technology',
      when: 'Sep 2025 – Present · Varna, BG',
      points: [
        'Develop and maintain backend functionality and web services on a large enterprise insurance platform serving a major French insurance group.',
        'Trace defects through a substantial legacy codebase, perform root-cause analysis and ship fixes under enterprise QA and release processes.',
        'Ramped up in weeks on a proprietary declarative rules language (Prolog-like) with minimal documentation; work daily in English with distributed international teams across development, QA and client stakeholders.',
      ],
    },
    {
      title: 'Content Moderator',
      org: 'Genpact',
      when: 'Oct 2024 – Sep 2025 · Bucharest, RO',
      points: [
        'Reviewed 300–400 user-generated items daily against community policy, sustaining ~90%+ QA accuracy; contributed process improvements adopted for the assigned market.',
      ],
    },
  ],
  projects: [
    {
      title: 'Zone 32-19',
      kind: 'full-stack community and commerce platform · deployed, pre-launch',
      when: 'Feb 2025 – Present',
      points: [
        'Frontend: Next.js App Router with TypeScript and Tailwind; a same-origin BFF proxy for cookie auth; social feed, groups, realtime chat and a 54-page internal employee portal.',
        'Backend and realtime: Node.js/Express modular monolith (39 domain modules) over a two-schema PostgreSQL design with raw SQL and 122 versioned migrations; Socket.IO with a Redis adapter for horizontal scaling; presence, notifications and WebRTC voice and video calls.',
        'Commerce and security: Stripe payments and subscriptions with signature-verified, deduplicated webhooks and a double-entry finance ledger; JWT in HttpOnly cookies, TOTP 2FA, Google OAuth, Redis rate limiting and audit logging.',
        'Deployed on Railway; a Caddy + Coraza WAF gateway is built for the edge. zone-32-19.com',
      ],
    },
    {
      title: 'USS X Academy',
      kind: 'education platform delivered for a client · production',
      when: 'May 2026 – Present',
      points: [
        'Course intakes with server-enforced capacity and pricing, application review, live classrooms on LiveKit with host controls, and single sign-on across domains; designed contract-first against an OpenAPI spec with versioned SQL migrations.',
        'A regional technician directory: an interactive SVG map of all 28 Bulgarian regions with full keyboard access, public region pages, an application flow with image upload and admin approval, rejection and suspension.',
        'Consent-aware analytics and conversion tracking (GA4, Google Ads, GTM, Consent Mode v2). Stack: TypeScript, Next.js, Express, PostgreSQL, Redis, LiveKit.',
      ],
    },
    {
      title: 'KObait',
      kind: 'Remote-control bait boat, embedded · bench prototype',
      when: 'Mar 2026 – Present',
      points: [
        'A two-board embedded system: a boat controller and a handheld remote, joined by a radio link with a protocol of my own.',
        'Safety first: gates in front of the motors, a link-loss failsafe, leak and battery alarms and a hardware watchdog. Bench-tested; water testing is next.',
      ],
    },
  ],
  also: [
    [
      'J.A.R.V.I.S.',
      'local-first AI assistant with compiled authority tiers (TypeScript, Rust/Tauri, Python)',
    ],
    ['Malrynth', 'x86-64 operating system from scratch: Rust UEFI loader and kernel'],
  ],
  education: [
    ['BSc Computer Science', 'University of Ruse "Angel Kanchev", 2019–2023'],
    [
      'Diploma, Mathematics and Informatics',
      '"St. Kliment Ohridski" High School, Silistra, 2012–2019',
    ],
  ],
  certificates: 'AWS Partner: Generative AI Essentials; Agentic AI Essentials',
  languages:
    'Bulgarian (native) · English (fluent, daily working language) · German (A2) · Russian (A1) · Japanese (A1)',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${cv.name} · CV</title><style>
@font-face{font-family:Hubot;src:url(${font('hubot-sans/files/hubot-sans-latin-standard-normal.woff2')}) format('woff2');font-weight:200 900;font-stretch:75% 125%}
@font-face{font-family:Mona;src:url(${font('mona-sans/files/mona-sans-latin-wght-normal.woff2')}) format('woff2');font-weight:200 900}
@font-face{font-family:Martian;src:url(${font('martian-mono/files/martian-mono-latin-wght-normal.woff2')}) format('woff2');font-weight:100 800}
@page{size:A4;margin:10mm 12mm 9mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Mona,sans-serif;font-size:8pt;line-height:1.32;color:#16181c}
header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:7px;border-bottom:1.4px solid #16181c}
h1{font-family:Hubot;font-stretch:116%;font-weight:760;font-size:23pt;letter-spacing:-.03em;line-height:1}
.headline{margin-top:4px;font-family:Martian;font-size:7pt;letter-spacing:.06em;text-transform:uppercase;color:#3b4048}
.contact{text-align:right;font-size:7.6pt;line-height:1.5;color:#3b4048}
.mark{display:inline-block;width:6px;height:6px;background:#e0513f;margin-right:6px;vertical-align:1px}
h2{margin-top:7px;margin-bottom:3px;font-family:Martian;font-size:6.8pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#16181c;display:flex;align-items:center;gap:8px}
h2::after{content:"";flex:1;height:.6px;background:#b9bec6}
.profile{color:#23262b}
.skills{display:grid;grid-template-columns:92px 1fr;gap:1.5px 10px}
.skills dt{font-weight:620}
.item{margin-top:4px;break-inside:avoid}
.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.t{font-family:Hubot;font-stretch:108%;font-weight:680;font-size:9.2pt}
.k{font-weight:450;color:#4a5059;font-size:8pt}
.when{font-family:Martian;font-size:6.8pt;color:#4a5059;white-space:nowrap}
ul{margin-top:2px;list-style:none}
li{position:relative;margin-top:1.4px;padding-left:10px}
li::before{content:"";position:absolute;left:1px;top:.58em;width:3.5px;height:3.5px;background:#8a919b}
.cols{display:grid;grid-template-columns:1.15fr 1fr;gap:0 18px}
.plain div{margin-top:1.5px}
.plain b{font-weight:620}
.muted{color:#4a5059}
</style></head><body>
<header><div><h1>${esc(cv.name)}</h1><p class="headline"><span class="mark"></span>${esc(cv.headline)}</p></div>
<div class="contact">${cv.contact.map(esc).join('<br>')}</div></header>
<h2>Profile</h2><p class="profile">${esc(cv.profile)}</p>
<h2>Technical skills</h2><dl class="skills">${cv.skills.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<h2>Professional experience</h2>${cv.experience
  .map(
    (e) =>
      `<div class="item"><div class="row"><span class="t">${esc(e.title)} <span class="k">· ${esc(e.org)}</span></span><span class="when">${esc(e.when)}</span></div><ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`,
  )
  .join('')}
<h2>Selected projects</h2>${cv.projects
  .map(
    (p) =>
      `<div class="item"><div class="row"><span class="t">${esc(p.title)} <span class="k">· ${esc(p.kind)}</span></span><span class="when">${esc(p.when)}</span></div><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`,
  )
  .join('')}
<div class="plain item">${cv.also.map(([n, d]) => `<div><b>${esc(n)}</b> <span class="muted">· ${esc(d)}</span></div>`).join('')}<div class="muted">Case studies with architecture and status: nikolay-georgiev.dev/work</div></div>
<div class="cols"><div><h2>Education</h2><div class="plain">${cv.education.map(([t, d]) => `<div><b>${esc(t)}</b> <span class="muted">· ${esc(d)}</span></div>`).join('')}<div><b>Certificates</b> <span class="muted">· ${esc(cv.certificates)}</span></div></div></div>
<div><h2>Languages</h2><p>${esc(cv.languages)}</p></div></div>
</body></html>`;

// The public CV must never carry a phone number (same pattern as the dist audit).
const PHONE = /(?:\+|00)359[\s().-]*\d(?:[\s().-]*\d){7,8}|\b0[89]\d(?:[\s-]?\d){6,7}\b/;
const leak = html.replace(/url\(data:[^)]*\)/g, '').match(PHONE);
if (leak) throw new Error(`CV content contains what looks like a phone number: ${leak[0]}`);

const browser = await chromium.launch();
// Viewport = A4 width minus the page margins, so the height check below is real.
const page = await browser.newPage({ viewport: { width: 703, height: 1000 } });
await page.emulateMedia({ media: 'print' });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const height = await page.evaluate(() => document.body.scrollHeight);
const limit = Math.floor(((297 - 19) / 25.4) * 96);
if (height > limit) {
  await browser.close();
  throw new Error(`CV content is ${height}px, over the one-page limit of ${limit}px`);
}
if (process.argv.includes('--png')) {
  await page.screenshot({ path: join(root, 'cv-preview.png'), fullPage: true });
}
const out = join(root, 'public/Nikolay-Georgiev-CV.pdf');
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
  outline: false,
});
await browser.close();
console.log('cv', out, `${height}px of ${limit}px`);
