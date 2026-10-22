import { cleanPath } from '@/lib/paths';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, isLocale, type Locale } from './config';

export * from './config';

/**
 * A value written once per locale, side by side, so a translation cannot be
 * forgotten: a missing locale fails the typecheck.
 */
export type L<T = string> = { readonly [K in Locale]: T };

/** A dictionary with every L<T> leaf replaced by its T. */
export type Resolved<T> =
  T extends L<infer V>
    ? V
    : T extends readonly (infer U)[]
      ? readonly Resolved<U>[]
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { readonly [K in keyof T]: Resolved<T[K]> }
          : T;

/** Builds an L<T> by calling `fn` once per locale. */
export function byLocale<T>(fn: (locale: Locale) => T): L<T> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, fn(locale)])) as unknown as L<T>;
}

const isLeaf = (value: unknown): value is L<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length === LOCALES.length &&
  LOCALES.every((locale) => locale in value);

/**
 * Resolves plain data (objects, arrays, L<T> leaves) for one locale. Objects
 * whose only keys are the locales are leaves, so dictionaries never use a
 * locale code as an ordinary key.
 */
export function resolve<T>(value: T, locale: Locale): Resolved<T> {
  if (isLeaf(value)) return value[locale] as Resolved<T>;
  if (Array.isArray(value))
    return value.map((item: unknown) => resolve(item, locale)) as Resolved<T>;
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolve(item, locale)]),
    ) as Resolved<T>;
  }
  return value as Resolved<T>;
}

/** Splits a site path into its locale and the locale-free path: '/bg/work' → bg, '/work'. */
export function splitLocale(path: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    const { prefix } = LOCALE_META[locale];
    if (!prefix) continue;
    const rest = path.startsWith(prefix) ? path.slice(prefix.length) : null;
    if (rest === null) continue;
    if (rest === '') return { locale, path: '/' };
    if (rest.startsWith('/')) return { locale, path: rest };
    if (rest.startsWith('#') || rest.startsWith('?')) return { locale, path: `/${rest}` };
  }
  return { locale: DEFAULT_LOCALE, path };
}

/**
 * The same internal path in another locale. Fragments, external URLs and
 * files (anything with an extension, e.g. the CV PDF) are returned unchanged.
 */
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const { path: bare } = splitLocale(path);
  const pathname = bare.split(/[?#]/)[0] ?? '';
  if (/\.[a-z0-9]+$/i.test(pathname)) return bare;
  const { prefix } = LOCALE_META[locale];
  if (!prefix) return bare;
  if (bare === '/') return prefix;
  return bare.startsWith('/#') || bare.startsWith('/?')
    ? `${prefix}${bare.slice(1)}`
    : `${prefix}${bare}`;
}

/** One page in every locale: '/bg/work/jarvis' → { en: '/work/jarvis', bg: '/bg/work/jarvis' }. */
export function alternates(path: string): L<string> {
  const { path: bare } = splitLocale(path);
  return byLocale((locale) => localizePath(bare, locale));
}

export function localeOf(astro: { currentLocale?: string | undefined }): Locale {
  return isLocale(astro.currentLocale) ? astro.currentLocale : DEFAULT_LOCALE;
}

/**
 * Per-render helpers for .astro files: `const { l, t, href } = useI18n(Astro);`
 * The locale comes from the URL (Astro.currentLocale), so components need no
 * `lang` prop.
 */
export function useI18n(astro: { currentLocale?: string | undefined; url: URL }) {
  const locale = localeOf(astro);
  const path = cleanPath(astro.url.pathname);
  return {
    locale,
    meta: LOCALE_META[locale],
    /** Picks this locale's value. */
    l: <T>(value: L<T>): T => value[locale],
    /** Resolves a dictionary (or any plain data holding L<T> leaves). */
    t: <T>(dict: T): Resolved<T> => resolve(dict, locale),
    /** Locale-aware internal href. */
    href: (target: string) => localizePath(target, locale),
    /** This page's locale-free path, e.g. '/work/jarvis'. */
    path: splitLocale(path).path,
    /** This page in every locale. */
    alternates: alternates(path),
  };
}
