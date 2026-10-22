/**
 * The site's languages. English is the default and lives at the root;
 * Bulgarian lives under /bg. Keep in step with `i18n` in astro.config.mjs.
 */
export const LOCALES = ['en', 'bg'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

interface LocaleMeta {
  /** BCP 47 tag for <html lang>, hreflang and JSON-LD inLanguage. */
  lang: string;
  /** Open Graph locale. */
  og: string;
  /** Intl locale for dates and numbers. */
  intl: string;
  /** The language's own name (switcher's accessible name). */
  name: string;
  /** Compact visible label. */
  short: string;
  /** URL prefix; the default locale has none. */
  prefix: '' | `/${string}`;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { lang: 'en', og: 'en_GB', intl: 'en-GB', name: 'English', short: 'EN', prefix: '' },
  bg: { lang: 'bg', og: 'bg_BG', intl: 'bg-BG', name: 'Български', short: 'BG', prefix: '/bg' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
