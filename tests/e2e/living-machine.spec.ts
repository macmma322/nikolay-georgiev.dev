import { expect, test, type Page } from '@playwright/test';

const controller = (page: Page) => page.locator('electricity-controls');

async function chooseLive(page: Page) {
  await controller(page).locator('summary').click();
  await controller(page).locator('[data-mode]').selectOption('live');
}

function toneWav(hertz: number, seconds = 1, amplitude = 0.3) {
  const rate = 24000;
  const bytes = 2 * Math.round(rate * seconds);
  const buffer = Buffer.alloc(44 + bytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(bytes, 40);
  for (let index = 0; index < bytes / 2; index++)
    buffer.writeInt16LE(
      Math.round(amplitude * 32767 * Math.sin((2 * Math.PI * hertz * index) / rate)),
      44 + index * 2,
    );
  return { name: 'test.wav', mimeType: 'audio/wav', buffer };
}

declare global {
  interface Window {
    machineAudio?: {
      contexts: AudioContext[];
      requests: number;
      recorded: number;
      revoked: number;
    };
  }
}

async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    const stats = (window.machineAudio = {
      contexts: [] as AudioContext[],
      requests: 0,
      recorded: 0,
      revoked: 0,
    });
    const Context = window.AudioContext;
    window.AudioContext = class extends Context {
      constructor() {
        super();
        stats.contexts.push(this);
      }
    };
    const deny = () => {
      stats.requests++;
      return Promise.reject(new DOMException('Test guard', 'NotAllowedError'));
    };
    navigator.mediaDevices.getDisplayMedia = deny;
    navigator.mediaDevices.getUserMedia = deny;
    window.MediaRecorder = class extends MediaRecorder {
      constructor(stream: MediaStream) {
        super(stream);
        stats.recorded++;
      }
    };
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      stats.revoked++;
      revoke(url);
    };
  });
}

test('ambient opens without requesting audio or creating an audio graph', async ({ page }) => {
  await observeAudio(page);
  await page.goto('/');
  await expect(controller(page)).toHaveAttribute('data-reactivity', 'ambient');
  await chooseLive(page);
  await expect(controller(page).locator('[data-live-sources]')).toBeVisible();
  expect(
    await page.evaluate(() => ({
      contexts: window.machineAudio?.contexts.length,
      permissions: window.machineAudio?.requests,
      recorded: window.machineAudio?.recorded,
    })),
  ).toEqual({ contexts: 0, permissions: 0, recorded: 0 });
});

test('the generated demo produces bass and high FFT signal, then pauses, resumes and closes', async ({
  page,
}) => {
  await observeAudio(page);
  await page.goto('/');
  const origin = new URL(page.url()).origin;
  const unexpectedRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) unexpectedRequests.push(request.url());
  });
  await chooseLive(page);
  await controller(page).locator('[data-demo]').click();
  await expect(controller(page)).toHaveAttribute('data-audio-status', 'running');
  await expect(controller(page)).toHaveAttribute('data-audio-band', 'bass');
  await expect(controller(page)).toHaveAttribute('data-audio-band', 'high', { timeout: 13_000 });
  await controller(page).getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(controller(page)).toHaveAttribute('data-audio-status', 'paused');
  await expect
    .poll(() => page.evaluate(() => window.machineAudio?.contexts[0]?.state))
    .toBe('suspended');
  await controller(page).getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(controller(page)).toHaveAttribute('data-audio-status', 'running');
  await controller(page).getByRole('button', { name: 'Stop audio' }).click();
  await expect(controller(page)).toHaveAttribute('data-reactivity', 'ambient');
  await expect(controller(page).locator('[data-audio-dock]')).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.machineAudio?.contexts.map((audio) => audio.state)))
    .toEqual(['closed']);
  expect(
    await page.evaluate(() => [window.machineAudio?.requests, window.machineAudio?.recorded]),
  ).toEqual([0, 0]);
  expect(unexpectedRequests).toEqual([]);
});

