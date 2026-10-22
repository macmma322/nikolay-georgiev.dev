import type { L } from '@/i18n';

/**
 * The contact finale (footer and /contact page), its copy buttons and the
 * footer baseline.
 */
export const contact = {
  label: { en: 'Contact', bg: 'Контакт' },
  /** Rendered as `{lead} <em>{em}</em>`. */
  statement: {
    lead: { en: 'Tell me what has to work,', bg: 'Кажете ми какво трябва да работи\u00a0–' },
    em: { en: 'and what must never happen.', bg: 'и какво не бива да се случи никога.' },
  },
  support: {
    en: 'I put the second list in code and tests.',
    bg: 'Втория списък превръщам в код и тестове.',
  },
  copyEmail: { en: 'Copy email address', bg: 'Копирай имейла' },
  copyPhone: { en: 'Copy phone number', bg: 'Копирай телефона' },
  /** Personal profiles, a step down from the professional links. */
  elsewhere: { en: 'Elsewhere', bg: 'Още профили' },
  /** Visually hidden before the number. */
  phone: { en: 'Phone: ', bg: 'Телефон: ' },
  /** Muted after "CV" in the channel rail; the CV is English only. */
  cvMeta: { en: 'PDF', bg: 'PDF · англ.' },
  facts: {
    // "във": the value is "Варна, България", and the pair reads as one phrase.
    based: { en: 'Based in', bg: 'Живея във' },
    time: { en: 'Local time', bg: 'Местно време' },
    availability: { en: 'Availability', bg: 'На разположение' },
    languages: { en: 'Languages', bg: 'Езици' },
  },
  workingLanguages: { en: 'English, Bulgarian', bg: 'Английски, български' },
  baseline: {
    en: 'Built with Astro and TypeScript. No trackers, no cookies.',
    bg: 'Направен с Astro и TypeScript. Без тракери, без бисквитки.',
  },
  /** CopyButton: visible states and the live-region messages. */
  copy: {
    idle: { en: 'Copy', bg: 'Копирай' },
    done: { en: 'Copied', bg: 'Копирано' },
    failed: { en: 'Failed', bg: 'Неуспешно' },
    doneMessage: { en: 'Copied to clipboard', bg: 'Копирано в клипборда' },
    failedMessage: {
      en: 'Copy failed. Select the text and copy it manually.',
      bg: 'Неуспешно копиране. Маркирайте текста и го копирайте ръчно.',
    },
  },
} as const satisfies Record<string, L | Record<string, L>>;
