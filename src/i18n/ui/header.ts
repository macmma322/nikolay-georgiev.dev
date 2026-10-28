import type { L } from '@/i18n';

/** Site header, mobile menu and the language switch. */
export const header = {
  /** Landmark labels: screen readers add "navigation" themselves. */
  primary: { en: 'Primary', bg: 'Основна' },
  mobile: { en: 'Mobile', bg: 'Мобилна' },
  menu: { en: 'Menu', bg: 'Меню' },
  close: { en: 'Close', bg: 'Затворете' },
  siteMenu: { en: 'Site menu', bg: 'Меню на сайта' },
  navigation: { en: 'Navigation', bg: 'Навигация' },
  // Same wording as the footer facts (contact.ts).
  availability: { en: 'Availability', bg: 'На разположение' },
  language: { en: 'Language', bg: 'Език' },
  /** Muted after "CV" in the menu, which opens the CV page. */
  cvMeta: { en: 'EN · BG', bg: 'BG · EN' },
} as const satisfies Record<string, L>;
