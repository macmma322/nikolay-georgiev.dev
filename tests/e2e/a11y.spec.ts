import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { allRoutes, notFoundPage } from './routes';

for (const path of [...allRoutes.map((r) => r.path), notFoundPage.en, notFoundPage.bg]) {
  test(`axe finds no WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    // Let time-based entrance animations settle so contrast is measured on the
    // final state, not on a half-faded frame. Scroll-driven ones never "finish".
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(
            (a) =>
              a.timeline === document.timeline &&
              a.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
    expect(summary).toEqual([]);
  });
}
