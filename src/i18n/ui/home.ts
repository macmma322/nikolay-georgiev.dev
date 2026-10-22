import type { L } from '@/i18n';

type Dict = { readonly [key: string]: L | Dict | readonly Dict[] };

/** Homepage strings, plus the chrome of the home components reused on About. */
export const home = {
  hero: {
    cta: { en: 'View selected work', bg: 'Вижте проектите' },
    /** The CV is English only, so the Bulgarian button says so. */
    cv: { en: 'Download CV', bg: 'Изтеглете CV · англ.' },
    fig: { en: 'Fig. 01 · Layers', bg: 'Фиг. 01 · Слоеве' },
    stack: { en: 'The layers I build across', bg: 'Слоевете, в които работя' },
  },
  /** The "now" strip at the foot of the hero; availability closes it. */
  now: [
    {
      label: { en: 'Day job', bg: 'Основна работа' },
      value: {
        en: 'Junior Backend Developer at DXC Technology, enterprise insurance systems',
        bg: 'Младши бекенд разработчик в DXC Technology, застрахователни системи',
      },
    },
    {
      label: { en: 'Building', bg: 'Изграждам' },
      value: {
        en: 'Zone 32-19, USS X Academy and J.A.R.V.I.S.',
        bg: 'Zone 32-19, USS X Academy и J.A.R.V.I.S.',
      },
    },
    {
      label: { en: 'Next', bg: 'Предстои' },
      value: {
        en: 'Malrynth paging; a ledger platform in Java, Spring Boot and Angular',
        bg: 'Страниране в Malrynth; счетоводна платформа с Java, Spring Boot и Angular',
      },
    },
    {
      label: { en: 'Open to', bg: 'Отворен за' },
      value: {
        en: 'Remote and Varna-based engineering roles',
        bg: 'Инженерни позиции\u00a0– дистанционно или във Варна',
      },
    },
  ],
  work: {
    label: { en: 'Selected work', bg: 'Избрани проекти' },
    title: {
      en: 'Systems, from the browser down to bare metal',
      bg: 'Системи от браузъра до самото желязо',
    },
    link: { en: 'All work', bg: 'Всички проекти' },
    also: { en: 'Also built', bg: 'Още проекти' },
  },
  caps: {
    label: { en: 'Capabilities', bg: 'Технологии' },
    title: { en: 'The stack, with receipts', bg: 'Стек, доказан в\u00a0проекти' },
    lede: {
      en: 'Each technology is tied to the projects that use it: point at either to see the link. Java, Spring Boot and Angular are listed as what they are, my next deliberate step.',
      bg: 'Всяка технология е свързана с проектите, в които я използвам: посочете технология или проект, за да видите връзката. Java, Spring Boot и Angular са отбелязани честно – като следващата ми стъпка.',
    },
  },
  exp: {
    label: { en: 'Experience', bg: 'Опит' },
    title: {
      en: 'Enterprise by day, systems by night',
      bg: 'Денем корпоративен софтуер, нощем собствени системи',
    },
    link: { en: 'About and full history', bg: 'Повече за мен и опита ми' },
  },
  lab: {
    label: { en: 'Lab', bg: 'Лаборатория' },
    title: {
      en: 'Small tools, and what comes next',
      bg: 'Малки инструменти и\u00a0това, което предстои',
    },
    lede: {
      en: 'One tool I built for Zone 32-19, and the systems I have not built yet, labelled honestly.',
      bg: 'Един инструмент, който направих за Zone 32-19, и системите, които още не съм изградил – честно отбелязани.',
    },
    link: { en: 'Open the lab', bg: 'Към лабораторията' },
  },
  /** ProjectChapter's call to action; a visually hidden ": {name}" follows it. */
  chapter: {
    read: { en: 'Read the case study', bg: 'Към проекта' },
  },
  /** ExperienceBrief (home and About). */
  experience: {
    employment: { en: 'Employment', bg: 'Наемна работа' },
    independent: { en: 'Independent', bg: 'Самостоятелно' },
    education: { en: 'Education', bg: 'Образование' },
  },
  /** Capabilities (home and About). */
  capabilities: {
    provenIn: { en: 'Proven in', bg: 'Доказано в' },
    notYet: { en: 'Not yet proven in a project', bg: 'Още не е доказано в проект' },
    full: { en: 'Full evidence on the About page', bg: 'Всички доказателства в „За\u00a0мен“' },
  },
} as const satisfies Dict;
