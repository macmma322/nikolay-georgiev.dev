import type { L } from '@/i18n';

/**
 * Page titles, meta descriptions, breadcrumb names and Open Graph alt texts,
 * read by SEO.astro for every route. A page title renders as
 * "<title> · <name>" and the home page as "<name> · <home.title>". Titles stay
 * within about 60 characters with the suffix, descriptions within 120–160,
 * and every line states only facts that are on the site.
 */
export const seo = {
  /** The person in running text; og:site_name stays 'Nikolay Georgiev' in both. */
  name: { en: 'Nikolay Georgiev', bg: 'Николай Георгиев' },
  home: {
    /** After the name: the role and main stack recruiters search for. */
    title: {
      en: 'Software Engineer, React and Node.js',
      bg: 'Софтуерен инженер, React и Node.js',
    },
    description: {
      en: 'Software engineer in Varna, Bulgaria: React, Next.js, TypeScript, Node.js and PostgreSQL in production platforms, plus local AI, embedded and systems work.',
      bg: 'Софтуерен инженер от Варна: React, Next.js, TypeScript, Node.js и PostgreSQL в работещи платформи, както и локален AI, вградени системи и системен софтуер.',
    },
  },
  work: {
    title: {
      en: 'Work: case studies from web to bare metal',
      bg: 'Проекти: от браузъра до хардуера',
    },
    description: {
      en: 'Case studies with their real status: a voxel sandbox game, education and community platforms, a local-first AI assistant, a radio-controlled boat and a Rust OS.',
      bg: 'Проекти, всеки с реалния си статус: воксел игра, платформи за обучение и общност, локален AI асистент, радиоуправляема лодка и операционна система на Rust.',
    },
  },
  lab: {
    title: {
      en: 'Lab: tools, AI agents and what comes next',
      bg: 'Лаборатория: инструменти и AI агенти',
    },
    description: {
      en: 'Tools Nikolay Georgiev built around his main systems, how he works with AI coding agents, and what comes next, such as a Java and Spring Boot ledger.',
      bg: 'Инструментите около основните системи на Николай Георгиев, работата му с AI агенти и какво предстои – например счетоводна платформа на Java и Spring Boot.',
    },
  },
  about: {
    title: {
      en: 'About: software engineer based in Varna',
      bg: 'За мен: софтуерен инженер от Варна',
    },
    description: {
      en: 'Nikolay Georgiev, software engineer in Varna and junior backend developer at DXC, builds full-stack platforms in React, Next.js, Node.js and PostgreSQL.',
      bg: 'Николай Георгиев, софтуерен инженер от Варна и младши бекенд разработчик в DXC, изгражда full-stack платформи с React, Next.js, Node.js и PostgreSQL.',
    },
  },
  contact: {
    title: {
      en: 'Contact: email, phone, GitHub, LinkedIn',
      bg: 'Контакт: имейл, телефон, GitHub, LinkedIn',
    },
    description: {
      en: 'Contact Nikolay Georgiev, software engineer in Varna, Bulgaria, about remote or Varna-based roles: email, phone, GitHub, LinkedIn and a PDF CV.',
      bg: 'Свържете се с Николай Георгиев, софтуерен инженер от Варна, за работа дистанционно или на място: имейл, телефон, GitHub, LinkedIn и CV.',
    },
  },
  cv: {
    title: {
      en: 'CV: a PDF in English or Bulgarian',
      bg: 'CV: PDF на български или английски',
    },
    description: {
      en: 'The CV of Nikolay Georgiev, software engineer in Varna: experience, selected projects and skills, written as a PDF in your browser, free and without an account.',
      bg: 'CV на Николай Георгиев, софтуерен инженер от Варна: опит, избрани проекти и умения, записани като PDF в браузъра ви, безплатно и без акаунт.',
    },
  },
  setup: {
    title: {
      en: 'Setup: hardware, tools and decisions',
      bg: 'Техника: хардуер, инструменти и решения',
    },
    description: {
      en: 'The workstation, audio chain and hardware behind Nikolay Georgiev’s projects, the decisions its limits forced, and an honest roadmap. Not sponsored.',
      bg: 'Компютрите, аудиотехниката и хардуерът зад проектите на Николай Георгиев, решенията, наложени от ограниченията им, и честен план за развитие. Без спонсори.',
    },
  },
  openSource: {
    title: {
      en: 'Open source: CLAUDE.md and credits',
      bg: 'Отворен код: CLAUDE.md и благодарности',
    },
    description: {
      en: 'A reusable CLAUDE.md engineering blueprint under the MIT License, public repositories by Nikolay Georgiev, and credits for the open source his projects build on.',
      bg: 'Преизползваем CLAUDE.md под лиценз MIT, публичните хранилища на Николай Георгиев и благодарности към отворения код, върху който стъпват проектите му.',
    },
  },
  blueprint: {
    title: {
      en: 'CLAUDE.md blueprint for AI coding agents',
      bg: 'CLAUDE.md: инженерни правила за AI агенти',
    },
    description: {
      en: 'The full text of Nikolay Georgiev’s portable CLAUDE.md: principles, evidence, workflow, Git, testing and security rules for AI coding agents. MIT License.',
      bg: 'Пълният текст на преносимия CLAUDE.md на Николай Георгиев: принципи, доказателства, Git, тестване и сигурност за AI агенти. Лиценз MIT.',
    },
  },
  notFound: {
    title: { en: 'Page not found', bg: 'Няма такава страница' },
    description: {
      en: 'This address does not exist on nikolay-georgiev.dev. The case studies, the lab and the contact details are one click away.',
      bg: 'Този адрес не съществува на nikolay-georgiev.dev. Проектите, лабораторията и контактите са само на един клик.',
    },
  },
  breadcrumb: {
    home: { en: 'Home', bg: 'Начало' },
    work: { en: 'Work', bg: 'Проекти' },
    lab: { en: 'Lab', bg: 'Лаборатория' },
    setup: { en: 'Setup', bg: 'Техника' },
    about: { en: 'About', bg: 'За мен' },
    contact: { en: 'Contact', bg: 'Контакт' },
    cv: { en: 'CV', bg: 'CV' },
    openSource: { en: 'Open source', bg: 'Отворен код' },
    blueprint: { en: 'CLAUDE.md blueprint', bg: 'CLAUDE.md' },
  },
  imageAlt: {
    /** The home card, also used by About, Lab, Contact and the 404s. */
    site: {
      en: 'Nikolay Georgiev, software engineer in Varna, Bulgaria',
      bg: 'Николай Георгиев, софтуерен инженер във Варна, България',
    },
    /** The Work index card: its title and the six case-study plates. */
    work: {
      en: 'Work by Nikolay Georgiev: technical drawings of the case studies',
      bg: 'Проекти на Николай Георгиев: технически чертежи на проектите',
    },
    /** A case study's card: its name and kicker, as printed on the card. */
    project: {
      en: (name: string, kicker?: string) =>
        `${kicker ? `${kicker}: ` : ''}${name}, a case study by Nikolay Georgiev`,
      bg: (name: string, kicker?: string) =>
        `${kicker ? `${kicker}: ` : ''}${name}, проект на Николай Георгиев`,
    },
  },
  /** Person.knowsAbout in JSON-LD: areas the case studies back up. */
  knowsAbout: {
    en: [
      'Frontend development',
      'Full-stack web development',
      'Backend development',
      'React',
      'Next.js',
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'REST APIs',
      'Realtime web applications',
      'Local-first AI systems',
      'Embedded systems',
      'Rust',
    ],
    bg: [
      'Фронтенд разработка',
      'Full-stack уеб разработка',
      'Бекенд разработка',
      'React',
      'Next.js',
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'REST API',
      'Уеб приложения в реално време',
      'Локални AI системи',
      'Вградени системи',
      'Rust',
    ],
  },
  /** Person.alumniOf in JSON-LD. */
  university: {
    en: 'University of Ruse "Angel Kanchev"',
    bg: 'Русенски университет „Ангел Кънчев“',
  },
  city: { en: 'Varna', bg: 'Варна' },
} as const satisfies Record<
  string,
  L | L<readonly string[]> | Record<string, L | L<(name: string, kicker?: string) => string>>
>;
