import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { applyYouTubeState } from '../../src/scripts/youtube-player';
import { createCircuitReactivity } from '../../src/scripts/circuit-reactivity';

const apiUrl = 'https://www.youtube.com/iframe_api';
const watchUrl = 'https://youtu.be/44UaY-AN6ho';
const embedUrl = 'https://www.youtube-nocookie.com/embed/44UaY-AN6ho';
const launch = (page: Page) => page.locator('[data-music-launch]');
const player = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.locator('[data-music-screen]') });
const status = (page: Page) => player(page).getByRole('status');

type PlayerMock = {
  created: number;
  paused: number;
  destroyed: number;
  pauseWhileOpen: boolean;
  emit(event: 'onStateChange' | 'onError', data: number): void;
};

declare global {
  interface Window {
    musicMock: PlayerMock;
  }
}

async function mockPlayer(page: Page) {
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><head><title>Test fixture</title></head><body><button>Play video</button></body></html>',
    }),
  );
  await page.route(apiUrl, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
        const stats = window.musicMock = {created: 0, paused: 0, destroyed: 0, pauseWhileOpen: false};
        window.YT = {Player: class {
          constructor(frame, {events}) {
            stats.created += 1;
            this.frame = frame;
            stats.emit = (event, data) => events[event]({data, target: this});
            this.pauseVideo = () => {
              stats.paused += 1;
              stats.pauseWhileOpen = !!frame.closest('dialog')?.open;
            };
            setTimeout(() => events.onReady({target: this}), 0);
          }
          destroy() {
            stats.destroyed += 1;
            this.frame.remove();
          }
        }};
        window.onYouTubeIframeAPIReady();
      `,
    }),
  );
}

function emit(page: Page, event: 'onStateChange' | 'onError', data: number) {
  return page.evaluate(([name, code]) => window.musicMock.emit(name, code), [event, data] as const);
}

async function openPlayer(page: Page) {
  await launch(page).click();
  await expect(player(page)).toBeVisible();
  await expect(status(page)).toHaveText('YouTube player loaded');
}

test('player event adapter ignores pre-play states and pauses hidden playing or buffering', () => {
  const messages: string[] = [];
  const mock = { pauseVideo: () => messages.push('pauseVideo') };
  const report = (state: string) => {
    messages.push(state);
  };
  for (const [code, hidden] of [
    [-1, false],
    [5, false],
    [3, false],
    [1, false],
    [2, false],
    [0, false],
    [3, true],
    [1, true],
  ] as const) {
    applyYouTubeState(code, hidden, report, mock.pauseVideo);
  }
  expect(messages).toEqual(['buffering', 'playing', 'paused', 'ended', 'pauseVideo', 'pauseVideo']);
});

test('renders the vinyl dock with no third-party requests before opt-in', async ({ page }) => {
  await mockPlayer(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/youtube|ytimg|googlevideo/.test(new URL(request.url()).hostname))
      requests.push(request.url());
  });
  await page.goto('/');
  await expect(launch(page)).toHaveText(/now on repeat.*memory reboot.*narvent.*youtube/i);
  await expect(launch(page)).toHaveAttribute('href', watchUrl);
  await expect(launch(page)).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(player(page)).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(launch(page)).toBeInViewport();
  await expect(page.locator('footer#contact')).toBeVisible();
  await expect(page.locator('footer#contact .baseline a[href="/open-source"]')).toBeVisible();
  await expect(page.locator('footer#contact a[href^="mailto:"]')).toHaveCount(1);
  expect(requests).toEqual([]);

  await openPlayer(page);
  const frame = player(page).locator('iframe');
  await expect(frame).toHaveAttribute('title', 'Memory Reboot — VØJ, Narvent');
  await expect.poll(() => requests.length).toBe(2);
  const src = await frame.getAttribute('src');
  const url = new URL(src ?? '');
  expect(url.origin + url.pathname).toBe(embedUrl);
  expect(url.searchParams.get('autoplay')).toBe('0');
  expect(url.searchParams.get('controls')).toBe('1');
  expect(url.searchParams.get('origin')).toBe(new URL(page.url()).origin);
  await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
});

test('opens by keyboard, shows visible focus, closes by Escape, and restores focus', async ({
  page,
}) => {
  await mockPlayer(page);
  await page.goto('/');
  await launch(page).focus();
  await expect(launch(page)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  const close = player(page).getByRole('button', { name: 'Close player' });
  await expect(close).toBeFocused();
  await expect(close).toHaveCSS('outline-style', 'solid');
  await expect(status(page)).toHaveText('YouTube player loaded');
  await page.keyboard.press('Escape');
  await expect(player(page)).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(launch(page)).toBeFocused();
});

test('announces confirmed playback, pauses hidden playback, and stops before closing', async ({
  page,
}) => {
  await mockPlayer(page);
  await page.goto('/');
  await openPlayer(page);
  const record = player(page).locator('.record');
  await expect(record).toHaveCSS('animation-play-state', 'paused');
  await emit(page, 'onStateChange', 1);
  await expect(status(page)).toHaveText('Playing');
  await expect(record).toHaveCSS('animation-play-state', 'running');
  await emit(page, 'onStateChange', 3);
  await expect(status(page)).toHaveText('Buffering…');
  await expect(record).toHaveCSS('animation-play-state', 'paused');
  await emit(page, 'onStateChange', 2);
  await expect(status(page)).toHaveText('Paused');
  await expect(record).toHaveCSS('animation-play-state', 'paused');
  await emit(page, 'onStateChange', 0);
  await expect(status(page)).toHaveText('Playback ended');

  const pausedBefore = await page.evaluate(() => window.musicMock.paused);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await emit(page, 'onStateChange', 1);
  await expect(status(page)).toHaveText('Playback ended');
  expect(await page.evaluate(() => window.musicMock.paused)).toBeGreaterThan(pausedBefore);

  await player(page).getByRole('button', { name: 'Close player' }).click();
  expect(await page.evaluate(() => window.musicMock.pauseWhileOpen)).toBe(true);
  expect(await page.evaluate(() => window.musicMock.destroyed)).toBe(1);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('offers the official link on script failure and retries on reopening', async ({ page }) => {
  await mockPlayer(page);
  await page.route(apiUrl, (route) => route.abort(), { times: 1 });
  await page.goto('/');
  await launch(page).click();
  await expect(status(page)).toHaveText('YouTube player could not load.');
  await expect(player(page).getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute(
    'href',
    watchUrl,
  );
  await expect(player(page).locator('iframe')).toHaveCount(0);
  await player(page).getByRole('button', { name: 'Close player' }).click();
  await openPlayer(page);
});

test('replaces a restricted embed with the official fallback at the same dimensions', async ({
  page,
}) => {
  await mockPlayer(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await openPlayer(page);
  const screen = player(page).locator('[data-music-screen]');
  const before = await screen.boundingBox();
  await emit(page, 'onError', 150);
  await expect(status(page)).toHaveText('YouTube playback is unavailable here.');
  await expect(player(page).locator('iframe')).toHaveCount(0);
  await expect(player(page).getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute(
    'href',
    watchUrl,
  );
  const after = await screen.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
});

test('cleans up when the component is detached and reuses the API on reconnect', async ({
  page,
}) => {
  await mockPlayer(page);
  await page.goto('/');
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await openPlayer(page);
    await emit(page, 'onStateChange', 1);
    await expect(status(page)).toHaveText('Playing');
    await page.locator('music-experience').evaluate((node) => {
      node.remove();
      document.body.append(node);
    });
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('script[src="' + apiUrl + '"]')).toHaveCount(1);
    expect(await page.evaluate(() => window.musicMock.destroyed)).toBe(cycle);
    expect(await page.evaluate(() => window.musicMock.created)).toBe(cycle);
  }
});

test('drops a pending open if it closes before the shared script resolves', async ({ page }) => {
  await mockPlayer(page);
  let finishRequest!: () => void;
  const gate = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });
  await page.route(apiUrl, async (route) => {
    await gate;
    await route.fallback();
  });
  await page.goto('/');
  await launch(page).click();
  await expect(status(page)).toHaveText('Loading YouTube player…');
  await player(page).getByRole('button', { name: 'Close player' }).click();
  finishRequest();
  await expect.poll(() => page.evaluate(() => !!window.musicMock)).toBe(true);
  expect(await page.evaluate(() => window.musicMock.created)).toBe(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await openPlayer(page);
  expect(await page.evaluate(() => window.musicMock.created)).toBe(1);
});

test('uses Bulgarian strings and reduces motion', async ({ page }) => {
  await mockPlayer(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bg');
  await expect(launch(page)).toContainText('На повторение');
  await launch(page).click();
  await expect(player(page)).toHaveCSS('animation-name', 'none');
  await expect(status(page)).toHaveText('Плейърът на YouTube е зареден');
  await expect(player(page).locator('iframe')).toHaveAttribute('src', /&hl=bg$/);
  await emit(page, 'onStateChange', 1);
  await expect(status(page)).toHaveText('Възпроизвежда се');
  await expect(player(page).locator('.record')).toHaveCSS('animation-name', 'none');
  await expect(player(page).getByRole('button', { name: 'Затвори плейъра' })).toBeVisible();
});

test('keeps a usable watch link without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(new URL('/', baseURL).href);
    await expect(launch(page)).toHaveAttribute('href', watchUrl);
    await expect(page.locator('iframe')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('the circuit eases through playback, buffering and decay', () => {
  const reactivity = createCircuitReactivity();
  const idle = { ...reactivity.advance(0) };
  reactivity.setState('playing');
  expect(reactivity.advance(0)).toEqual(idle);
  const rising = { ...reactivity.advance(0.8) };
  const active = { ...reactivity.advance(4) };
  expect(rising.signals).toBeGreaterThan(idle.signals);
  expect(active.signals).toBeGreaterThan(rising.signals);
  reactivity.setState('buffering');
  const buffering = { ...reactivity.advance(4) };
  expect(buffering.signals).toBeLessThan(active.signals);
  expect(buffering.signals).toBeGreaterThan(idle.signals);
  reactivity.setState('paused');
  expect(reactivity.advance(0)).toEqual(buffering);
  expect(reactivity.advance(8).signals).toBeCloseTo(idle.signals, 2);
});

test('keeping the circuit offscreen or reduced stops rendering', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('circuit-field[data-place=avatar-pad]');
  await field.scrollIntoViewIfNeeded();
  await expect(field).toHaveAttribute('data-running', '');
  await expect(field).toHaveAttribute('data-playback', 'idle');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(field).not.toHaveAttribute('data-running');
  await expect(field.locator('svg')).toBeVisible();
  await expect(field.locator('canvas')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(field).toHaveAttribute('data-running', '');
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
  );
  await expect(field).not.toHaveAttribute('data-running');
});

test('switches among the exact selections and resets the circuit until playback is confirmed', async ({
  page,
}) => {
  await mockPlayer(page);
  await page.goto('/');
  await openPlayer(page);
  const field = player(page).locator('circuit-field[data-place=panel]');
  await expect(field).toHaveAttribute('data-playback', 'ready');
  await emit(page, 'onStateChange', 1);
  await expect(field).toHaveAttribute('data-playback', 'playing');

  for (const id of ['5Kn0Yc56jaw', 'IzTJQiFoNGE', 'JOUELP4mnCQ']) {
    await player(page).getByRole('combobox').selectOption(id);
    await expect(status(page)).toHaveText('YouTube player loaded');
    const src = await player(page).locator('iframe').getAttribute('src');
    expect(new URL(src ?? '').pathname).toBe('/embed/' + id);
    await expect(player(page).getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute(
      'href',
      'https://youtu.be/' + id,
    );
    await expect(field).toHaveAttribute('data-playback', 'ready');
  }

  expect(await page.evaluate(() => window.musicMock.destroyed)).toBe(3);
  await emit(page, 'onError', 150);
  await expect(field).toHaveAttribute('data-playback', 'unavailable');
  await expect(player(page).locator('iframe')).toHaveCount(0);
});

test('the expanded dialog passes an axe scan', async ({ page }) => {
  await mockPlayer(page);
  await page.goto('/');
  await openPlayer(page);
  const result = await new AxeBuilder({ page })
    .include('#music-panel')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [768, 1024],
  [390, 844],
  [320, 740],
] as const) {
  test('fits the entire player and footer at ' + width + 'px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Exact widths are exercised once.');
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockPlayer(page);
    await page.goto('/');
    await openPlayer(page);
    const frame = await player(page).locator('iframe').boundingBox();
    if (!frame) throw new Error('Expected a visible official player viewport');
    expect(frame.width).toBeGreaterThanOrEqual(200);
    expect(frame.height).toBeGreaterThanOrEqual(200);
    expect(frame.x).toBeGreaterThanOrEqual(0);
    expect(frame.x + frame.width).toBeLessThanOrEqual(width);
    expect(frame.y).toBeGreaterThanOrEqual(0);
    expect(frame.y + frame.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
