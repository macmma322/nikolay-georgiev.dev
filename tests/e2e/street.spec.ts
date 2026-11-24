import { expect, test, type Page } from '@playwright/test';
import { localize, locales } from './routes';

// The street at the foot of every page (components/layout/Street.astro,
// scripts/street). Run against the production build like everything else:
// the scene is a lazily imported chunk under a hashed CSP.
//
// `localStorage['ng-street:test'] = <seed>` gives a repeatable street and a
// handle to step the simulation without waiting for the clock.

interface Stats {
  state: 'running' | 'paused' | 'static';
  active: number;
  target: number;
  spawned: number;
  left: number;
  pooled: number;
  frames: number;
  cost: number;
  front: number;
  back: number;
  vignettes: number;
  photoreal: number;
  atlases: { core: boolean; city: boolean };
  decodedMemoryBytes: number;
  framesPerCharacter: number;
  distinctBaseHumans: number;
}
interface Walker {
  id: string;
  lane: number;
  x: number;
  dir: number;
  front: boolean;
  act: string | null;
}
interface AvatarSnapshot {
  mode: string;
  head: string;
  glance: string;
  stance: string;
  blinking: boolean;
}
interface Street {
  step(seconds: number, dt?: number): void;
  stats(): Stats;
  summon(slug: string): boolean;
  walkers(): Walker[];
  avatar(): AvatarSnapshot;
}
declare global {
  interface Window {
    __street?: Street;
  }
}

async function open(page: Page, path = '/about', seed = '7') {
  const errors: string[] = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript((value) => localStorage.setItem('ng-street:test', value), seed);
  await page.goto(path);
  const stage = page.locator('[data-stage]');
  await stage.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('[data-street]')).toHaveAttribute('data-ready', '');
  return { stage, errors };
}

const stats = (page: Page) => page.evaluate(() => window.__street!.stats());
const step = (page: Page, seconds: number) =>
  page.evaluate((s) => window.__street!.step(s), seconds);

/** Opaque pixels of one canvas layer inside a box given in CSS pixels of the stage. */
const inked = (
  page: Page,
  layer: 'back' | 'front',
  box: { x: number; y: number; w: number; h: number },
) =>
  page.evaluate(
    ([name, b]) => {
      const canvas = document.querySelector<HTMLCanvasElement>(`[data-layer="${name}"]`)!;
      const k = canvas.width / canvas.clientWidth;
      const data = canvas
        .getContext('2d')!
        .getImageData(
          Math.round(b.x * k),
          Math.round(b.y * k),
          Math.round(b.w * k),
          Math.round(b.h * k),
        ).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 200) count += 1;
      return count;
    },
    [layer, box] as const,
  );

