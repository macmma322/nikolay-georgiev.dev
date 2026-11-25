import { expect, test, type Page } from '@playwright/test';
import { localize, locales } from './routes';

interface CafeState {
  action: 'idle' | 'glance' | 'phone' | 'coffee' | 'laptop';
  stepName: string;
  frame: number;
  cupOnTable: boolean;
  phoneOnTable: boolean;
  laptopOpen: boolean;
  handContactsCup: boolean;
  sips: number;
  phoneChecks: number;
  laptopSessions: number;
  glances: number;
}

interface CafeScene {
  step(seconds: number, dt?: number): void;
  stats(): {
    state: 'running' | 'paused' | 'static';
    active: number;
    frames: number;
    cost: number;
  };
  cafeState(): CafeState;
  triggerAction(action: CafeState['action']): void;
  destroy(): void;
}

declare global {
  interface Window {
    __cafe?: CafeScene;
  }
}

async function openCafe(page: Page, path = '/about', seed = '11') {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((val) => localStorage.setItem('ng-cafe:test', val), seed);
  await page.goto(path);
  const stage = page.locator('[data-stage]');
  await stage.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('[data-street]')).toHaveAttribute('data-ready', '');
  await expect(page.locator('[data-street]')).toHaveAttribute('data-scene', 'cafe');
  return { stage, errors };
}

