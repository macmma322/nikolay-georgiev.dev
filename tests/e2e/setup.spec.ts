import { expect, test } from '@playwright/test';
import { localize, locales } from './routes';

// The /setup explorers (src/components/setup/Explorer.astro) and the page's
// content rules (PRODUCT.md: KObait by area only, non-sponsorship disclosure).

const desktopOnly = (isMobile: boolean) => test.skip(isMobile, 'pointer on the drawing');

test('a list item opens its details and lights its part', async ({ page }) => {
  await page.goto('/setup');
  const explorer = page.locator('[data-explorer="workstation"]');
  const button = explorer.locator('button[data-pick="streamdeck"]');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(explorer.locator('#detail-streamdeck')).toBeVisible();
  await expect(explorer.locator('#detail-desk')).toBeHidden();
  await expect(explorer.locator('[data-part="streamdeck"]')).toHaveClass(/is-on/);
});

test('clicking a part of the drawing selects it', async ({ page, isMobile }) => {
  desktopOnly(isMobile);
  await page.goto('/setup');
  const explorer = page.locator('[data-explorer="workstation"]');
  await explorer.locator('[data-part="tower"] rect').first().click();
  await expect(explorer.locator('button[data-pick="tower"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(explorer.locator('#detail-tower')).toBeVisible();
});

test('“look inside” switches the view and moves focus into it', async ({ page }) => {
  await page.goto('/setup');
  const explorer = page.locator('[data-explorer="workstation"]');
  await explorer.locator('button[data-pick="tower"]').click();
  await explorer.locator('button[data-go-view="inside"]').click();
  await expect(explorer.locator('input[value="inside"]')).toBeChecked();
  await expect(explorer.locator('[data-view-pane="inside"]')).toBeVisible();
  await expect(explorer.locator('[data-view-pane="desk"]')).toBeHidden();
  await expect(explorer.locator('button[data-pick="cpu"]')).toBeFocused();
});

test('the chosen part survives a language switch', async ({ page, isMobile }) => {
  await page.goto('/setup');
  const explorer = page.locator('[data-explorer="workstation"]');
  await explorer.locator('button[data-pick="mic"]').click();
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.locator('#mobile-menu a[hreflang="bg"]').click();
  } else {
    await page.locator('.site-header a[hreflang="bg"]').first().click();
  }
  await page.waitForURL((url) => url.pathname === '/bg/setup');
  await expect(page.locator('#detail-mic')).toBeVisible();
  await expect(page.locator('button[data-pick="mic"]')).toHaveAttribute('aria-pressed', 'true');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every part’s details are readable', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.locator('#detail-desk')).toBeVisible();
    await expect(page.locator('#detail-streamdeck')).toBeVisible();
    await expect(page.locator('#detail-old-ssd')).toBeVisible();
  });
});

for (const locale of locales) {
  test.describe(`setup content (${locale})`, () => {
    test('discloses that nothing is sponsored, and keeps KObait generic', async ({ page }) => {
      await page.goto(localize('/setup', locale));
      await expect(page.locator('.disclosure')).toContainText(
        locale === 'en' ? 'not sponsored' : 'не е спонсорирана',
      );
      const text = await page.locator('main').innerText();
      // Word boundaries: "Caelora" must not count as a radio module.
      expect(text).not.toMatch(/withheld part names/i);
    });

    test('planned kit is marked as not bought', async ({ page }) => {
      await page.goto(localize('/setup', locale));
      await page.locator('button[data-pick="camera"]').click();
      await expect(page.locator('#detail-camera .status')).toContainText(
        locale === 'en' ? 'not bought' : 'не е купено',
      );
    });
  });
}
