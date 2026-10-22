import { expect, test } from '@playwright/test';
import { allRoutes, projects, SITE, ui } from './routes';

// Social cards as a crawler sees them: absolute production URLs in the HTML,
// and each card served as a 1200x630 PNG. Against the preview server the
// image is fetched by path; with PLAYWRIGHT_BASE_URL set to the live domain
// this checks what LinkedIn, Discord or X would actually fetch.
test.describe('social cards', () => {
  test.skip(({ isMobile }) => isMobile, 'metadata does not depend on the viewport');

  for (const { locale, page: bare, path } of allRoutes) {
    test(`${path} has a localized, reachable card`, async ({ page, request }) => {
      await page.goto(path);
      const meta = (attr: string, key: string) =>
        page.locator(`head meta[${attr}="${key}"]`).getAttribute('content');

      const image = await meta('property', 'og:image');
      expect(image).toMatch(new RegExp(`^${SITE}/og/[a-z0-9-]+-${locale}\\.[0-9a-f]{10}\\.png$`));
      expect(await meta('name', 'twitter:image')).toBe(image);
      expect(await meta('name', 'twitter:card')).toBe('summary_large_image');
      expect(await meta('property', 'og:image:alt')).toBeTruthy();
      expect(await meta('name', 'twitter:image:alt')).toBe(await meta('property', 'og:image:alt'));
      expect(await meta('property', 'og:locale')).toBe(ui.og[locale]);
      expect(await page.locator('head meta[content*="localhost"]').count()).toBe(0);

      // Each case study and the Work index carry their own card.
      const slug = bare.match(/^\/work\/(.+)$/)?.[1];
      const card = slug ?? (bare === '/work' ? 'work' : 'home');
      expect(image).toContain(`/og/${card}-${locale}.`);

      const res = await request.get(image!.replace(SITE, ''));
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toBe('image/png');
      const png = await res.body();
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
      expect(await meta('property', 'og:image:width')).toBe('1200');
      expect(await meta('property', 'og:image:height')).toBe('630');
    });
  }

  test('every project has a card of its own in both languages', async ({ page }) => {
    const cards = new Set<string>();
    for (const { path } of allRoutes.filter((r) => r.page.startsWith('/work/'))) {
      await page.goto(path);
      cards.add((await page.locator('head meta[property="og:image"]').getAttribute('content'))!);
    }
    expect(cards.size).toBe(projects.length * 2);
  });
});