test.describe('café scenario: environment, character choreography & physical interactions', () => {
  test('renders the evening café room, seated character, and complete coffee/phone/laptop interactions', async ({
    page,
  }) => {
    const { stage, errors } = await openCafe(page);
    await expect(stage.locator('svg.cafe-room')).toBeVisible();
    await expect(stage.locator('svg.block')).toBeHidden();

    // Wait for cafe.webp atlas to decode and paint onto the front canvas
    await expect
      .poll(() =>
        page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('[data-layer="front"]')!;
          const data = canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height).data;
          let count = 0;
          for (let i = 3; i < data.length; i += 16) if (data[i]! > 180) count++;
          return count;
        }),
      )
      .toBeGreaterThan(400);

    // Initial idle state: seated at table, cup and phone on table, laptop closed
    const initial = await page.evaluate(() => window.__cafe!.cafeState());
    expect(initial.action).toBe('idle');
    expect(initial.cupOnTable).toBe(true);
    expect(initial.phoneOnTable).toBe(true);
    expect(initial.laptopOpen).toBe(false);

    // 1. Coffee sequence: reach -> lift -> sip (at lips) -> lift -> return -> idle
    const coffeeSeq = await page.evaluate(() => {
      const cafe = window.__cafe!;
      cafe.triggerAction('coffee');
      const s0 = cafe.cafeState();
      cafe.step(0.56);
      const s1 = cafe.cafeState();
      cafe.step(0.45);
      const s2 = cafe.cafeState();
      cafe.step(2.4);
      const s3 = cafe.cafeState();
      return { s0, s1, s2, s3 };
    });
    expect(coffeeSeq.s0.stepName).toBe('coffee-reach');
    expect(coffeeSeq.s0.handContactsCup).toBe(true);
    expect(coffeeSeq.s0.cupOnTable).toBe(true);
    expect(coffeeSeq.s1.stepName).toBe('coffee-lift');
    expect(coffeeSeq.s1.handContactsCup).toBe(true);
    expect(coffeeSeq.s1.cupOnTable).toBe(false);
    expect(coffeeSeq.s2.stepName).toBe('coffee-sip');
    expect(coffeeSeq.s2.handContactsCup).toBe(true);
    expect(coffeeSeq.s2.cupOnTable).toBe(false);
    expect(coffeeSeq.s3.action).toBe('idle');
    expect(coffeeSeq.s3.cupOnTable).toBe(true);
    expect(coffeeSeq.s3.sips).toBeGreaterThanOrEqual(1);

    // 2. Phone sequence: reach (on table) -> check (picked up, tabletop clear) -> scroll -> return -> idle
    const phoneSeq = await page.evaluate(() => {
      const cafe = window.__cafe!;
      cafe.triggerAction('phone');
      const s0 = cafe.cafeState();
      cafe.step(0.48);
      const s1 = cafe.cafeState();
      cafe.step(1.1);
      const s2 = cafe.cafeState();
      cafe.step(2.4);
      const s3 = cafe.cafeState();
      return { s0, s1, s2, s3 };
    });
    expect(phoneSeq.s0.stepName).toBe('phone-reach');
    expect(phoneSeq.s0.phoneOnTable).toBe(true);
    expect(phoneSeq.s0.cupOnTable).toBe(true);
    expect(phoneSeq.s1.stepName).toBe('phone-check');
    expect(phoneSeq.s1.phoneOnTable).toBe(false);
    expect(phoneSeq.s1.cupOnTable).toBe(true);
    expect(phoneSeq.s2.stepName).toBe('phone-scroll');
    expect(phoneSeq.s2.phoneOnTable).toBe(false);
    expect(phoneSeq.s3.action).toBe('idle');
    expect(phoneSeq.s3.phoneOnTable).toBe(true);
    expect(phoneSeq.s3.phoneChecks).toBeGreaterThanOrEqual(1);

    // 3. Laptop sequence: opens laptop on table, types across keyframes, closes and returns to idle
    const laptopSeq = await page.evaluate(() => {
      const cafe = window.__cafe!;
      cafe.triggerAction('laptop');
      const s0 = cafe.cafeState();
      cafe.step(0.55);
      const s1 = cafe.cafeState();
      cafe.step(2.4);
      const s2 = cafe.cafeState();
      return { s0, s1, s2 };
    });
    expect(laptopSeq.s0.stepName).toBe('laptop-type-a');
    expect(laptopSeq.s0.laptopOpen).toBe(true);
    expect(laptopSeq.s0.cupOnTable).toBe(true);
    expect(laptopSeq.s1.stepName).toBe('laptop-type-b');
    expect(laptopSeq.s1.laptopOpen).toBe(true);
    expect(laptopSeq.s2.action).toBe('idle');
    expect(laptopSeq.s2.laptopOpen).toBe(false);
    expect(laptopSeq.s2.laptopSessions).toBeGreaterThanOrEqual(1);

    expect(errors).toEqual([]);
  });

  for (const locale of locales) {
    test(`café labels, scene-specific footer copy, accessible description, and manual scene toggle are localized (${locale})`, async ({
      page,
    }) => {
      await openCafe(page, localize('/about', locale));
      const street = page.locator('[data-street]');
      await expect(street.locator('[data-scene-eyebrow]')).toHaveText(
        locale === 'bg' ? 'Вечерно кафене' : 'Evening café',
      );
      await expect(street.locator('[data-cast-label]')).toHaveText(
        locale === 'bg' ? 'В бележника' : 'On the bench',
      );
      await expect(street.locator('.tally')).toBeHidden();
      await expect(street.locator('.cafe-status')).toBeVisible();
      await page.evaluate(() => window.__cafe!.triggerAction('idle'));
      await expect(street.locator('[data-cafe-status]')).toHaveText(
        locale === 'bg' ? 'Еспресо · почивка' : 'Espresso · seated',
      );
      await page.evaluate(() => window.__cafe!.triggerAction('coffee'));
      await expect(street.locator('[data-cafe-status]')).toHaveText(
        locale === 'bg' ? 'Еспресо · отпива' : 'Espresso · sipping',
      );
      await page.evaluate(() => window.__cafe!.triggerAction('phone'));
      await expect(street.locator('[data-cafe-status]')).toHaveText(
        locale === 'bg' ? 'Телефон · преглежда' : 'Phone · checking',
      );
      await expect(street.locator('[data-me]')).toHaveAccessibleName(
        locale === 'bg' ? /Николай седи на маса в кафене/ : /Nikolay, sitting at a café table/,
      );
      await expect(street.locator('[data-scene-desc]')).toContainText(
        locale === 'bg' ? 'Илюстрирано вечерно кафене' : 'An illustrated evening café',
      );
      const toggle = page.locator('[data-scene-toggle]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveText(locale === 'bg' ? 'Сцена: Кафене' : 'Scene: Café');
    });
  }

  test('session-stable 60/40 weighted selection persists across navigation and manual switching works without layout shift', async ({
    page,
  }) => {
    // Force initial random roll to 0.75 (>= 0.6 -> 'cafe') only when no session value exists
    await page.addInitScript(() => {
      const origRandom = Math.random;
      let firstCall = true;
      Math.random = () => {
        if (firstCall && !sessionStorage.getItem('nikolay.footer.scene')) {
          firstCall = false;
          return 0.75;
        }
        return origRandom();
      };
    });

    await page.goto('/about');
    await expect(page.locator('[data-street]')).toHaveAttribute('data-scene', 'cafe');
    expect(await page.evaluate(() => sessionStorage.getItem('nikolay.footer.scene'))).toBe('cafe');

    // Navigate to another route and reload: session-stable selection must stay 'cafe' even if Math.random returns 0.1
    await page.addInitScript(() => {
      Math.random = () => 0.1;
    });
    await page.goto('/work');
    await expect(page.locator('[data-street]')).toHaveAttribute('data-scene', 'cafe');
    await page.reload();
    await expect(page.locator('[data-street]')).toHaveAttribute('data-scene', 'cafe');

    // Scroll to footer and manually switch scene via [data-scene-toggle]
    const stage = page.locator('[data-stage]');
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await expect(page.locator('[data-street]')).toHaveAttribute('data-ready', '');
    const metricsBefore = await stage.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { height: r.height, docTop: r.top + window.scrollY };
    });

    const sceneToggle = page.locator('[data-scene-toggle]');
    await sceneToggle.click();
    await expect(page.locator('[data-street]')).toHaveAttribute('data-scene', 'street');
    await expect(sceneToggle).toHaveText('Scene: Street');
    expect(await page.evaluate(() => sessionStorage.getItem('nikolay.footer.scene'))).toBe(
      'street',
    );

    const metricsAfter = await stage.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { height: r.height, docTop: r.top + window.scrollY };
    });
    expect(Math.abs(metricsAfter.height - metricsBefore.height)).toBeLessThan(1);
    expect(Math.abs(metricsAfter.docTop - metricsBefore.docTop)).toBeLessThan(1);
  });

  test('street scenario never downloads cafe.webp, and café pauses offscreen and under reduced motion', async ({
    page,
  }) => {
    const requestedUrls: string[] = [];
    page.on('request', (req) => {
      requestedUrls.push(req.url());
    });

    // 1. Initial load above the fold: neither footer scene chunk nor footer artwork is fetched
    await page.addInitScript(() => sessionStorage.setItem('nikolay.footer.scene', 'street'));
    await page.goto('/');
    await page.waitForTimeout(250);
    expect(requestedUrls.filter((u) => u.includes('/avatar/cafe.webp'))).toEqual([]);
    expect(requestedUrls.filter((u) => u.includes('/avatar/crowd-fg.webp'))).toEqual([]);
    expect(requestedUrls.filter((u) => /\/_astro\/cafe\.[^/]+\.js/.test(u))).toEqual([]);
    expect(requestedUrls.filter((u) => /\/_astro\/nikolay-(body|chest|head)\./.test(u))).toEqual(
      [],
    );

    // 2. When street is scrolled into view, cafe.webp and cafe.js remain unloaded, while crowd-fg.webp loads
    await page
      .locator('[data-stage]')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(page.locator('[data-street]')).toHaveAttribute('data-ready', '');
    await expect
      .poll(() => requestedUrls.some((u) => u.includes('/avatar/crowd-fg.webp')))
      .toBe(true);
    expect(requestedUrls.filter((u) => u.includes('/avatar/cafe.webp'))).toEqual([]);
    expect(requestedUrls.filter((u) => /\/_astro\/cafe\.[^/]+\.js/.test(u))).toEqual([]);

    // 3. When café is selected from the start, street portrait layers and crowd-fg.webp are never fetched
    requestedUrls.length = 0;
    await page.addInitScript(() => sessionStorage.setItem('nikolay.footer.scene', 'cafe'));
    await page.goto('/about');
    await page
      .locator('[data-stage]')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(page.locator('[data-street]')).toHaveAttribute('data-ready', '');
    expect(requestedUrls.filter((u) => u.includes('/avatar/crowd-fg.webp'))).toEqual([]);
    expect(requestedUrls.filter((u) => /\/_astro\/nikolay-(body|chest|head)\./.test(u))).toEqual(
      [],
    );

    // 4. Reduced motion in Café mode paints one static frame and schedules zero frames
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCafe(page, '/about');
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-state', 'static');
    await page.waitForTimeout(300);
    const stats = await page.evaluate(() => window.__cafe!.stats());
    expect(stats.state).toBe('static');
    expect(stats.frames).toBe(0);
  });
});