test.describe('street: layout', () => {
  test('the scene fits the page and the standing figure stands in it', async ({ page }) => {
    const { stage, errors } = await open(page);
    const box = (await stage.boundingBox())!;
    // From a laptop up the street is the screen under the header; never taller than it.
    expect(box.height).toBeGreaterThanOrEqual(300);
    expect(box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    // Nothing the scene draws may widen the page.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);

    const me = (await page.locator('[data-me]').boundingBox())!;
    // The photograph always covers the stage, and he is 52% of it tall, feet on
    // its pavement 77.6% of the way down, whatever shape the screen is.
    const plate = (await page.locator('[data-plate]').boundingBox())!;
    expect(plate.width).toBeGreaterThanOrEqual(box.width - 1);
    expect(plate.height).toBeGreaterThanOrEqual(box.height - 1);
    expect(plate.x).toBeLessThanOrEqual(box.x + 1);
    expect(plate.y).toBeLessThanOrEqual(box.y + 1);
    expect(Math.abs(me.height / plate.height - 0.52)).toBeLessThan(0.01);
    expect(Math.abs((me.y + me.height - plate.y) / plate.height - 0.776)).toBeLessThan(0.01);
    expect(me.y).toBeGreaterThanOrEqual(box.y);
    expect(me.y + me.height).toBeLessThanOrEqual(box.y + box.height);
    expect(Math.abs(me.x + me.width / 2 - (box.x + box.width / 2))).toBeLessThan(2);
    // The three layers of the figure have loaded and are the same size.
    const images = page.locator('[data-me] .me-figure img');
    await expect(images).toHaveCount(3);
    for (const image of await images.all()) {
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
        .toBe(true);
      const size = (await image.boundingBox())!;
      expect(Math.abs(size.height - me.height)).toBeLessThan(1.5);
    }
    // His name is on the screen, not off its edge.
    const tag = (await page.locator('.me-tag').boundingBox())!;
    expect(tag.x).toBeGreaterThanOrEqual(0);
    expect(tag.x + tag.width).toBeLessThanOrEqual(box.width + 1);
    expect(errors).toEqual([]);
  });

  test('the footer keeps its links, and nothing covers them', async ({ page }) => {
    await open(page);
    const links = page.locator('.street-nav a, .cast a, .site-footer .baseline a');
    expect(await links.count()).toBeGreaterThanOrEqual(15);
    for (const link of await links.all()) {
      await link.scrollIntoViewIfNeeded();
      // The element under the middle of each link is the link (or its text).
      const hit = await link.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && (top === el || el.contains(top));
      });
      expect(hit, (await link.textContent()) ?? '').toBe(true);
    }
    // Contact details and the copyright are still there.
    await expect(page.locator('#contact a[href^="mailto:"]')).toBeVisible();
    await expect(page.locator('.copyright-line')).toContainText('Nikolay Georgiev');
  });

  test('the scene causes no layout shift as it loads', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __shift: number }).__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput)
            (window as unknown as { __shift: number }).__shift += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await open(page);
    await page.waitForTimeout(600);
    expect(
      await page.evaluate(() => (window as unknown as { __shift: number }).__shift),
    ).toBeLessThan(0.02);
  });
});

for (const locale of locales) {
  test(`street: headline, label and description are localized (${locale})`, async ({ page }) => {
    await open(page, localize('/about', locale));
    const street = page.locator('[data-street]');
    await expect(street.getByRole('heading', { level: 2 })).toContainText(
      locale === 'bg' ? 'Строежът продължава' : 'The building doesn’t',
    );
    await expect(street.getByRole('navigation')).toHaveAccessibleName(
      locale === 'bg' ? 'Долна навигация' : 'Footer',
    );
    // The canvases are hidden from assistive technology; the description is not.
    await expect(street.locator('canvas[aria-hidden="true"]')).toHaveCount(2);
    await expect(street.locator('.stage > .visually-hidden')).toContainText(
      locale === 'bg' ? 'Николай' : 'Nikolay',
    );
    await expect(street.getByRole('button')).toHaveAccessibleName(
      locale === 'bg' ? /Николай/ : /Nikolay/,
    );
    await expect(street.locator('.cast a')).toHaveCount(7);
    await expect(street.locator('.cast a').first()).toHaveAttribute(
      'href',
      locale === 'bg' ? '/bg/work/caelora' : '/work/caelora',
    );
  });
}

