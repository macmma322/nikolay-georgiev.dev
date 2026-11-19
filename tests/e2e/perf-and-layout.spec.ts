import { expect, test, type Page } from '@playwright/test';

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

async function isHitTestable(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cx = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1);
    const top = document.elementFromPoint(cx, cy);
    return !!top && (top === el || el.contains(top));
  });
}

test.describe('floating UI safe-area & collision regressions', () => {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [768, 1024],
    [390, 844],
    [320, 740],
  ] as const) {
    test(`vinyl dock never covers footer baseline or portal indicator at ${width}x${height}`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'Exact viewport matrix runs once.');
      await page.setViewportSize({ width, height });
      await page.goto('/');

      // On wide screens, the Hero "now" strip clears the bottom-right vinyl dock on initial paint.
      if (width >= 1000) {
        const dockBox = (await page.locator('music-experience').boundingBox())!;
        const lastNow = (await page.locator('.hero .now-item').last().boundingBox())!;
        expect(overlaps(dockBox, lastNow)).toBe(false);
      }

      // Scroll to the bottom of the page: footer baseline and portal dot must clear the vinyl dock.
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      );
      const dockBox = (await page.locator('music-experience').boundingBox())!;
      for (const sel of [
        '.site-footer .secret-portal',
        '.site-footer .portal-dot',
        '.site-footer .copyright-line',
        '.site-footer .baseline a.footer-link',
        '.site-footer [data-avatar-toggle]',
      ]) {
        const box = (await page.locator(sel).boundingBox())!;
        expect(overlaps(dockBox, box), `${sel} overlapped vinyl dock at ${width}x${height}`).toBe(
          false,
        );
        expect(await isHitTestable(page, sel), `${sel} was obscured at ${width}x${height}`).toBe(
          true,
        );
      }

      // On desktop widths, even opening the Electricity Controls popover leaves the portal dot clear.
      if (width >= 1000) {
        await page.locator('electricity-controls summary').click();
        const panelBox = (await page.locator('electricity-controls .controls').boundingBox())!;
        const portalBox = (await page.locator('.site-footer .secret-portal').boundingBox())!;
        expect(
          overlaps(panelBox, portalBox),
          `controls popover overlapped portal indicator at ${width}x${height}`,
        ).toBe(false);
        expect(await isHitTestable(page, '.site-footer .secret-portal')).toBe(true);
      }

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0);
    });
  }

  test('contact page bare footer clears the vinyl dock on EN and BG', async ({ page }) => {
    for (const path of ['/contact', '/bg/contact']) {
      await page.goto(path);
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      );
      const dockBox = (await page.locator('music-experience').boundingBox())!;
      const portalBox = (await page.locator('.site-footer .secret-portal').boundingBox())!;
      expect(overlaps(dockBox, portalBox)).toBe(false);
      expect(await isHitTestable(page, '.site-footer .secret-portal')).toBe(true);
    }
  });
});

test.describe('adaptive quality, occlusion & long-session stability', () => {
  test('effects quality preference persists and reduced motion stays independent', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('electricity-controls summary').click();
    const select = page.locator('electricity-controls [data-quality]');
    await select.selectOption('low');
    await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');
    await page.locator('electricity-controls summary').click();
    await expect(select).toHaveValue('low');

    await select.selectOption('high');
    await expect(page.locator('html')).toHaveAttribute('data-quality', 'high');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('circuit-field[data-place="background"]')).not.toHaveAttribute(
      'data-running',
    );
  });

  test('background circuit suspends drawing buffer while opaque street stage fills view', async ({
    page,
  }) => {
    await page.goto('/');
    const bgCanvas = page.locator('circuit-field[data-place="background"] canvas');
    await expect
      .poll(() => bgCanvas.evaluate((c: HTMLCanvasElement) => c.width))
      .toBeGreaterThan(10);

    await page
      .locator('[data-stage]')
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(() => bgCanvas.evaluate((c: HTMLCanvasElement) => c.width)).toBe(1);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect
      .poll(() => bgCanvas.evaluate((c: HTMLCanvasElement) => c.width))
      .toBeGreaterThan(10);
  });

  test('repeated scroll and player open/close cycles leave clean state with zero errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    const thirdParty: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stub</title>' }),
    );
    await page.route('https://www.youtube.com/iframe_api', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `
          window.YT = { Player: class {
            constructor(frame, { events }) {
              this.frame = frame;
              setTimeout(() => events.onReady({ target: this }), 0);
            }
            pauseVideo() {}
            destroy() { this.frame.remove(); }
          }};
          window.onYouTubeIframeAPIReady();
        `,
      }),
    );

    await page.goto('/');
    const origin = new URL(page.url()).origin;
    page.on('request', (req) => {
      const host = new URL(req.url()).origin;
      if (host !== origin && !/youtube/.test(host)) thirdParty.push(req.url());
    });

    const initialNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    const launch = page.locator('[data-music-launch]');
    const dialog = page.locator('#music-panel');
    const closeBtn = page.locator('[data-music-close]');

    for (let cycle = 0; cycle < 4; cycle++) {
      await launch.click();
      await expect(dialog).toBeVisible();
      await closeBtn.click();
      await expect(dialog).not.toBeVisible();
      await expect(page.locator('#music-panel iframe')).toHaveCount(0);

      for (const target of ['[data-avatar-anchor="caelora"]', '[data-stage]', '.hero']) {
        await page
          .locator(target)
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForTimeout(80);
      }
      expect(await page.locator('canvas.avatar-drawing').count()).toBeLessThanOrEqual(1);
    }

    const finalNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    expect(Math.abs(finalNodes - initialNodes)).toBeLessThan(20);
    expect(thirdParty).toEqual([]);
    expect(errors).toEqual([]);
  });
});
