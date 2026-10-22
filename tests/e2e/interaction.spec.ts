import { expect, test, type Page } from '@playwright/test';
import { allRoutes, localize, locales } from './routes';

// These run against the production build on purpose: the strict CSP and the
// CSS minifier can break interactions that look fine on the dev server.

const lit = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => getComputedStyle(el).getPropertyValue('--lit').trim());

for (const locale of locales) {
  test.describe(`text lights its drawing (${locale})`, () => {
    const at = (path: string) => localize(path, locale);

    test('a focused layer label lights its plate in the hero stack', async ({ page }) => {
      await page.goto(at('/'));
      await page.locator('.stack-label[data-layer="ai"] a').focus();
      await expect.poll(() => lit(page, '.plate[data-layer="ai"]')).toBe('1');
    });

    test('a plate legend item lights the matching part', async ({ page }) => {
      await page.goto(at('/work/jarvis'));
      const plate = page.locator('.hero-art .project-plate');
      await plate.locator('.plate-legend li[data-part="router"]').hover();
      await expect(plate).toHaveClass(/is-active/);
      await expect(plate.locator('.part[data-part="router"]').first()).toHaveClass(/is-lit/);
    });

    test('a diagram node lights its neighbours, or phones get the list', async ({ page }) => {
      await page.goto(at('/work/jarvis'));
      const figure = page.locator('figure.diagram').first();
      await figure.scrollIntoViewIfNeeded();
      // The build has played (or never armed), so the node stays under the pointer.
      await expect(figure).not.toHaveAttribute('data-build', /^(armed|play)$/);
      if (await figure.locator('.canvas').isVisible()) {
        await figure.locator('.node[data-n="router"]').hover();
        await expect(figure.locator('.node[data-n="router"]')).toHaveClass(/is-lit/);
        await expect.poll(() => figure.locator('.is-lit').count()).toBeGreaterThan(2);
      } else {
        // Narrow figures show the text list instead of the drawing.
        await expect(figure.locator('.list .li-node').first()).toBeVisible();
      }
    });

    test('a focused project link lights the technologies it proves', async ({ page }) => {
      await page.goto(at('/'));
      const caps = page.locator('.caps');
      await caps.locator('.proof a[data-slug="kobait"]').first().focus();
      const proven = caps.locator('.item[data-proof~="kobait"]').first();
      const other = caps.locator('.item:not([data-proof~="kobait"])').first();
      await expect.poll(() => proven.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      await expect.poll(() => other.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.62');
    });
  });
}

test('only touch screens get the scroll-driven layer sequence', async ({ page, isMobile }) => {
  await page.goto('/');
  const name = await page
    .locator('.plate[data-layer="web"]')
    .evaluate((el) => getComputedStyle(el).animationName);
  // Pointers explore the stack by hover and focus; touch screens by scrolling.
  if (isMobile) expect(name).toBe('scan');
  else expect(name).not.toBe('scan');
});

test('the header settles on scroll', async ({ page }) => {
  await page.goto('/');
  const name = await page
    .locator('.site-header')
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe('header-settle');
  // The minifier once dropped the unprefixed property, leaving no blur in Chrome.
  const blur = await page
    .locator('.site-header')
    .evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(blur).not.toBe('none');
});

for (const { path } of allRoutes) {
  test(`view-transition names are unique on ${path}`, async ({ page }) => {
    await page.goto(path);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .map((el) => getComputedStyle(el).viewTransitionName)
        .filter((n) => n && n !== 'none'),
    );
    expect(names.length).toBe(new Set(names).size);
    // The language switch names these while it runs: once each, never on a
    // project title, which keeps its own name.
    for (const hook of ['title', 'lede']) {
      expect(await page.locator(`[data-vt-lang="${hook}"]`).count()).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-vt-lang][data-vt-title]')).toHaveCount(0);
  });
}
