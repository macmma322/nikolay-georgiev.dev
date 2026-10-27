import { defineConfig, devices } from '@playwright/test';

const PORT = 4330;
// Points the suite at a server that is already running (a private build's
// preview, a staging URL); no web server is started then.
const EXTERNAL = process.env['PLAYWRIGHT_BASE_URL'];

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
    // Software WebGL, so the /setup 3D views render in headless runs too.
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      // Between the phone layout and the sticky table of contents (1180px).
      name: 'tablet',
      testMatch: 'pages.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
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
