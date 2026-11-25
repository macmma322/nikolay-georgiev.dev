import { expect, test, type Page } from '@playwright/test';

const actor = 'canvas.avatar-drawing';
async function center(page: Page, selector: string) {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

test('hero walks, plants its feet and settles into the registered standing pose', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Small screens choose an eligible section cameo.');
  await page.goto('/');
  const hero = page.locator('[data-avatar-anchor="hero"] canvas');
  await expect(hero).toHaveAttribute('data-state', /^walk-/);
  await expect(hero).toHaveAttribute('data-state', 'idle', { timeout: 8000 });
  await expect(page.locator(actor)).toHaveCount(1);
});

test('card contact holds across languages and hands ownership back to the street', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The elbow needs clearance beside a card.');
  for (const path of ['/', '/bg']) {
    await page.goto(path);
    const anchor = page.locator('[data-avatar-anchor="jarvis"]');
    await center(page, '[data-avatar-anchor="jarvis"]');
    await expect(anchor.locator('canvas')).toHaveAttribute('data-state', 'lean');
    const delta = await anchor.evaluate((el) => {
      const a = el.getBoundingClientRect(),
        p = el.parentElement!.querySelector('svg')!.getBoundingClientRect();
      return Math.hypot(a.left + a.width * 0.89 - p.left, a.top + a.height * 0.29 - p.top);
    });
    expect(delta).toBeLessThan(3);
    await expect(anchor.locator('canvas')).toHaveAttribute('data-state', 'phone');
    await center(page, '[data-stage]');
    await expect(page.locator(actor)).toHaveCount(0);
    await expect(page.locator('[data-me]')).toBeVisible();
  }
});

test('character switch persists, reduced motion and disabled JavaScript leave content usable', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  const toggle = page.locator('[data-avatar-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/bg/lab');
  await expect(toggle).toHaveAccessibleName('Движение на героя');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator(actor)).toHaveCount(0);
  await toggle.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toBeDisabled();
  await expect(page.locator(actor)).toHaveCount(0);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const still = await context.newPage();
  await still.goto(new URL('/work/caelora', page.url()).href);
  await expect(still.getByRole('heading', { name: 'Caelora', exact: true })).toBeVisible();
  await expect(still.locator('[data-me]')).toBeVisible();
  await expect(still.locator('[data-avatar-toggle]')).toBeHidden();
  await context.close();
});

test('the seated drawing is attached to the card and leaves its case study usable', async ({
  page,
}) => {
  await page.goto('/');
  const a = page.locator('[data-avatar-anchor="caelora"]');
  await center(page, '[data-avatar-anchor="caelora"]');
  await expect(a.locator('canvas')).toBeVisible();
  const error = await a.evaluate((el) => {
    const r = el.getBoundingClientRect(),
      plate = el.parentElement!.querySelector('svg')!.getBoundingClientRect();
    return Math.abs(r.top + r.height * 0.625 - plate.top);
  });
  expect(error).toBeLessThan(3);
  await page.locator('#chapter-caelora a').click();
  await expect(page).toHaveURL(/\/work\/caelora\/?$/);
});

test('the circuit inspection sends a local contact into the running lab pad', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('circuit-field[data-place="avatar-pad"]');
  await field.evaluate((el) =>
    el.addEventListener('avatar-contact', (event) => {
      const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
        el.setAttribute('data-test-contact', 'inside');
    }),
  );
  await center(page, '[data-avatar-anchor="lab"]');
  await expect(field).toHaveAttribute('data-test-contact', 'inside');
  await expect(field).toHaveAttribute('data-running', '');
});

