import { createHash } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
  // Visitors get the 3D view only on hardware WebGL. CI renders in software
  // (SwiftShader), so these tests opt in to it, and allow for its pace.
  test.beforeEach(async ({ page }) => {
    test.slow();
    await page.addInitScript(() => localStorage.setItem('ng-setup:3d', 'software'));
  });

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

  /** The workstation explorer, with its desk model on screen. */
  const liveDesk = async (page: Page) => {
    await page.goto('/setup');
    const explorer = page.locator('[data-explorer="workstation"]');
    await expect(explorer.locator('[data-view-pane="desk"]')).toHaveAttribute('data-live', '', {
      timeout: 30_000,
    });
    return explorer;
  };
  const settled = (explorer: Locator) =>
    expect(explorer).not.toHaveAttribute('data-transition', /./, { timeout: 30_000 });

  test('the camera travels into the PC and back out', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const explorer = await liveDesk(page);
    // Record every move rather than poll for one: on a loaded runner a move
    // can start and end between two polls.
    await explorer.evaluate((el) => {
      const seen: string[] = [];
      (window as unknown as { seen: string[] }).seen = seen;
      new MutationObserver(() => {
        const move = (el as HTMLElement).dataset['transition'];
        if (move) seen.push(move);
      }).observe(el, { attributes: true, attributeFilter: ['data-transition'] });
    });
    await explorer.locator('label:has(input[data-view][value="inside"])').click();
    await settled(explorer);
    // The camera flew from the desk into the case (the desk stays on screen meanwhile).
    expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toContain(
      'desk-inside',
    );
    const inside = explorer.locator('[data-view-pane="inside"]');
    await expect(inside).toHaveAttribute('data-live', '');
    // Looking inside opens the case, and the stage comes to rest.
    await expect(explorer.locator('input[data-stage-mode][value="cutaway"]')).toBeChecked();
    await expect(inside.locator('.stage-canvas')).toHaveAttribute('data-mode', 'cutaway');
    // Motion is timed by the clock, but on a loaded runner's software WebGL a
    // single frame can take seconds, so the last frame may land late.
    await expect(inside.locator('.stage-canvas')).toHaveAttribute('data-motion', 'idle', {
      timeout: 30_000,
    });
    await expect(explorer.locator('.stage-handoff')).toHaveCount(0);
    await expect(explorer.locator('canvas.stage-gl')).toHaveCount(1);
    await expect(inside.locator('.stage-tag[data-tag="cpu"]')).toHaveClass(/is-on/);

    await explorer.locator('label:has(input[data-view][value="desk"])').click();
    await settled(explorer);
    await expect(explorer.locator('[data-view-pane="desk"]')).toHaveAttribute('data-live', '');
    await expect(inside).toBeHidden();
    await expect(explorer.locator('.stage-handoff')).toHaveCount(0);
    await expect(explorer.locator('canvas.stage-gl')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('rapid view changes settle on the last one', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const explorer = await liveDesk(page);
    for (const view of ['inside', 'desk', 'inside', 'desk', 'inside']) {
      await explorer.locator(`label:has(input[data-view][value="${view}"])`).click();
    }
    await settled(explorer);
    await expect(explorer).toHaveAttribute('data-shown', 'inside');
    await expect(explorer.locator('[data-view-pane="inside"]')).toHaveAttribute('data-live', '');
    await expect(explorer.locator('[data-view-pane="desk"]')).toBeHidden();
    await expect(explorer.locator('.stage-handoff')).toHaveCount(0);
    await expect(explorer.locator('canvas.stage-gl')).toHaveCount(1);
    await expect(explorer.locator('[inert]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('reduced motion changes the view without travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const explorer = await liveDesk(page);
    await explorer.locator('label:has(input[data-view][value="inside"])').click();
    expect(await explorer.evaluate((e) => 'transition' in e.dataset)).toBe(false);
    const stage = explorer.locator('[data-view-pane="inside"] .stage-canvas');
    await expect(stage).toHaveAttribute('data-mode', 'cutaway', { timeout: 30_000 });
    await expect(explorer.locator('.stage-handoff')).toHaveCount(0);
  });

  test('the exploded view comes to rest with every part movable back', async ({ page }) => {
    const explorer = await liveDesk(page);
    await explorer.locator('label:has(input[data-view][value="inside"])').click();
    await settled(explorer);
    const stage = explorer.locator('[data-view-pane="inside"] .stage-canvas');
    await explorer.locator('input[data-stage-mode][value="exploded"]').check({ force: true });
    await expect(stage).toHaveAttribute('data-mode', 'exploded');
    await expect(stage).toHaveAttribute('data-motion', 'idle', { timeout: 15_000 });
    await explorer.locator('input[data-stage-mode][value="assembled"]').check({ force: true });
    await expect(stage).toHaveAttribute('data-mode', 'assembled');
    await expect(stage).toHaveAttribute('data-motion', 'idle', { timeout: 15_000 });
  });

  test('a lost WebGL context is rebuilt, never left blank', async ({ page }) => {
    const explorer = await liveDesk(page);
    const pane = explorer.locator('[data-view-pane="desk"]');
    await pane.locator('canvas.stage-gl').evaluate((canvas: HTMLCanvasElement) => {
      canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    // The drawing covers the gap, then a fresh stage takes over.
    await expect(pane).toHaveAttribute('data-live', '', { timeout: 30_000 });
    await expect(pane.locator('canvas.stage-gl')).toHaveCount(1);
    await expect(pane.locator('.stage-canvas')).toHaveAttribute('data-motion', 'idle', {
      timeout: 30_000,
    });
  });

  test('one finger scrolls the page over the model', async ({ page }) => {
    const explorer = await liveDesk(page);
    const touch = await explorer
      .locator('canvas.stage-gl')
      .evaluate((canvas) => getComputedStyle(canvas).touchAction);
    expect(touch).toBe('pan-y');
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
      // KObait's exact parts, as SHA-256 prefixes of whole lowercase words, so
      // this public file does not list what the page withholds. Whole words:
      // "Caelora" must not count as a radio module.
      const withheld = new Set([
        'd15eff82084cddbc',
        '12801089b2936da7',
        'd339f720de1fd92a',
        'ba9e6f5936935452',
        'c9ccf4594410d294',
        'b32b49bc896b7705',
        'ae95d0a28506280e',
      ]);
      const named = text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) =>
          withheld.has(createHash('sha256').update(word).digest('hex').slice(0, 16)),
        );
      expect(named).toEqual([]);
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
