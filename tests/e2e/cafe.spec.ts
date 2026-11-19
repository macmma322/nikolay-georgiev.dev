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

    // 1. Coffee sequence: reach (hand contacts cup on table) -> sip (cup lifted off saucer) -> return (cup back on table)
    await page.evaluate(() => window.__cafe!.triggerAction('coffee'));
    let state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.stepName).toBe('coffee-reach');
    expect(state.handContactsCup).toBe(true);
    expect(state.cupOnTable).toBe(true);

    await page.evaluate(() => window.__cafe!.step(0.75));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.stepName).toBe('coffee-sip');
    expect(state.handContactsCup).toBe(true);
    expect(state.cupOnTable).toBe(false);

    await page.evaluate(() => window.__cafe!.step(2.4));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.action).toBe('idle');
    expect(state.cupOnTable).toBe(true);
    expect(state.sips).toBeGreaterThanOrEqual(1);

    // 2. Phone sequence: picks up Samsung Galaxy S20+ (phoneOnTable becomes false, cup stays on table), scrolls, puts down
    await page.evaluate(() => window.__cafe!.triggerAction('phone'));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.stepName).toBe('phone-check');
    expect(state.phoneOnTable).toBe(false);
    expect(state.cupOnTable).toBe(true);

    await page.evaluate(() => window.__cafe!.step(1.25));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.stepName).toBe('phone-scroll');
    expect(state.phoneOnTable).toBe(false);

    await page.evaluate(() => window.__cafe!.step(2.0));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.action).toBe('idle');
    expect(state.phoneOnTable).toBe(true);
    expect(state.phoneChecks).toBeGreaterThanOrEqual(1);

    // 3. Laptop sequence: opens laptop on table, types across keyframes, closes and returns to idle
    await page.evaluate(() => window.__cafe!.triggerAction('laptop'));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.stepName).toBe('laptop-type-a');
    expect(state.laptopOpen).toBe(true);
    expect(state.cupOnTable).toBe(true);

    await page.evaluate(() => window.__cafe!.step(0.55));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.stepName).toBe('laptop-type-b');
    expect(state.laptopOpen).toBe(true);

    await page.evaluate(() => window.__cafe!.step(1.8));
    state = await page.evaluate(() => window.__cafe!.cafeState());
    expect(state.action).toBe('idle');
    expect(state.laptopOpen).toBe(false);
    expect(state.laptopSessions).toBeGreaterThanOrEqual(1);

    expect(errors).toEqual([]);
  });

  for (const locale of locales) {
    test(`café labels, accessible description, and manual scene toggle are localized (${locale})`, async ({
      page,
    }) => {
      await openCafe(page, localize('/about', locale));
      const street = page.locator('[data-street]');
      await expect(street.locator('[data-scene-eyebrow]')).toHaveText(
        locale === 'bg' ? 'Вечерно кафене' : 'Evening café',
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
    const cafeRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/avatar/cafe.webp')) cafeRequests.push(req.url());
    });

    // When street is selected, cafe.webp is never fetched
    await page.addInitScript(() => sessionStorage.setItem('nikolay.footer.scene', 'street'));
    await page.goto('/about');
    await page
      .locator('[data-stage]')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(page.locator('[data-street]')).toHaveAttribute('data-ready', '');
    expect(cafeRequests).toEqual([]);

    // Reduced motion in Café mode paints one static frame and schedules zero frames
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCafe(page, '/about');
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-state', 'static');
    await page.waitForTimeout(300);
    const stats = await page.evaluate(() => window.__cafe!.stats());
    expect(stats.state).toBe('static');
    expect(stats.frames).toBe(0);
  });
});
