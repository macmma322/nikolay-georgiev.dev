import { expect, test, type Page } from '@playwright/test';
import { localize, locales } from './routes';

// The /setup explorers (src/components/setup/Explorer.astro) and the page's
// content rules (PRODUCT.md: KObait by area only, non-sponsorship disclosure).

const desktopOnly = (isMobile: boolean) => test.skip(isMobile, 'pointer on the drawing');

/** A browser without WebGL: the drawings must stay in charge. */
const withoutWebGL = (page: Page) =>
  page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type === 'webgl2' || type === 'webgl') return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });

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
  await withoutWebGL(page);
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

test.describe('3D views', () => {
  test('the model replaces the drawing and answers to the list', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/setup');
    const pane = page.locator('[data-view-pane="desk"]');
    await expect(pane).toHaveAttribute('data-live', '', { timeout: 20_000 });
    await expect(pane.locator('.art')).toBeHidden();
    await expect(pane.locator('canvas.stage-gl')).toBeVisible();
    // List to model: the part's numbered pin lights.
    await page.locator('button[data-pick="streamdeck"]').click();
    await expect(pane.locator('.stage-tag[data-tag="streamdeck"]')).toHaveClass(/is-on/);
    // Model to list: a pin selects its part and opens its details.
    await pane.locator('.stage-tag[data-tag="printer"]').dispatchEvent('click');
    await expect(page.locator('button[data-pick="printer"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('#detail-printer')).toBeVisible();
    // The controls are buttons with names.
    await expect(pane.getByRole('button', { name: 'Reset view' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('choosing a part hidden in the case opens the cutaway', async ({ page }) => {
    await page.goto('/setup#secondary');
    const explorer = page.locator('[data-explorer="secondary"]');
    await expect(explorer.locator('[data-view-pane="secondary"]')).toHaveAttribute(
      'data-live',
      '',
      {
        timeout: 20_000,
      },
    );
    // Close the case, then choose a part inside it.
    await explorer.locator('input[data-stage-mode][value="assembled"]').check();
    await explorer.locator('button[data-pick="old-gpu"]').click();
    await expect(explorer.locator('input[data-stage-mode][value="cutaway"]')).toBeChecked();
    await explorer.locator('input[data-stage-mode][value="exploded"]').check();
    await expect(explorer.locator('.stage-tag[data-tag="old-gpu"]')).toHaveClass(/is-on/);
  });

  test('without WebGL the drawing stays', async ({ page }) => {
    await withoutWebGL(page);
    await page.goto('/setup');
    const pane = page.locator('[data-view-pane="desk"]');
    await expect(pane.locator('.art')).toBeVisible();
    await expect(pane.locator('[data-stage]')).toBeHidden();
    await expect(pane).not.toHaveAttribute('data-live', '');
  });
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

    test('a maker page in both languages links the reader’s one', async ({ page }) => {
      await page.goto(localize('/setup', locale));
      await expect(page.locator('#detail-monitors .maker-link')).toHaveAttribute(
        'href',
        `https://www.aoc.com/${locale === 'en' ? 'uk' : 'bg'}/gaming/monitors/27g42e`,
      );
    });

    test('planned kit is marked as not bought', async ({ page }) => {
      await page.goto(localize('/setup', locale));
      await page.locator('button[data-pick="camera"]').click();
      await expect(page.locator('#detail-camera .status')).toContainText(
        locale === 'en' ? 'Planned purchase' : 'Планирана покупка',
      );
    });
  });
}
