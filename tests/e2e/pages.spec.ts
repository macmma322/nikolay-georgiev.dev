import { expect, test, type ConsoleMessage } from '@playwright/test';
import {
  allRoutes,
  canonical,
  CYRILLIC,
  localize,
  locales,
  notFound,
  notFoundPage,
  other,
  projects,
  ui,
} from './routes';

for (const { locale, page: bare, path } of allRoutes) {
  test.describe(`page ${path}`, () => {
    test('renders without console errors or horizontal overflow', async ({ page }) => {
      const problems: string[] = [];
      page.on('console', (m: ConsoleMessage) => {
        if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
      });
      page.on('pageerror', (e) => problems.push(e.message));

      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(new RegExp(ui.name[locale]));

      // Lazy images must load too; scroll through the page.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
      });
      const broken = await page.evaluate(() =>
        [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      );
      expect(broken).toEqual([]);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      expect(problems).toEqual([]);
    });

    test('declares its language, canonical and alternates', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'head markup does not depend on the viewport');
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical(path));

      // The same three alternates on both twins, so each points back at the other.
      const alternates = page.locator('link[rel="alternate"][hreflang]');
      await expect(alternates).toHaveCount(3);
      const expected = {
        en: canonical(localize(bare, 'en')),
        bg: canonical(localize(bare, 'bg')),
        'x-default': canonical(localize(bare, 'en')),
      };
      for (const [lang, href] of Object.entries(expected)) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute(
          'href',
          href,
        );
      }

      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        'content',
        ui.og[locale],
      );
      await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveAttribute(
        'content',
        ui.og[other(locale)],
      );
    });
  });
}

// `astro preview` answers every unknown path with the root 404.html; Caddy
// answers those under /bg with bg/404.html. So the status is checked on
// unknown paths and each locale's page on the page itself.
for (const locale of locales) {
  test(`unknown ${locale} routes return a 404 that is not indexed`, async ({ page }) => {
    const response = await page.goto(notFound[locale]);
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test(`the ${locale} 404 page is in its language`, async ({ page }) => {
    await page.goto(notFoundPage[locale]);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const h1 = page.locator('h1');
    if (locale === 'en') await expect(h1).toHaveText(/Nothing at this address/);
    else await expect(h1).toHaveText(CYRILLIC);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  });
}

// KObait's technical specifics are deliberately withheld (PRODUCT.md): its page
// has a schematic plate and no module-level diagram.
const withoutDiagram: readonly string[] = ['kobait'];

test('every case study has a status, an architecture diagram and its text alternative', async ({
  page,
}) => {
  for (const locale of locales) {
    for (const slug of projects) {
      await page.goto(localize(`/work/${slug}`, locale));
      await expect(page.locator('.status').first()).toBeVisible();
      const diagrams = page.locator('figure.diagram');
      if (withoutDiagram.includes(slug)) {
        await expect(diagrams).toHaveCount(0);
        continue;
      }
      expect(await diagrams.count()).toBeGreaterThan(0);
      for (const figure of await diagrams.all()) {
        await expect(figure).toHaveAttribute('aria-labelledby', /.+/);
        // The SVG is decorative for assistive tech; the list carries the content.
        await expect(figure.locator('svg')).toHaveAttribute('aria-hidden', 'true');
        expect(await figure.locator('.list .li-node').count()).toBeGreaterThan(2);
      }
    }
  }
});

test('the CV download is a real PDF', async ({ request }) => {
  const res = await request.get('/Nikolay-Georgiev-CV.pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
});
