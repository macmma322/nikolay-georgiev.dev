import type { L } from '@/i18n';

/**
 * Page titles, meta descriptions, breadcrumb names and Open Graph alt texts,
 * read by SEO.astro for every route. A page title renders as
 * "<title> · <name>" and the home page as "<name> · <role>". Titles stay
 * within about 60 characters with the suffix, descriptions within 120–160,
 * and every line states only facts that are on the site.
 */
export const seo = {
  /** The person in running text; og:site_name stays 'Nikolay Georgiev' in both. */
  name: { en: 'Nikolay Georgiev', bg: 'Николай Георгиев' },
  home: {
    description: {
      en: 'Nikolay Georgiev, software engineer in Varna, Bulgaria: production web platforms, a local-first AI assistant, embedded hardware and an OS in Rust.',
      bg: 'Николай Георгиев, софтуерен инженер от Варна: уеб платформи в продукция, локален AI асистент, вграден хардуер и операционна система на Rust.',
    },
  },
  work: {
    title: {
      en: 'Work: case studies from web to bare metal',
      bg: 'Проекти: от браузъра до хардуера',
    },
    description: {
      en: 'Case studies, each with its real status: community and education platforms, a local-first AI assistant, a radio-controlled boat, an OS in Rust and AI 3D printing.',
      bg: 'Проекти, всеки с реалния си статус: платформи за общност и обучение, локален AI асистент, радиоуправляема лодка, операционна система на Rust и 3D печат с AI.',
    },
  },
  lab: {
    title: {
      en: 'Lab: tools, AI agents and what comes next',
      bg: 'Лаборатория: инструменти и AI агенти',
    },
    description: {
      en: 'Tools Nikolay Georgiev built around his main systems, how he works with AI coding agents, and what comes next, such as a Java and Spring Boot ledger.',
      bg: 'Инструментите около основните системи на Николай Георгиев, работата му с AI агенти и какво предстои – например банкова платформа на Java и Spring Boot.',
    },
  },
  about: {
    title: {
      en: 'About: software engineer based in Varna',
      bg: 'За мен: софтуерен инженер от Варна',
    },
    description: {
      en: 'Nikolay Georgiev is a software engineer in Varna, Bulgaria, and a backend developer at DXC Technology. He also builds platforms, AI systems, hardware and an OS.',
      bg: 'Николай Георгиев е софтуерен инженер от Варна и бекенд разработчик в DXC Technology. Изгражда платформи, AI системи, вграден хардуер и операционна система.',
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
    about: { en: 'About', bg: 'За мен' },
    contact: { en: 'Contact', bg: 'Контакт' },
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
      'Backend development',
      'TypeScript',
      'PostgreSQL',
      'Realtime web applications',
      'Local-first AI systems',
      'Embedded systems',
      'Rust',
    ],
    bg: [
      'Бекенд разработка',
      'TypeScript',
      'PostgreSQL',
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
