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

test('the circuit inspection sends a local contact into the running prototype field', async ({
  page,
}) => {
  await page.goto('/');
  const field = page.locator('circuit-field[data-scene="prototype"]');
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
