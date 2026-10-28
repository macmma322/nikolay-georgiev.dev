import { expect, test } from '@playwright/test';
import {
  allRoutes,
  EMAIL,
  EMAIL_ALT,
  localize,
  locales,
  notFoundPage,
  PHONE_RE,
  PHONE_TEL,
  ui,
} from './routes';

// The contact page is the only place the phone number is published (contract §6).

for (const locale of locales) {
  test.describe(`contact page (${locale})`, () => {
    const path = localize('/contact', locale);

    test('offers the phone and both emails, primary first', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(`a[href="tel:${PHONE_TEL}"]`).first()).toBeVisible();
      const mail = page.locator('#contact a[href^="mailto:"]');
      await expect(mail).toHaveCount(2);
      await expect(mail.nth(0)).toHaveAttribute('href', `mailto:${EMAIL}`);
      await expect(mail.nth(1)).toHaveAttribute('href', `mailto:${EMAIL_ALT}`);
      await expect(mail.nth(1)).toBeVisible();
    });

    test('copy buttons confirm at once', async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(path);

      const email = page.locator(`button[data-copy="${EMAIL}"]`).filter({ visible: true });
      const emailAlt = page.locator(`button[data-copy="${EMAIL_ALT}"]`).filter({ visible: true });
      const phone = page.locator('button[data-copy*="359"]').filter({ visible: true });
      await expect(email).toHaveCount(1);
      await expect(emailAlt).toHaveCount(1);
      await expect(phone).toHaveCount(1);

      for (const [button, value] of [
        [email, EMAIL],
        [emailAlt, EMAIL_ALT],
        [phone, PHONE_TEL],
      ] as const) {
        await button.click();
        await expect(button).toHaveAttribute('data-state', 'copied', { timeout: 1000 });
        // The button's own live region (the script fills its next sibling).
        await expect(button.locator('xpath=..').getByRole('status')).toContainText(
          ui.copied[locale],
          { timeout: 1000 },
        );
        const copied = await page.evaluate(() => navigator.clipboard.readText());
        expect(copied.replace(/\s/g, '')).toBe(value);
      }
    });

    test('GitHub and LinkedIn are named, external links', async ({ page }) => {
      await page.goto(path);
      for (const [name, host] of [
        ['GitHub', 'github.com'],
        ['LinkedIn', 'linkedin.com'],
      ] as const) {
        const links = page.locator(`a[href*="${host}"]`).filter({ visible: true });
        await expect(links.first()).toBeVisible();
        for (const link of await links.all()) {
          await expect(link).toHaveAccessibleName(new RegExp(`${name}.*${ui.newTab[locale]}`));
          await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
          await expect(link).toHaveAttribute('target', '_blank');
        }
      }
    });
  });
}

test.describe('the phone number stays on the contact page', () => {
  test.skip(({ isMobile }) => isMobile, 'markup and bundles do not depend on the viewport');

  // HTML, scripts, styles and data the page loads.
  for (const path of ['/', '/work', '/about', '/bg', '/bg/work', '/bg/about']) {
    test(`not on ${path} or in anything it loads`, async ({ page }) => {
      const bodies: Promise<string>[] = [];
      page.on('response', (res) => {
        if (/html|javascript|json|css/.test(res.headers()['content-type'] ?? '')) {
          bodies.push(res.text().catch(() => ''));
        }
      });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
      const leaks = (await Promise.all(bodies)).filter((body) => PHONE_RE.test(body));
      expect(leaks).toEqual([]);
    });
  }

  test('not in the HTML of any other page', async ({ request }) => {
    const others = allRoutes.filter((r) => r.page !== '/contact').map((r) => r.path);
    for (const path of [...others, notFoundPage.en, notFoundPage.bg]) {
      const body = await (await request.get(path)).text();
      expect(PHONE_RE.test(body), path).toBe(false);
    }
  });
});
