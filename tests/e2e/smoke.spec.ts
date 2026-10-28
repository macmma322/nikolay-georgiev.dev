import { expect, test, type Page } from '@playwright/test';
import { localize, locales } from './routes';

// Cross-engine smoke: the paths every visitor takes, run in Chromium, Firefox
// and WebKit, on desktop, phone and tablet (playwright.config.ts). Playwright's
// WebKit and Firefox builds are close to Safari and Firefox, not the same.

const watch = (page: Page) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    // Firefox's font sanitizer drops TikTok Sans' STAT table (a naming table
    // for style menus) and says so as an error; the font itself loads and renders.
    if (m.type() === 'error' && !/downloadable font: (STAT|Table discarded)/.test(m.text()))
      problems.push(m.text());
  });
  return problems;
};

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** No move between views is left half done. */
const settled = (page: Page) =>
  expect(page.locator('[data-explorer="workstation"][data-transition]')).toHaveCount(0, {
    timeout: 20_000,
  });

for (const locale of locales) {
  for (const bare of ['/', '/setup', '/open-source', '/work/jarvis', '/about', '/cv']) {
    const path = localize(bare, locale);
    test(`${path} renders without errors or overflow`, { tag: '@smoke' }, async ({ page }) => {
      const problems = watch(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      expect(problems).toEqual([]);
    });
  }
}

test.describe('setup explorer', { tag: '@smoke' }, () => {
  test('switches between the desk and the inside of the PC', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/setup');
    const explorer = page.locator('[data-explorer="workstation"]');
    await explorer.locator('label:has(input[data-view][value="inside"])').click();
    await settled(page);
    await expect(explorer).toHaveAttribute('data-shown', 'inside');
    await expect(explorer.locator('[data-view-pane="inside"]')).toBeVisible();
    await expect(explorer.locator('[data-view-pane="desk"]')).toBeHidden();
    await expect(page.locator('#detail-cpu')).toBeVisible();

    await explorer.locator('label:has(input[data-view][value="desk"])').click();
    await settled(page);
    await expect(explorer.locator('[data-view-pane="desk"]')).toBeVisible();
    await expect(explorer.locator('.stage-handoff')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('arrow keys move between views', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard');
    await page.goto('/setup');
    const explorer = page.locator('[data-explorer="workstation"]');
    await explorer.locator('input[data-view][value="desk"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(explorer.locator('input[data-view][value="inside"]')).toBeChecked();
    await settled(page);
    await expect(explorer.locator('[data-view-pane="inside"]')).toBeVisible();
  });

  test('a list item opens its details from the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard');
    await page.goto('/setup');
    const button = page.locator('[data-explorer="workstation"] button[data-pick="printer"]');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#detail-printer')).toBeVisible();
  });

  test('the chosen part survives reload and back/forward', async ({ page }) => {
    await page.goto('/setup');
    await page.locator('button[data-pick="mic"]').click();
    await page.reload();
    await expect(page.locator('button[data-pick="mic"]')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/open-source');
    await page.goBack();
    await expect(page.locator('[data-explorer="workstation"][data-ready]')).toHaveCount(1);
    await expect(page.locator('#detail-mic')).toBeVisible();
    // history.forward() rather than page.goForward(): the latter can report a
    // restored page as an aborted navigation.
    await page.evaluate(() => history.forward());
    await expect(page).toHaveURL(/\/open-source$/);
  });

  test('under reduced motion the view changes at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/setup');
    const explorer = page.locator('[data-explorer="workstation"]');
    await explorer.locator('label:has(input[data-view][value="inside"])').click();
    const state = await explorer.evaluate((e) => ({
      shown: e.dataset.shown,
      moving: 'transition' in e.dataset,
    }));
    expect(state).toEqual({ shown: 'inside', moving: false });
  });
});

test('pages stay in bounds from 320 to 1920 px', { tag: '@smoke' }, async ({ page }, info) => {
  test.skip(!/desktop|firefox|webkit$/.test(info.project.name), 'one sweep per engine');
  test.slow();
  for (const path of ['/setup', '/bg/setup', '/open-source', '/bg', '/cv', '/bg/cv']) {
    await page.goto(path);
    for (const width of [320, 360, 375, 390, 414, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await overflow(page), `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test('a phone turned sideways keeps the page in bounds', { tag: '@smoke' }, async ({ page }) => {
  test.skip(!test.info().project.use.isMobile, 'phones and tablets');
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.height, height: size.width });
  for (const path of ['/setup', '/bg/setup', '/']) {
    await page.goto(path);
    expect(await overflow(page), path).toBeLessThanOrEqual(0);
  }
});
