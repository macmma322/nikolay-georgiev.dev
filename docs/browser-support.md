# Browser support

What is tested, how, and what still needs a real device. Updated 2026-10-27.

## Automated (Playwright 1.56.1, `playwright.config.ts`)

| Project          | Engine (version)        | Emulates                   | Runs                            | CI  |
| ---------------- | ----------------------- | -------------------------- | ------------------------------- | --- |
| `desktop`        | Chromium 141            | 1440 × 900                 | full suite, 3D on SwiftShader   | yes |
| `mobile`         | Chromium 141            | Pixel 7 (Android Chrome)   | full suite, 3D on SwiftShader   | yes |
| `tablet`         | Chromium 141            | 768 × 1024                 | `pages.spec.ts`                 | yes |
| `android-tablet` | Chromium 141            | Galaxy Tab S4              | `@smoke`                        | yes |
| `firefox`        | Firefox 142             | 1440 × 900                 | `smoke.spec`, `navigation.spec` | yes |
| `webkit`         | WebKit 26.0             | Desktop Safari, 1440 × 900 | `smoke.spec`, `navigation.spec` | yes |
| `iphone`         | WebKit 26.0             | iPhone 15                  | `smoke.spec`, `navigation.spec` | yes |
| `ipad`           | WebKit 26.0             | iPad (gen 7)               | `@smoke`                        | yes |
| `edge`, `chrome` | installed Edge / Chrome | 1440 × 900                 | `@smoke`, with `PW_CHANNELS=1`  | no  |

Playwright's WebKit and Firefox are builds of those engines, not the shipping
Safari and Firefox, and device projects emulate viewport, touch and user agent
only. A pass there is good evidence, not proof.

The 3D views are tested in Chromium only, on software WebGL (SwiftShader).
Firefox and WebKit run the same paths and get the drawings, which is what a
visitor without hardware WebGL gets too.

## Checked by hand

- Edge 156 (Windows 11, installed): `@smoke` passed with `PW_CHANNELS=1`.
- Chromium on an RTX 3080 (ANGLE / D3D11): desk → inside → desk, exploded view,
  part focus, secondary PC, laptop, filmed frame by frame.

## Still needs real devices

- Safari on macOS, iPhone and iPad: WebGL context limits, toolbar resizing,
  rotation, backgrounding and restoring the tab, two-finger turn and pinch over
  the model (`touch-action: pan-y`).
- Chrome, Samsung Internet and Firefox on Android phones and tablets: the same
  touch gestures, and frame rate on a mid-range GPU.
- Opera and Opera GX: not installed on the test machine. They are Chromium, so
  the Chromium results should carry over, but GX's GPU and frame-limiter
  settings have not been tried.

## Fallbacks the tests hold

- No WebGL, blocked WebGL or Save-Data: the SVG drawings and the parts list.
- A lost WebGL context: the drawing shows, a fresh stage is built; after three
  losses on one page the drawings stay.
- No JavaScript: every part's details are on the page, views stacked.
- Reduced motion: view changes, modes and focus happen at once.