test('a chosen WAV stays local, detects silence and releases the media at end', async ({
  page,
}) => {
  await observeAudio(page);
  await page.goto('/');
  await chooseLive(page);
  await controller(page)
    .locator('[data-local-file]')
    .setInputFiles(toneWav(4200, 1.8, 0));
  await expect(controller(page)).toHaveAttribute('data-audio-band', 'silence');
  await expect(controller(page)).toHaveAttribute('data-reactivity', 'ambient', { timeout: 8000 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stats = window.machineAudio!;
        return {
          closed: stats.contexts.every((context) => context.state === 'closed'),
          revoked: stats.revoked,
        };
      }),
    )
    .toEqual({ closed: true, revoked: 1 });
});

test('missing and unsupported audio return to ambient', async ({ page }) => {
  await page.goto('/');
  await chooseLive(page);
  await controller(page)
    .locator('[data-local-file]')
    .setInputFiles({
      name: 'empty.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.alloc(0),
    });
  await expect(controller(page).locator('[data-audio-notice]')).toContainText(
    'Ambient mode restored',
  );
  await controller(page).locator('[data-mode]').selectOption('live');
  await page.evaluate(() =>
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true }),
  );
  await controller(page).locator('[data-demo]').click();
  await expect(controller(page)).toHaveAttribute('data-reactivity', 'ambient');
  await expect(controller(page).locator('[data-audio-dock]')).toBeHidden();
});

test('a blocked audio start closes the graph and leaves Ambient usable', async ({ page }) => {
  await observeAudio(page);
  await page.addInitScript(() => {
    AudioContext.prototype.resume = () =>
      Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await page.goto('/');
  await chooseLive(page);
  await controller(page).locator('[data-demo]').click();
  await expect(controller(page)).toHaveAttribute('data-reactivity', 'ambient');
  await expect(controller(page).locator('[data-audio-notice]')).toContainText(
    'Local audio is unavailable',
  );
  await expect
    .poll(() => page.evaluate(() => window.machineAudio?.contexts[0]?.state))
    .toBe('closed');
});

test('the circuit field and vinyl stay anchored as the page scrolls', async ({ page }) => {
  await page.goto('/');
  const board = page.locator('circuit-field[data-place="background"]');
  const dock = page.locator('music-experience');
  await expect(board).toHaveCount(1);
  await expect(board).toHaveAttribute('data-running', '');
  await expect(dock).toBeInViewport();

  const frame = await board.boundingBox();
  const corner = await dock.boundingBox();
  const viewport = page.viewportSize()!;
  expect(frame).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  expect(viewport.width - corner!.x - corner!.width).toBeLessThan(25);
  expect(viewport.height - corner!.y - corner!.height).toBeLessThan(25);

  for (const section of ['#capabilities', '#contact']) {
    await page.locator(section).evaluate((section) => {
      section.scrollIntoView({ behavior: 'instant' });
    });
    expect(await board.boundingBox()).toEqual(frame);
    expect(await dock.boundingBox()).toEqual(corner);
  }
});

test('a secondary page has the same dock and background', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('circuit-field[data-place="background"]')).toBeInViewport();
  await expect(page.locator('[data-music-launch]')).toBeInViewport();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('the fixed settings panel closes by Escape and restores the trigger focus', async ({
  page,
}) => {
  await page.goto('/');
  const settings = controller(page).locator('details');
  const trigger = settings.locator('summary');
  await trigger.click();
  await settings.locator('[data-mode]').focus();
  await page.keyboard.press('Escape');
  await expect(settings).not.toHaveAttribute('open');
  await expect(trigger).toBeFocused();
});

test('reduced motion retains the localized PCB and keeps the canvas stopped', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bg');
  const board = page.locator('circuit-field[data-place="background"]');
  await expect(board.locator('svg')).toBeVisible();
  await expect(board.locator('canvas')).toBeHidden();
  await expect(board).not.toHaveAttribute('data-running');
  await expect(controller(page).locator('summary')).toContainText('Реакция');
});
