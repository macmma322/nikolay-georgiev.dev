import type { L } from '@/i18n';

/**
 * Strings shared by several areas. Owned by the foundation pass: other areas
 * add their own strings to their own dictionary instead of editing this one.
 */
export const common = {
  skipLink: { en: 'Skip to content', bg: 'Към съдържанието' },
  /** Visually hidden after every external link that opens a new tab. */
  newTab: { en: '(opens in a new tab)', bg: '(отваря се в нов раздел)' },
  /** Visually hidden after the brand links, which lead home. */
  homeSuffix: { en: ', home', bg: ', начало' },
  home: { en: 'Home', bg: 'Начало' },
  getInTouch: { en: 'Get in touch', bg: 'Свържете се с мен' },
  cv: { en: 'CV', bg: 'CV' },
  downloadCv: { en: 'Download CV', bg: 'Изтеглете CV' },
  /** Visually hidden after a CV download link. */
  pdfDownload: { en: '(PDF download)', bg: '(PDF за изтегляне)' },
  /** Visually hidden before a status label. */
  statusPrefix: { en: 'Status: ', bg: 'Статус: ' },
} as const satisfies Record<string, L>;
