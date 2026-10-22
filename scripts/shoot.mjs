// Usage: node scripts/shoot.mjs <baseUrl> <outDir> <path1,path2> [w1xh1,w2xh2] [--full]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [
  base = 'http://localhost:4321',
  out = 'shots',
  pathsArg = '/',
  sizesArg = '1440x900,390x844',
  ...flags
] = process.argv.slice(2);
const full = flags.includes('--full');
const reduced = flags.includes('--reduced');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const size of sizesArg.split(',')) {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) errors.push(`${size} ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${size} pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`${size} requestfailed: ${r.url()}`));
  for (const p of pathsArg.split(',')) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    if (full) {
      // Scroll through the page so lazy media and scroll-driven reveals settle.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);
    }
    const name = `${out}/${p === '/' ? 'home' : p.replace(/^\//, '').replace(/[\/#]/g, '_')}-${width}x${height}${full ? '-full' : ''}.png`;
    await page.screenshot({ path: name, fullPage: full });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    console.log(name, overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : '');
  }
  await ctx.close();
}
await browser.close();
if (errors.length) console.log('CONSOLE:\n' + [...new Set(errors)].join('\n'));
