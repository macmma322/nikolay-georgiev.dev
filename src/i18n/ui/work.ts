import type { L } from '@/i18n';

/**
 * The work index and the case-study template. Section names serve both the
 * contents lists and the section headings, so the two can never drift apart.
 */
export const work = {
  index: {
    /** plural() forms; {n} is the number of case studies. */
    count: {
      en: { one: 'Index · {n} case study', other: 'Index · {n} case studies' },
      bg: { one: 'Индекс · {n} проект', other: 'Индекс · {n} проекта' },
    },
    title: { en: 'Work', bg: 'Проекти' },
    lede: {
      en: 'Every project here is described from its current source code, with its real status. Some are in production, some are prototypes on a bench, and one is an operating system at its first milestones. The difference is stated on every page.',
      bg: 'Описвам всеки проект по текущия му изходен код и с реалния му статус. Някои вече се използват от реални потребители, други са прототипи на работната маса, а един е операционна система в първите си етапи. Всяка страница казва ясно кое е кое.',
    },
    list: { en: 'Case studies', bg: 'Списък на проектите' },
    outro: {
      before: {
        en: 'Smaller tools and future systems, including a planned Java and Spring ledger platform, live in the ',
        bg: 'По-малките инструменти и бъдещите системи, сред които и планирана счетоводна платформа на Java и Spring, са в ',
      },
      link: { en: 'lab', bg: 'лабораторията' },
      after: { en: '.', bg: '.' },
    },
  },
  case: {
    breadcrumb: { en: 'Breadcrumb', bg: 'Навигационна пътека' },
    work: { en: 'Work', bg: 'Проекти' },
    /** '03' → 'Case study 03'. */
    number: { en: (n: string) => `Case study ${n}`, bg: (n: string) => `Проект ${n}` },
    role: { en: 'Role', bg: 'Роля' },
    timeline: { en: 'Timeline', bg: 'Период' },
    context: { en: 'Context', bg: 'Контекст' },
    layers: { en: 'Layers', bg: 'Слоеве' },
    links: { en: 'Links', bg: 'Връзки' },
    liveSite: { en: 'Live site', bg: 'Онлайн версия' },
    contents: { en: 'On this page', bg: 'Съдържание' },
    spec: { en: 'Specification', bg: 'Спецификация' },
    /** Figure numbers: ('03', 1) → 'Fig. 03.1'. */
    figure: {
      en: (n: string, i: number) => `Fig. ${n}.${i}`,
      bg: (n: string, i: number) => `Фиг. ${n}.${i}`,
    },
    problem: { en: 'Problem', bg: 'Проблем' },
    solution: { en: 'What I did', bg: 'Какво направих' },
    today: { en: 'Today', bg: 'Днес' },
    next: { en: 'Next', bg: 'Предстои' },
    notes: { en: 'Notes', bg: 'Бележки' },
    nextCase: { en: 'Next case study', bg: 'Следващ проект' },
  },
  /** Section names, keyed by section id (ids stay English in every locale). */
  sections: {
    overview: { en: 'Overview', bg: 'Общ преглед' },
    architecture: { en: 'Architecture', bg: 'Архитектура' },
    media: { en: 'Media', bg: 'Изображения' },
    hard: { en: 'Hard problems', bg: 'Трудни проблеми' },
    decisions: { en: 'Decisions', bg: 'Решения' },
    built: { en: 'What I built', bg: 'Какво изградих' },
    status: { en: 'Status', bg: 'Статус' },
    learned: { en: 'What I learned', bg: 'Какво научих' },
    stack: { en: 'Stack', bg: 'Технологичен стек' },
  },
} as const satisfies Record<string, Record<string, L<unknown> | Record<string, L>>>;
