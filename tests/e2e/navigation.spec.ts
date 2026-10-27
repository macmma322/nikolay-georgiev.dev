import { expect, test } from '@playwright/test';
import { EMAIL, localize, locales, ui } from './routes';

for (const locale of locales) {
  test.describe(`navigation (${locale})`, () => {
    const at = (path: string) => localize(path, locale);

    test('the skip link moves focus to the main content', async ({ page }) => {
      await page.goto(at('/work'));
      await page.keyboard.press('Tab');
      const skip = page.locator('.skip-link');
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#main$/);
    });

    test('primary navigation marks the current page', async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop navigation only');
      await page.goto(at('/lab'));
      const nav = page.locator('.nav-desktop');
      await expect(nav.locator('a[aria-current="page"]')).toHaveText(ui.lab[locale]);
      await nav.getByRole('link', { name: ui.work[locale], exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === at('/work'));
      await expect(page.locator('h1')).toHaveText(ui.work[locale]);
      await expect(nav.locator('a[aria-current="page"]')).toHaveText(ui.work[locale]);
    });

    test('Open Source is in the primary navigation', async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop navigation only');
      await page.goto(at('/'));
      const nav = page.locator('.nav-desktop');
      const link = nav.getByRole('link', { name: ui.openSource[locale], exact: true });
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL((url) => url.pathname === at('/open-source'));
      await expect(nav.locator('a[aria-current="page"]')).toHaveText(ui.openSource[locale]);
      // The blueprint subpage still marks Open Source as the current section.
      await page.goto(at('/open-source/blueprint'));
      await expect(nav.locator('a[aria-current="page"]')).toHaveText(ui.openSource[locale]);
    });

    test('Contact leads to the contact page', async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop navigation only');
      await page.goto(at('/work'));
      const nav = page.locator('.nav-desktop');
      await nav.getByRole('link', { name: ui.contact[locale], exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === at('/contact'));
      await expect(nav.locator('a[aria-current="page"]')).toHaveText(ui.contact[locale]);
    });

    test.describe('mobile menu', () => {
      test.skip(({ isMobile }) => !isMobile, 'mobile only');
      const menuButton = { name: ui.menu[locale], exact: true };

      test('opens, marks the current page and closes on Escape', async ({ page }) => {
        await page.goto(at('/lab'));
        const menu = page.locator('#mobile-menu');
        await expect(menu).toBeHidden();
        await page.getByRole('button', menuButton).click();
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('link', { name: new RegExp(ui.work[locale]) })).toBeVisible();
        await expect(menu.locator('a[aria-current="page"]')).toContainText(ui.lab[locale]);
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
      });

      test('lists Open Source and opens it', async ({ page }) => {
        await page.goto(at('/'));
        await page.getByRole('button', menuButton).click();
        await page
          .locator('#mobile-menu')
          .getByRole('link', { name: new RegExp(ui.openSource[locale]) })
          .click();
        await expect(page).toHaveURL((url) => url.pathname === at('/open-source'));
        await expect(page.locator('#mobile-menu')).toBeHidden();
      });

      test('navigates to a page', async ({ page }) => {
        await page.goto(at('/'));
        await page.getByRole('button', menuButton).click();
        await page
          .locator('#mobile-menu')
          .getByRole('link', { name: new RegExp(ui.about[locale]) })
          .click();
        await expect(page).toHaveURL((url) => url.pathname === at('/about'));
        await expect(page.locator('#mobile-menu')).toBeHidden();
      });

      test('Contact leads to the contact page', async ({ page }) => {
        await page.goto(at('/work'));
        await page.getByRole('button', menuButton).click();
        await page
          .locator('#mobile-menu')
          .getByRole('link', { name: new RegExp(ui.contact[locale]) })
          .click();
        await expect(page).toHaveURL((url) => url.pathname === at('/contact'));
        await expect(page.locator('#mobile-menu')).toBeHidden();
      });
    });

    test('the email copy button copies the address', async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(at('/'));
      await page.locator(`button[data-copy="${EMAIL}"]`).first().click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe(EMAIL);
    });
  });
}

for (const path of ['/', '/work/jarvis', '/bg', '/bg/work/jarvis']) {
  test(`reduced motion leaves no running animations on ${path}`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(path);
    await page.waitForTimeout(300);
    const running = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => {
          const t = a.effect?.getComputedTiming();
          return (
            a.playState === 'running' && Number(t?.duration ?? 0) > 1 && t?.iterations === Infinity
          );
        }).length,
    );
    // SMIL packets keep running in the DOM, so check they are not rendered.
    // checkVisibility() reports SVG children of a display:none group as
    // visible, so walk the ancestors instead.
    const smil = await page.evaluate(
      () =>
        [...document.querySelectorAll('animate, animateMotion')].filter((a) => {
          for (let el = a.parentElement; el; el = el.parentElement) {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
          }
          return true;
        }).length,
    );
    expect(running).toBe(0);
    expect(smil).toBe(0);
    // Diagrams start in their final state: no build sequence is armed.
    expect(await page.locator('figure.diagram[data-build]').count()).toBe(0);
    await context.close();
  });
}