test.describe('street: the crowd', () => {
  test('people enter, leave and are recycled; nothing accumulates', async ({ page }) => {
    await open(page);
    const before = await stats(page);
    expect(before.state).toBe('running');
    expect(before.active).toBeGreaterThanOrEqual(5);

    // Ten simulated minutes.
    await step(page, 600);
    const after = await stats(page);
    expect(after.left).toBeGreaterThan(40);
    expect(after.spawned - after.left).toBe(after.active);
    expect(after.active).toBeLessThanOrEqual(after.target + 2);
    expect(after.active).toBeGreaterThanOrEqual(Math.floor(after.target * 0.6));
    // Everyone who left went back to the pool, and the pool is reused rather than grown.
    expect(after.active + after.pooled).toBeLessThanOrEqual(after.target + 6);

    // Another ten minutes: the same bounds, so nothing leaks per minute walked.
    await step(page, 600);
    const later = await stats(page);
    expect(later.left).toBeGreaterThan(after.left + 40);
    expect(later.active + later.pooled).toBeLessThanOrEqual(later.target + 6);

    // Nobody is on the street twice.
    const ids = (await page.evaluate(() => window.__street!.walkers())).map((walker) => walker.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('a phone gets a quieter street than a desktop', async ({ page }) => {
    await open(page);
    const { target } = await stats(page);
    const width = page.viewportSize()!.width;
    if (width < 500) expect(target).toBeLessThanOrEqual(12);
    else expect(target).toBeGreaterThanOrEqual(14);
  });

  test('people pass both in front of him and behind him', async ({ page }) => {
    await open(page);
    // Stacking: back canvas, the figure, front canvas.
    const z = await page.evaluate(() =>
      ['[data-layer="back"]', '[data-me]', '[data-layer="front"]'].map((selector) =>
        Number(getComputedStyle(document.querySelector(selector)!).zIndex),
      ),
    );
    expect(z[0]!).toBeLessThan(z[1]!);
    expect(z[1]!).toBeLessThan(z[2]!);

    const stage = (await page.locator('[data-stage]').boundingBox())!;
    const me = (await page.locator('[data-me]').boundingBox())!;
    const body = {
      x: me.x - stage.x + me.width * 0.2,
      y: me.y - stage.y + me.height * 0.3,
      w: me.width * 0.6,
      h: me.height * 0.4,
    };
    const centre = stage.width / 2;

    const passes = async (front: boolean) => {
      for (let i = 0; i < 400; i += 1) {
        await step(page, 0.5);
        const near = (await page.evaluate(() => window.__street!.walkers())).some(
          (walker) => walker.front === front && Math.abs(walker.x - centre) < me.width * 0.25,
        );
        if (near) return inked(page, front ? 'front' : 'back', body);
      }
      return 0;
    };
    // Someone on the front canvas covers his body; someone on the back canvas is drawn behind it.
    expect(await passes(true)).toBeGreaterThan(50);
    expect(await passes(false)).toBeGreaterThan(50);
  });

  test('a label brings its figure onto the street', async ({ page }) => {
    const { stage } = await open(page);
    const present = () =>
      page.evaluate(() => window.__street!.walkers().some((walker) => walker.id === 'traveller'));
    const label = page.locator('.cast a[data-cast="caelora"]');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(stage).toHaveAttribute('data-state', 'paused');
    await label.evaluate((el: HTMLAnchorElement) => el.focus({ preventScroll: true }));
    await expect.poll(present).toBe(true);
    await stage.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    // Lit while it is held: the label carries its project's colour.
    await step(page, 0.2);
    await expect(label).toHaveAttribute('data-lit', '');
  });
});

test.describe('street: running only when it should', () => {
  test('it stops off screen and in a hidden tab, and picks up again', async ({ page }) => {
    await open(page);
    await expect.poll(async () => (await stats(page)).state).toBe('running');
    const moving = async () => {
      const a = (await stats(page)).frames;
      await page.waitForTimeout(400);
      return (await stats(page)).frames - a;
    };
    // How fast frames come depends on the machine; that they keep coming does not.
    const advances = async () => {
      const from = (await stats(page)).frames;
      await expect.poll(async () => (await stats(page)).frames - from).toBeGreaterThan(3);
    };
    await advances();

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(async () => (await stats(page)).state).toBe('paused');
    expect(await moving()).toBe(0);
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-state', 'paused');

    await page
      .locator('[data-stage]')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(async () => (await stats(page)).state).toBe('running');

    // A tab in the background.
    const hide = (hidden: boolean) =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await hide(true);
    await expect.poll(async () => (await stats(page)).state).toBe('paused');
    expect(await moving()).toBe(0);
    await hide(false);
    await expect.poll(async () => (await stats(page)).state).toBe('running');
    await advances();
  });

  test('a frame costs a small part of its budget', async ({ page }) => {
    test.setTimeout(60_000);
    await open(page);
    // Enough frames for the running mean to settle (it reaches 90% of its
    // value after 45), however fast this machine paints them.
    await expect
      .poll(async () => (await stats(page)).frames, { timeout: 40_000 })
      .toBeGreaterThan(45);
    const { cost } = await stats(page);
    // The scene's own work per frame (simulation and drawing), not the frame
    // rate: a busy host paints fewer frames, but each must still be cheap.
    // 16.7 ms is a 60 Hz frame.
    expect(cost).toBeLessThan(8);
  });
});

test.describe('street: reduced motion', () => {
  test('one still frame: a peopled street, and nothing scheduled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { stage } = await open(page);
    await expect(stage).toHaveAttribute('data-state', 'static');
    await page.waitForTimeout(500);
    const still = await stats(page);
    expect(still.state).toBe('static');
    expect(still.frames).toBe(0);
    expect(still.active).toBeGreaterThanOrEqual(5);
    // The crowd is painted on both sides of him even though nothing moves.
    const box = (await stage.boundingBox())!;
    expect(await inked(page, 'back', { x: 0, y: 0, w: box.width, h: box.height })).toBeGreaterThan(
      500,
    );
    // He does not breathe, and the walking count is not shown.
    expect(
      await page.locator('[data-me]').evaluate((el) => el.getAnimations({ subtree: true }).length),
    ).toBe(0);
    await expect(page.locator('.tally')).toBeHidden();
  });
});

test.describe('street: the way back up, and the figure', () => {
  test('Back to top returns to the top of the page', async ({ page }) => {
    await open(page);
    const link = page.locator('[data-to-top]');
    await expect(link).toHaveAttribute('href', '#top');
    await link.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('the standing figure is a real button and answers the keyboard', async ({ page }) => {
    await open(page);
    const me = page.locator('[data-me]');
    await expect.poll(async () => (await stats(page)).state).toBe('running');
    await me.focus();
    await expect(me).toBeFocused();
    await expect(me).toHaveAttribute('data-head', 'nod');
    // The head moves by less than a degree: the artwork is never bent.
    const turn = await page
      .locator('.me-head')
      .evaluate((el) => Math.abs(parseFloat(getComputedStyle(el).rotate)) || 0);
    expect(turn).toBeLessThan(1);
  });
});

test.describe('street: without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the picture is complete: skyline, the figure, the words and the links', async ({
    page,
  }) => {
    await page.goto('/about');
    const street = page.locator('[data-street]');
    await street.scrollIntoViewIfNeeded();
    await expect(street.getByRole('heading', { level: 2 })).toBeVisible();
    const photograph = street.locator('.stage-backdrop');
    await expect(photograph).toBeVisible();
    await expect
      .poll(() => photograph.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
    await expect(street.locator('[data-me] img').first()).toBeVisible();
    await expect(street.locator('.cast a')).toHaveCount(7);
    await expect(street.locator('[data-to-top]')).toBeVisible();
  });
});

test.describe('street: edges of its life', () => {
  test('a stage with no size holds nobody, and fills once it has one', async ({ page }) => {
    // Collapse the stage before the scene loads (CSSOM, which the CSP allows).
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const stage = document.querySelector<HTMLElement>('[data-stage]');
        if (!stage) return;
        stage.style.height = '0px';
        stage.style.borderWidth = '0';
      });
    });
    await open(page);
    await step(page, 5);
    expect((await stats(page)).active).toBe(0);

    await page.locator('[data-stage]').evaluate((el: HTMLElement) => {
      el.style.height = '';
      el.style.borderWidth = '';
    });
    await expect.poll(async () => (await stats(page)).active).toBeGreaterThanOrEqual(5);
    await step(page, 30);
    // Everyone has a real position: a zero-length walk cycle would have made these NaN.
    const xs = (await page.evaluate(() => window.__street!.walkers())).map((walker) => walker.x);
    expect(xs.every((x) => Number.isFinite(x))).toBe(true);
  });

  test('destroy stops the loop and lets go of the street', async ({ page }) => {
    await open(page);
    await expect.poll(async () => (await stats(page)).state).toBe('running');
    const frames = await page.evaluate(() => {
      const street = window.__street as unknown as { destroy(): void; stats(): { frames: number } };
      street.destroy();
      return street.stats().frames;
    });
    await page.waitForTimeout(400);
    const after = await stats(page);
    expect(after.frames).toBe(frames);
    expect(after.active).toBe(0);
    // Scrolling away and back does not start it again.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page
      .locator('[data-stage]')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(400);
    expect((await stats(page)).frames).toBe(frames);
  });
});

