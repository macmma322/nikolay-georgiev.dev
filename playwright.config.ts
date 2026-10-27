import { defineConfig, devices } from '@playwright/test';

const PORT = 4330;
// Points the suite at a server that is already running (a private build's
// preview, a staging URL); no web server is started then.
const EXTERNAL = process.env['PLAYWRIGHT_BASE_URL'];
// Installed Chrome and Edge as well (PW_CHANNELS=1), where the machine has them.
const CHANNELS = !!process.env['PW_CHANNELS'];

// Software WebGL in Chromium, so the /setup 3D views render in headless runs too.
const swiftshader = {
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] },
};
const desktop = { width: 1440, height: 900 };
// The other engines run the smoke paths and navigation; Chromium runs everything.
const smoke = { grep: /@smoke/ };
const crossEngine = ['smoke.spec.ts', 'navigation.spec.ts'];

// Runs against the production build (`astro preview` serves dist/), so the
// tests see the same HTML, CSP and assets that ship.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: EXTERNAL ?? `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    // ---------- Chromium: the full suite ----------
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: desktop, ...swiftshader } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...swiftshader } },
    {
      // Between the phone layout and the sticky table of contents (1180px).
      name: 'tablet',
      testMatch: 'pages.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, ...swiftshader },
    },
    { name: 'android-tablet', ...smoke, use: { ...devices['Galaxy Tab S4'], ...swiftshader } },

    // ---------- Firefox and WebKit: smoke and navigation ----------
    {
      name: 'firefox',
      testMatch: crossEngine,
      use: { ...devices['Desktop Firefox'], viewport: desktop },
    },
    {
      name: 'webkit',
      testMatch: crossEngine,
      use: { ...devices['Desktop Safari'], viewport: desktop },
    },
    { name: 'iphone', testMatch: crossEngine, use: { ...devices['iPhone 15'] } },
    { name: 'ipad', ...smoke, use: { ...devices['iPad (gen 7)'] } },

    ...(CHANNELS
      ? [
          { name: 'chrome', ...smoke, use: { channel: 'chrome', viewport: desktop } },
          { name: 'edge', ...smoke, use: { channel: 'msedge', viewport: desktop } },
        ]
      : []),
  ],
  ...(EXTERNAL
    ? {}
    : {
        webServer: {
          command: `npx astro preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
          url: `http://127.0.0.1:${PORT}/`,
          reuseExistingServer: !process.env['CI'],
          timeout: 60_000,
        },
      }),
});
