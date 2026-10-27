import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { allRoutes, CYRILLIC, localize, other, projects, ui, type Locale } from './routes';

// Language switching, persistence and Bulgarian rendering (contract §1, §4, §5).
// Selectors are language-neutral: the switch is a pair of links with hreflang.

const html = (page: Page) => page.locator('html');
const onPath = (page: Page, path: string) => expect(page).toHaveURL((url) => url.pathname === path);
const desktopOnly = (testInfo: TestInfo) =>
  test.skip(testInfo.project.name !== 'desktop', 'does not depend on the viewport');

/**
 * Clicks where the element is on screen. locator.click() first "scrolls it
 * into view", and for a link in the sticky header that moves the page, which
 * would change the section the switch carries across.
 */
async function pointerClick(page: Page, target: Locator) {
  // Nothing takes pointer events while a view transition runs.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.matches(':active-view-transition')))
    .toBe(false);
  // Click only once the target has settled and really receives the pointer at
  // its centre. The phone menu reveals itself with a clip-path transition and
  // staggered entrance animations; a click on a part that is still clipped
  // falls through to the backdrop, which light-dismisses the menu. That race
  // failed the switch tests on slower CI runners.
  await expect
    .poll(() =>
      target.evaluate((el) => {
        const moving = document.getAnimations().some(
          (a) =>
            a.playState === 'running' &&
            // Time-based only: scroll-driven ones (the header) never finish.
            a.timeline === document.timeline &&
            a.effect instanceof KeyframeEffect &&
            a.effect.target instanceof Element &&
            a.effect.target.contains(el) &&
            a.effect.getComputedTiming().endTime !== Infinity,
        );
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !moving && hit !== null && el.contains(hit);
      }),
    )
    .toBe(true);
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Follows the language switch to `to`: the header's on wide screens, the
 * menu's on phones. Checks the current language is marked on the way.
 */
async function switchTo(page: Page, to: Locale, isMobile: boolean) {
  const from = other(to);
  let scope = page.locator('.site-header');
  if (isMobile) {
    await pointerClick(page, page.getByRole('button', { name: ui.menu[from], exact: true }));
    scope = page.locator('#mobile-menu');
    await expect(scope).toBeVisible();
  }
  const link = (locale: Locale) =>
    scope.locator(`a[hreflang="${locale}"]`).filter({ visible: true }).first();
  await expect(link(from)).toHaveAttribute('aria-current', 'true');
  await expect(link(to)).not.toHaveAttribute('aria-current', 'true');
  await pointerClick(page, link(to));
  await expect(html(page)).toHaveAttribute('lang', to);
}

const stored = (page: Page) => page.evaluate(() => localStorage.getItem('ng-lang'));

for (const bare of ['/', '/work', '/work/kobait', '/lab', '/about', '/contact']) {
  test(`the switch on ${bare} lands on the twin page and back`, async ({ page, isMobile }) => {
    const bg = localize(bare, 'bg');
    await page.goto(bare);
    await expect(html(page)).toHaveAttribute('lang', 'en');

    await switchTo(page, 'bg', isMobile);
    await onPath(page, bg);
    expect(await stored(page)).toBe('bg');

    await switchTo(page, 'en', isMobile);
    await onPath(page, bare);
    expect(await stored(page)).toBe('en');
  });
}

test('back, forward and reload keep the language and the address', async ({ page, isMobile }) => {
  await page.goto('/work');
  await switchTo(page, 'bg', isMobile);
  await onPath(page, '/bg/work');

  await page.goBack();
  await onPath(page, '/work');
  await expect(html(page)).toHaveAttribute('lang', 'en');

  await page.goForward();
  await onPath(page, '/bg/work');
  await expect(html(page)).toHaveAttribute('lang', 'bg');

  await page.reload();
  await onPath(page, '/bg/work');
  await expect(html(page)).toHaveAttribute('lang', 'bg');
});

test('after switching, the menu and navigation stay in the new language', async ({
  page,
  isMobile,
}) => {
  await page.goto('/lab');
  await switchTo(page, 'bg', isMobile);
  await onPath(page, '/bg/lab');

  let nav = page.locator('.site-header .nav-desktop');
  if (isMobile) {
    await pointerClick(page, page.getByRole('button', { name: ui.menu.bg, exact: true }));
    nav = page.locator('#mobile-menu');
    await expect(nav).toBeVisible();
  }
  // Every link is localized and no English label is left behind.
  for (const key of ['work', 'lab', 'about', 'contact'] as const) {
    await expect(nav.getByRole('link', { name: ui[key].bg })).toHaveAttribute('href', `/bg/${key}`);
  }
  await expect(nav.getByRole('link', { name: ui.about.en, exact: true })).toHaveCount(0);
  await pointerClick(page, nav.getByRole('link', { name: ui.about.bg }));
  await onPath(page, '/bg/about');
  await expect(html(page)).toHaveAttribute('lang', 'bg');
});

test('the switch works from the keyboard', async ({ page, isMobile }) => {
  await page.goto('/contact');
  if (isMobile) {
    const button = page.getByRole('button', { name: ui.menu.en, exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mobile-menu')).toBeVisible();
  }
  const scope = isMobile ? page.locator('#mobile-menu') : page.locator('.site-header');
  const bg = scope.locator('a[hreflang="bg"]').filter({ visible: true }).first();
  // Tab until the Bulgarian link has focus: the order is the reading order.
  for (let i = 0; i < 40; i++) {
    if (await bg.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(bg).toBeFocused();
  await page.keyboard.press('Enter');
  await onPath(page, '/bg/contact');
  await expect(html(page)).toHaveAttribute('lang', 'bg');
});

test('a scrolled page keeps its section across the switch', async ({ page, isMobile }) => {
  await page.goto('/work/jarvis');
  const built = page.locator('#built');
  await built.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const top = () => built.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  const before = await top();

  // The switch link carries the section as a fragment; HeadBoot puts the
  // section back at the same height and then drops the fragment. (The
  // fragment alone would also bring #built into view, so check both.)
  await switchTo(page, 'bg', isMobile);
  await expect(page).toHaveURL((url) => url.pathname === '/bg/work/jarvis' && url.hash === '');
  await expect.poll(async () => Math.abs((await top()) - before)).toBeLessThanOrEqual(2);
});

test('a Bulgarian case study loads directly', async ({ page }) => {
  const response = await page.goto('/bg/work/kobait');
  expect(response?.status()).toBe(200);
  await expect(html(page)).toHaveAttribute('lang', 'bg');
  await expect(page.locator('h1')).toHaveText('KObait');
  await expect(page.locator('#h-overview')).toContainText('Общ преглед');
});

test.describe('stored language choice', () => {
  test('the English home sends a returning Bulgarian reader to /bg', async ({ page }) => {
    await page.goto('/work');
    await page.evaluate(() => localStorage.setItem('ng-lang', 'bg'));
    // A typed address or a bookmark: no referrer.
    await page.goto('/', { waitUntil: 'commit' });
    await onPath(page, '/bg');
    await expect(html(page)).toHaveAttribute('lang', 'bg');
  });

  test('a link to the home page from within the site is not redirected', async ({ page }) => {
    await page.goto('/work');
    await page.evaluate(() => localStorage.setItem('ng-lang', 'bg'));
    const visited: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
    });
    await page.locator('.site-header a[href="/"]').first().click();
    await page.waitForURL((url) => url.pathname === '/');
    await page.waitForLoadState('load');
    // HeadBoot decides in the head, before load: a redirect would already have started.
    await expect(html(page)).toHaveAttribute('lang', 'en');
    expect(visited).toEqual(['/']);
  });

  test.describe('in a Bulgarian browser', () => {
    test.use({ locale: 'bg-BG' });

    test('the browser language alone only hints, never redirects', async ({ page }) => {
      await page.goto('/');
      // The hint is set by the same head script that would redirect.
      await expect(html(page)).toHaveAttribute('data-lang-hint', 'bg');
      expect(new URL(page.url()).pathname).toBe('/');
      await expect(html(page)).toHaveAttribute('lang', 'en');
    });
  });
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the switch still works', async ({ page, isMobile }) => {
    await page.goto('/about');
    await switchTo(page, 'bg', isMobile);
    await onPath(page, '/bg/about');
  });
});

for (const { path } of allRoutes.filter((r) => r.locale === 'bg')) {
  test(`${path} reads in Bulgarian`, async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.goto(path);
    // The h1 may be a Latin name (the brand, a project); then the lede carries the language.
    const lead = await page.locator('h1, [data-vt-lang]').allTextContents();
    expect(lead.join(' ')).toMatch(CYRILLIC);
    // Project names stay Latin and carry data-vt-title; every other heading is
    // Bulgarian, except inside a document marked as English (the CLAUDE.md reader).
    const headings = await page
      .locator('h2:not([data-vt-title]):not([lang="en"] h2)')
      .allTextContents();
    expect(headings.filter((h) => !CYRILLIC.test(h))).toEqual([]);
  });
}

test('case-study sections are titled in Bulgarian', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  for (const slug of projects) {
    await page.goto(`/bg/work/${slug}`);
    await expect(page.locator('#h-overview')).toContainText('Общ преглед');
    await expect(page.locator('#h-built')).toContainText('Какво изградих');
    await expect(page.locator('#h-status')).toContainText('Статус');
    await expect(page.locator('#h-stack')).toContainText(/стек/i);
  }
});

test('Bulgarian pages load the Cyrillic face, English pages never do', async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo);
  const cyrillicLoaded = () =>
    page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(
        (face) => face.family.includes('TikTok Sans') && face.status === 'loaded',
      );
    });

  await page.goto('/bg');
  await expect.poll(cyrillicLoaded).toBe(true);

  await page.goto('/');
  await page.waitForTimeout(300);
  expect(await cyrillicLoaded()).toBe(false);
});