test.describe('street v2: cast layout, presence, composition & counter', () => {
  test('project cards keep the role over the name, in one row of seven that ends before the music dock', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Exact viewport matrix runs once.');
    for (const [width, height] of [
      [1920, 1080],
      [1366, 768],
    ] as const) {
      for (const locale of locales) {
        await page.setViewportSize({ width, height });
        await open(page, localize('/about', locale));
        const rows = await page.locator('.cast a').evaluateAll((links) =>
          links.map((a) => {
            const rect = a.getBoundingClientRect();
            const roleRect = a.querySelector('.role')!.getBoundingClientRect();
            const ofRect = a.querySelector('.of')!.getBoundingClientRect();
            return {
              slug: a.getAttribute('data-cast'),
              top: Math.round(rect.top),
              roleTop: Math.round(roleRect.top),
              ofTop: Math.round(ofRect.top),
              roleHeight: Math.round(roleRect.height),
            };
          }),
        );
        expect(rows).toHaveLength(7);
        for (const r of rows) {
          // Each card is two lines: who carries the project, then its name under it.
          expect(
            r.ofTop - r.roleTop,
            `${r.slug} lost its two-line card at ${width} (${locale})`,
          ).toBeGreaterThan(8);
          expect(
            r.roleHeight,
            `${r.slug} role ran past two lines at ${width} (${locale})`,
          ).toBeLessThan(40);
        }
        // All 7 project links sit cleanly on one single row at 1366x768 and 1920x1080 (no orphan Stemini).
        const distinctTops = [...new Set(rows.map((r) => r.top))];
        expect(distinctTops.length, `${locale} cast links wrapped at ${width}x${height}`).toBe(1);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBeLessThanOrEqual(0);
      }
    }
  });

  test('mobile viewports (390x844 and 320x740) stay overflow-free with readable cast links', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Exact viewport matrix runs once.');
    for (const [width, height] of [
      [390, 844],
      [320, 740],
    ] as const) {
      for (const locale of locales) {
        await page.setViewportSize({ width, height });
        await open(page, localize('/about', locale));
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBeLessThanOrEqual(0);
        const me = (await page.locator('[data-me]').boundingBox())!;
        const tag = (await page.locator('.me-tag').boundingBox())!;
        expect(me.x).toBeGreaterThanOrEqual(0);
        expect(tag.x).toBeGreaterThanOrEqual(0);
        expect(tag.x + tag.width).toBeLessThanOrEqual(width + 1);
      }
    }
  });

  test('composition corridor keeps initial foreground pedestrians off center torso and triggers contextual vignettes', async ({
    page,
  }) => {
    const { stage } = await open(page);
    const box = (await stage.boundingBox())!;
    const centre = box.width / 2;
    const clearHalf = Math.max(36, box.height * 0.13);
    const initialFrontCenter = await page.evaluate(
      ({ c, ch }) => window.__street!.walkers().some((w) => w.lane === 3 && Math.abs(w.x - c) < ch),
      { c: centre, ch: clearHalf },
    );
    expect(initialFrontCenter).toBe(false);

    // Step 120 simulated seconds: contextual micro-storytelling vignettes trigger with cooldowns.
    await step(page, 120);
    const after = await stats(page);
    expect(after.vignettes).toBeGreaterThanOrEqual(1);
  });

  test('avatar presence cycles natural stance, blinks, glances when summoning, and clears in still mode', async ({
    page,
  }) => {
    await open(page);
    await expect.poll(async () => (await stats(page)).state).toBe('running');
    await step(page, 18);
    const snap = await page.evaluate(() => window.__street!.avatar());
    expect(['neutral', 'glance', 'acknowledge', 'inspect']).toContain(snap.mode);

    // Hovering/focusing a cast link summons the character and directs Nikolay toward them.
    const label = page.locator('.cast a[data-cast="stemini"]');
    await label.focus();
    await expect
      .poll(() => page.evaluate(() => window.__street!.avatar().head))
      .toMatch(/^(left|right)$/);
    const turn = await page
      .locator('.me-head')
      .evaluate((el) => Math.abs(parseFloat(getComputedStyle(el).rotate)) || 0);
    expect(turn).toBeLessThan(1);

    // Simulated counter matches stats().left and carries its clarifying scene tooltip.
    await step(page, 25);
    const s = await stats(page);
    await expect(page.locator('[data-street-count]')).toHaveText(String(s.left).padStart(3, '0'));
    await expect(page.locator('.tally')).toHaveAttribute('title', /.+/);

    // Toggling reduced motion dynamically pauses to static and clears presence attributes.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-state', 'static');
    await expect(page.locator('[data-me]')).not.toHaveAttribute('data-head', /.+/);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('[data-stage]')).toHaveAttribute('data-state', 'running');
  });
});