test('headphone Easter egg is dismissible, finite and respects the revisit cooldown', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.05;
  });
  await page.goto('/bg');
  const a = page.locator('[data-avatar-anchor="caelora"]');
  await center(page, '[data-avatar-anchor="caelora"]');
  const sprite = a.locator('canvas');
  await expect(sprite).toHaveAttribute('data-state', 'interact');
  const bubble = a.getByRole('button', { name: /Само още една долина/ });
  await expect(bubble).toBeVisible();
  await bubble.click();
  await expect(bubble).toHaveCount(0);
  await expect(sprite).toHaveAttribute('data-state', 'phone');
  await center(page, '[data-stage]');
  await center(page, '[data-avatar-anchor="caelora"]');
  await expect(sprite).toBeVisible();
  await expect(a.locator('.avatar-remark')).toHaveCount(0);
});

test('workstation and phone cameos leave page controls reachable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The illustrated desk is restricted to safe margins.');
  for (const path of ['/lab', '/bg/setup', '/contact']) {
    await page.goto(path);
    const target = path === '/contact' ? '[data-avatar-anchor="contact"]' : '[data-pose="typing"]';
    await center(page, target);
    await expect(page.locator(target + ' canvas').first()).toBeVisible();
    await expect(page.locator(target).first()).toHaveCSS('pointer-events', 'none');
    await expect(page.locator('main h1')).toBeVisible();
  }
});
test('resizing a leaning scene releases the corner when there is no side clearance', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'This starts from the wide layout.');
  await page.goto('/bg');
  await center(page, '[data-avatar-anchor="jarvis"]');
  const lean = page.locator('[data-avatar-anchor="jarvis"]');
  await expect(lean.locator('canvas')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(lean).toBeHidden();
  await expect(lean.locator('canvas')).toHaveCount(0);
  await center(page, '[data-avatar-anchor="caelora"]');
  await expect(page.locator('[data-avatar-anchor="caelora"] canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('missing artwork leaves the plate usable and the footer portrait available', async ({
  page,
}) => {
  await page.route('**/avatar/*.webp', (route) => route.abort());
  await page.goto('/');
  await center(page, '[data-avatar-anchor="caelora"]');
  await expect(page.locator('#chapter-caelora a')).toBeVisible();
  await page.locator('#chapter-caelora a').click();
  await expect(page).toHaveURL(/\/work\/caelora\/?$/);
  await center(page, '[data-stage]');
  await expect(page.locator('[data-me]')).toBeVisible();
  await expect(page.locator(actor)).toHaveCount(0);
});

