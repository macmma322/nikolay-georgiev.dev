// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** @param {string} file */
const font = (file) => `./node_modules/@fontsource-variable/${file}`;

/**
 * The Cyrillic subset the companion faces cover (as Fontsource ships it).
 * @type {[string, ...string[]]}
 */
const CYRILLIC = ['U+0301', 'U+0400-045F', 'U+0490-0491', 'U+04B0-04B1', 'U+2116'];

export default defineConfig({
  // Canonical production origin. Railway preview URLs still work; canonical
  // tags and the sitemap point at the long-term domain.
  site: 'https://nikolay-georgiev.dev',
  trailingSlash: 'never',
  // English at the root, Bulgarian under /bg. Locale labels, prefixes and
  // Intl tags live in src/i18n/config.ts; keep the two lists in step.
  i18n: {
    locales: ['en', 'bg'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  devToolbar: { enabled: false },
  build: {
    format: 'file',
    // Pages are small and visits are short: inlining CSS removes every
    // render-blocking request, and Astro's CSP hashes the inline styles.
    inlineStylesheets: 'always',
  },
  integrations: [
    // Every indexable page with its en/bg/x-default alternates. No lastmod:
    // there are no reliable per-page modification dates, and a build date
    // would claim freshness that is not there. No priority or changefreq.
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
      i18n: { defaultLocale: 'en', locales: { en: 'en', bg: 'bg' } },
      serialize: (item) => {
        const en = item.links?.find((link) => link.lang === 'en');
        // Copy: pages of one locale group share the same links array.
        return en
          ? { ...item, links: [...(item.links ?? []), { lang: 'x-default', url: en.url }] }
          : item;
      },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Hubot Sans',
      cssVariable: '--font-display',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      // Astro sizes the metric fallback from the file's default instance
      // (Condensed ExtraLight): 67.5% Arial, which shrinks `ch` while Hubot
      // loads and makes Bulgarian lines re-wrap twice (layout shift).
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            src: [font('hubot-sans/files/hubot-sans-latin-standard-normal.woff2')],
            weight: '200 900',
            style: 'normal',
            stretch: '75% 125%',
            display: 'swap',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Mona Sans',
      cssVariable: '--font-body',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: [font('mona-sans/files/mona-sans-latin-wght-normal.woff2')],
            weight: '200 900',
            style: 'normal',
            display: 'swap',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Martian Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      options: {
        variants: [
          {
            src: [font('martian-mono/files/martian-mono-latin-wght-normal.woff2')],
            weight: '100 800',
            style: 'normal',
            display: 'swap',
          },
        ],
      },
    },
    // Hubot Sans, Mona Sans and Martian Mono have no Cyrillic. These faces
    // cover only the Cyrillic range and come first in the stacks (tokens.css):
    // Latin text never downloads them. No fallbacks, the next family in the
    // stack is the fallback.
    //
    // display: 'optional', not 'swap': a late Cyrillic face re-wrapped the
    // Bulgarian hero and moved everything under it (CLS 0.13 with fonts 800 ms
    // late, 0.001 with optional). Bulgarian pages preload these faces; on a
    // slow first view the system font stays for that page, later pages use
    // the cached face.
    {
      provider: fontProviders.local(),
      name: 'TikTok Sans',
      cssVariable: '--font-cyr',
      fallbacks: [],
      options: {
        variants: [
          {
            src: [font('tiktok-sans/files/tiktok-sans-cyrillic-wdth-normal.woff2')],
            weight: '300 900',
            style: 'normal',
            stretch: '75% 150%',
            display: 'optional',
            unicodeRange: CYRILLIC,
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Martian Mono Cyrillic',
      cssVariable: '--font-mono-cyr',
      fallbacks: [],
      options: {
        variants: [
          {
            src: [font('martian-mono/files/martian-mono-cyrillic-wght-normal.woff2')],
            weight: '100 800',
            style: 'normal',
            display: 'optional',
            unicodeRange: CYRILLIC,
          },
        ],
      },
    },
  ],
  security: {
    csp: true,
  },
  vite: {
    // Three.js (about 155 kB gzipped) is one lazy chunk loaded only by /setup.
    build: { chunkSizeWarningLimit: 700 },
  },
  markdown: {
    syntaxHighlight: false,
  },
  image: {
    responsiveStyles: true,
  },
});
