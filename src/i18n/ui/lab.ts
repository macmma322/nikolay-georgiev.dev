import type { L } from '@/i18n';

/** The Lab page and its ledger rows (LabCard, also used on the home page). */
export const lab = {
  eyebrow: { en: 'Engineering lab', bg: 'Инженерна лаборатория' },
  title: { en: 'Lab', bg: 'Лаборатория' },
  lede: {
    en: 'Smaller tools, working methods and the systems I intend to build next. Each entry states its status and the evidence behind it.',
    bg: 'По-малки инструменти, начини на работа и системите, които смятам да изградя занапред. Всеки запис посочва статуса си и на какво се основава.',
  },
  // Built first and strongest, then what is not built yet. The eyebrow states
  // the boundary.
  groups: {
    tooling: {
      label: { en: 'Built', bg: 'Изградено' },
      title: { en: 'Tools and methods', bg: 'Инструменти и методи' },
      lede: {
        en: 'Things I built to make the main systems work: infrastructure control, how I work with AI agents, and this site.',
        bg: 'Неща, които изградих, за да работят основните системи: управление на инфраструктура, работата ми с AI агенти и този сайт.',
      },
    },
    next: {
      label: { en: 'Not built yet', bg: 'Още не е изградено' },
      title: { en: 'Next', bg: 'Предстои' },
      lede: {
        en: 'Planned work, deliberately outside my current stack. Nothing here is built yet, and nothing here is presented as if it were.',
        bg: 'Планирана работа, съзнателно извън сегашния ми стек. Нищо от това още не е изградено и нищо не е представено като готово.',
      },
    },
  },
  /** Visually hidden heading of the paused line. */
  paused: { en: 'Paused', bg: 'На пауза' },
  card: {
    plannedScope: { en: 'Planned scope', bg: 'Планиран обхват' },
    conceptNotes: { en: 'Concept notes', bg: 'Бележки по концепцията' },
    plannedStack: { en: 'Planned stack', bg: 'Планиран стек' },
    stack: { en: 'Stack', bg: 'Стек' },
    evidence: { en: 'Evidence', bg: 'Доказателства' },
    caseStudy: { en: 'Case study', bg: 'Проект' },
    /** The two columns of the tiny T-account drawing (48 units each). */
    debit: { en: 'DEBIT', bg: 'ДЕБИТ' },
    credit: { en: 'CREDIT', bg: 'КРЕДИТ' },
  },
} as const satisfies Record<string, L | Record<string, L | Record<string, L>>>;