test.describe('street v3: photorealistic crowd, backdrop & project cards', () => {
  test('loads core and extended sprite atlases, renders photorealistic walkers and backdrop, and clears music dock', async ({
    page,
  }) => {
    await open(page);
    await expect
      .poll(async () => (await stats(page)).atlases, { timeout: 10_000 })
      .toMatchObject({ core: true, city: true });
    await step(page, 0.25);
    const s = await stats(page);
    expect(s.photoreal).toBeGreaterThan(0);
    expect(s.framesPerCharacter).toBe(20);
    expect(s.distinctBaseHumans).toBe(16);
    expect(s.decodedMemoryBytes).toBeGreaterThan(0);

    // The street photograph has loaded, and an upright phone was served its own crop
    // (naturalWidth is density-corrected for a srcset, so the file is told by its name).
    const backdrop = page.locator('.stage-backdrop');
    await expect(backdrop).toBeVisible();
    await expect
      .poll(() => backdrop.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
    const served = await backdrop.evaluate((el: HTMLImageElement) => ({
      portrait: /street-plate-portrait/.test(el.currentSrc),
      phone: window.matchMedia('(max-width: 40rem) and (orientation: portrait)').matches,
    }));
    expect(served.portrait).toBe(served.phone);

    // Every project card carries an SVG archetype icon and sits clear of any floating music dock.
    await expect(page.locator('.cast a .cast-ico')).toHaveCount(7);
    const dockOverlap = await page.evaluate(() => {
      const dock = document.querySelector<HTMLElement>('.music-dock');
      if (!dock) return false;
      const dr = dock.getBoundingClientRect();
      if (dr.width === 0 || dr.height === 0) return false;
      return Array.from(document.querySelectorAll<HTMLElement>('.cast a')).some((a) => {
        a.scrollIntoView({ block: 'center', behavior: 'instant' });
        const ar = a.getBoundingClientRect();
        const r = dock.getBoundingClientRect();
        return ar.left < r.right && ar.right > r.left && ar.top < r.bottom && ar.bottom > r.top;
      });
    });
    expect(dockOverlap).toBe(false);
  });
});