test('header boundary hysteresis, spatial occlusion, graceful exit and scroll reversal preserve frame continuity', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop header boundary and hysteresis progression.');
  await page.goto('/');
  const anchor = page.locator('[data-avatar-anchor="caelora"]');
  const runtime = page.locator('avatar-runtime');
  await center(page, '[data-avatar-anchor="caelora"]');
  const canvas = anchor.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(runtime).toHaveAttribute('data-lifecycle', 'active', { timeout: 3000 });
  await expect(canvas).toHaveAttribute('data-settled', 'true', { timeout: 7000 });
  const settledState = await canvas.getAttribute('data-state');
  const settledFrame = await canvas.getAttribute('data-frame');

  // 1. Scroll so the top of the avatar passes slightly behind the sticky header (within hysteresis retention).
  await page.evaluate(() => {
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const el = document.querySelector('[data-avatar-anchor="caelora"]')!.getBoundingClientRect();
    // Place top 20px behind headerBottom while >70% remains visible below the header.
    window.scrollBy({ top: el.top - (header.bottom - 20), behavior: 'instant' });
  });
  await page.waitForTimeout(80);
  // Avatar remains active (no abrupt disappearance) and header stays clickable above it.
  await expect(canvas).toBeVisible();
  await expect(runtime).toHaveAttribute('data-lifecycle', 'active');
  const headerControlsRemainTop = await page.evaluate(() => {
    const brand = document.querySelector<HTMLElement>('.site-header .brand')!;
    const r = brand.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === brand || brand.contains(hit));
  });
  expect(headerControlsRemainTop).toBe(true);

  // 2 & 3. Scroll further so <44% of the avatar remains below the header (entering 'exiting'),
  // then reverse scroll mid-exit back into the recovery zone within the exit window.
  const midExitSnapshot = await page.evaluate(async () => {
    const rt = document.querySelector('avatar-runtime')!;
    const cv = document.querySelector('[data-avatar-anchor="caelora"] canvas')!;
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const anchorEl = document.querySelector<HTMLElement>('[data-avatar-anchor="caelora"]')!;
    const el = anchorEl.getBoundingClientRect();
    const targetTop = header.bottom - el.height * 0.75;

    const observed = await new Promise<{
      lifecycleDuringExit: string | null;
      exitDir: string | null;
    }>((resolve) => {
      const timeout = window.setTimeout(() => {
        mo.disconnect();
        resolve({
          lifecycleDuringExit: rt.getAttribute('data-lifecycle'),
          exitDir: cv.getAttribute('data-exit-dir'),
        });
      }, 1500);
      const mo = new MutationObserver(() => {
        const lc = rt.getAttribute('data-lifecycle');
        if (lc === 'exiting') {
          window.clearTimeout(timeout);
          mo.disconnect();
          resolve({
            lifecycleDuringExit: lc,
            exitDir: cv.getAttribute('data-exit-dir'),
          });
        }
      });
      mo.observe(rt, { attributes: true, attributeFilter: ['data-lifecycle'] });
      window.scrollBy({ top: el.top - targetTop, behavior: 'instant' });
    });

    // Reverse scroll mid-exit before the 220ms exit timer completes.
    const lifecycleAfterReverse = await new Promise<string | null>((resolve) => {
      const timeout = window.setTimeout(() => {
        mo.disconnect();
        resolve(rt.getAttribute('data-lifecycle'));
      }, 1500);
      const mo = new MutationObserver(() => {
        const lc = rt.getAttribute('data-lifecycle');
        if (lc === 'entering' || lc === 'active') {
          window.clearTimeout(timeout);
          mo.disconnect();
          resolve(lc);
        }
      });
      mo.observe(rt, { attributes: true, attributeFilter: ['data-lifecycle'] });
      anchorEl.scrollIntoView({ block: 'center', behavior: 'instant' });
    });

    return {
      lifecycleDuringExit: observed.lifecycleDuringExit,
      exitDir: observed.exitDir,
      lifecycleAfterReverse,
    };
  });
  expect(midExitSnapshot.lifecycleDuringExit).toBe('exiting');
  expect(midExitSnapshot.exitDir).toBe('up');
  expect(['entering', 'active']).toContain(midExitSnapshot.lifecycleAfterReverse);
  await expect(runtime).toHaveAttribute('data-lifecycle', 'active', { timeout: 1000 });
  await expect(canvas).toBeVisible();
  expect(await canvas.getAttribute('data-state')).toBe(settledState);
  expect(await canvas.getAttribute('data-frame')).toBe(settledFrame);
  await expect(page.locator(actor)).toHaveCount(1);

  // 4. Allow full exit to complete to 'hidden', then scroll backward and verify immediate saved-frame restoration.
  await page.evaluate(() => {
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const el = document.querySelector('[data-avatar-anchor="caelora"]')!.getBoundingClientRect();
    const targetTop = header.bottom - el.height * 0.78;
    window.scrollBy({ top: el.top - targetTop, behavior: 'instant' });
  });
  await expect(runtime).toHaveAttribute('data-lifecycle', 'exiting');
  await expect(runtime).toHaveAttribute('data-lifecycle', 'hidden', { timeout: 1000 });
  await expect(page.locator(actor)).toHaveCount(0);

  await center(page, '[data-avatar-anchor="caelora"]');
  // Should restore immediately (no 350ms blank gap) on the saved frame.
  await expect(canvas).toBeVisible({ timeout: 250 });
  expect(await canvas.getAttribute('data-frame')).toBe(settledFrame);
  await expect(runtime).toHaveAttribute('data-lifecycle', 'active', { timeout: 1000 });
});
