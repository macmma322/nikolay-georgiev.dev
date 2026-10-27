export const projects = [
  'caelora',
  'uss-x-academy',
  'jarvis',
  'zone-32-19',
  'kobait',
  'malrynth',
  'stemini',
] as const;

export const locales = ['en', 'bg'] as const;
export type Locale = (typeof locales)[number];

export const other = (locale: Locale): Locale => (locale === 'en' ? 'bg' : 'en');

/** Every page as a locale-free path (the English URL). */
export const pages = [
  '/',
  '/work',
  '/lab',
  '/setup',
  '/about',
  '/contact',
  '/open-source',
  '/open-source/blueprint',
  ...projects.map((p) => `/work/${p}`),
];

/** The same page in a locale: '/' → '/bg', '/work/jarvis' → '/bg/work/jarvis'. */
export const localize = (path: string, locale: Locale): string =>
  locale === 'en' ? path : path === '/' ? '/bg' : `/bg${path}`;

/** Every route in every locale: { locale: 'bg', page: '/work', path: '/bg/work' }. */
export const allRoutes = locales.flatMap((locale) =>
  pages.map((page) => ({ locale, page, path: localize(page, locale) })),
);

/** Unknown addresses, and the 404 page each locale's server answers them with. */
export const notFound = { en: '/missing', bg: '/bg/missing' } as const;
export const notFoundPage = { en: '/404', bg: '/bg/404' } as const;

export const SITE = 'https://nikolay-georgiev.dev';
/** Canonical URL: the root keeps its slash, nothing else has one. */
export const canonical = (path: string) => `${SITE}${path}`;

export const EMAIL = 'nikolay.georgiev00@outlook.com';
export const PHONE_TEL = '+359893670247';
/** The phone number in any spacing, with or without the country code. */
export const PHONE_RE = /(\+?359[\s-]*)?89[\s-]*367[\s-]*0247/;

export const CYRILLIC = /[Ѐ-ӿ]/;

/** Visible strings the tests look for (contract §8 glossary). */
export const ui = {
  name: { en: 'Nikolay Georgiev', bg: 'Николай Георгиев' },
  menu: { en: 'Menu', bg: 'Меню' },
  work: { en: 'Work', bg: 'Проекти' },
  lab: { en: 'Lab', bg: 'Лаборатория' },
  setup: { en: 'Setup', bg: 'Техника' },
  openSource: { en: 'Open Source', bg: 'Отворен код' },
  about: { en: 'About', bg: 'За мен' },
  contact: { en: 'Contact', bg: 'Контакт' },
  copied: { en: 'Copied', bg: 'Копирано' },
  newTab: { en: 'opens in a new tab', bg: 'отваря се в нов раздел' },
  og: { en: 'en_GB', bg: 'bg_BG' },
} as const satisfies Record<string, Record<Locale, string>>;
