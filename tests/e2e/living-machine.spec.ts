import { expect, test, type Page } from '@playwright/test';

const controller = (page: Page) => page.locator('electricity-controls');
const scene = (page: Page, name: string) =>
  page.locator('circuit-field[data-scene="' + name + '"]');

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

test('PCB scenes reverse with the browser scroll and pause away from the viewport', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('circuit-field[data-place="world"]')).toHaveCount(10);
  const board = scene(page, 'architecture');
  const move = (ratio: number) =>
    board.evaluate((node, ratio) => {
      window.scrollTo({
        top: window.scrollY + node.getBoundingClientRect().top - window.innerHeight * ratio,
        behavior: 'instant',
      });
    }, ratio);
  await move(0.68);
  await expect(board).toHaveAttribute('data-running', '');
  const progress = () => board.getAttribute('data-progress').then(Number);
  await expect.poll(progress).toBeGreaterThan(0.15);
  const first = await progress();
  await move(0.31);
  await expect.poll(progress).toBeGreaterThan(first + 0.22);
  await move(0.68);
  await expect.poll(progress).toBeCloseTo(first, 1);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(board).not.toHaveAttribute('data-running');
});

test('reduced motion retains the localized PCB and keeps the canvas stopped', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/bg');
  const processor = scene(page, 'processor');
  await expect(processor.locator('svg')).toBeVisible();
  await expect(processor.locator('canvas')).toBeHidden();
  await expect(processor).not.toHaveAttribute('data-running');
  await expect(controller(page).locator('summary')).toContainText('Реакция');
});
