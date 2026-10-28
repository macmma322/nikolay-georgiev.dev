import type { L } from '@/i18n';

/**
 * What only the CV says. Everything else on the CV comes from the site's own
 * sources, so the two cannot drift apart: identity, contact and languages from
 * site.ts; roles, education and certificates from experience.ts; skill names
 * and levels from tech.ts; each project's kicker, role, status, dates, stack
 * and highlights from its case study. src/lib/cv/doc.ts joins them and fails
 * the build when this file states a number the case study does not, names a
 * technology the project does not use, or lists a planned skill.
 */

export interface CvProject {
  /** Case-study slug (src/content/projects). */
  slug: string;
  /** What it is and what I did, one or two sentences. */
  lead: L;
  /** A case-study highlight by index, or CV wording for an achievement. */
  points: (number | L)[];
  /** Technology ids shown on the CV; each must be in the case study's stack. */
  stack: string[];
}

export const cv = {
  /** Shown under the name; the headline below it comes from site.statement. */
  summary: {
    en: 'Software engineer in Varna with a BSc in Computer Science. At DXC Technology I work on backend services of a large enterprise insurance platform. On my own I design and build systems end to end: an education platform in production for a client, a realtime community and commerce platform, a local-first AI assistant and embedded firmware. I take a feature from the database schema through the API to an accessible interface, and I say plainly what is finished and what is not.',
    bg: 'Софтуерен инженер във Варна с бакалавърска степен по компютърни науки. В DXC Technology работя по бекенд услугите на голяма корпоративна застрахователна платформа. Самостоятелно проектирам и изграждам системи от край до край: внедрена образователна платформа за клиент, платформа в реално време за общност и онлайн търговия, локален AI асистент и фърмуер за вградена електроника. Разработвам всяка функционалност изцяло – от схемата на базата данни през API-то до достъпен интерфейс, и казвам ясно кое е завършено и кое предстои.',
  } satisfies L,

  /** The CV's revision date: the PDFs' creation date, and the preview's. */
  updated: '2026-10-28',

  /** Self-reported, so stated only here (PRODUCT.md, content rule 2). */
  extraPoints: {
    Genpact: [
      {
        en: 'Self-reported: 300 to 400 items reviewed a day at about 90% QA accuracy.',
        bg: 'По мои данни: 300 до 400 прегледани елемента на ден при точност около 90 % според QA.',
      },
    ],
  } as Record<string, L[]>,

  /**
   * Skill groups by competency, in the general order: tech.ts ids and
   * skills.ts practice ids. A target role reorders them (targets below).
   */
  skills: [
    {
      id: 'frontend',
      label: { en: 'Frontend', bg: 'Фронтенд' },
      ids: ['typescript', 'react', 'nextjs', 'javascript', 'tailwind', 'css', 'a11y', 'responsive'],
    },
    {
      id: 'backend',
      label: { en: 'Backend and data', bg: 'Бекенд и данни' },
      ids: ['nodejs', 'express', 'rest', 'postgresql', 'sql', 'redis', 'auth', 'bullmq', 'openapi'],
    },
    {
      id: 'realtime',
      label: { en: 'Realtime', bg: 'Комуникация в реално време' },
      ids: ['socketio', 'webrtc', 'livekit', 'sse'],
    },
    {
      id: 'ai',
      label: { en: 'AI applications', bg: 'AI приложения' },
      ids: ['llm', 'llamacpp', 'mcp', 'whisper', 'python'],
    },
    {
      id: 'systems',
      label: { en: 'Systems and embedded', bg: 'Системен и вграден софтуер' },
      ids: ['cpp', 'arduino', 'rust', 'tauri', 'unity', 'csharp'],
    },
    {
      id: 'delivery',
      label: { en: 'Delivery and tooling', bg: 'Внедряване и инструменти' },
      ids: ['git', 'githubactions', 'testing', 'docker', 'railway', 'linux', 'stripe'],
    },
  ] satisfies { id: string; label: L; ids: string[] }[],

  /**
   * Roles the CV can be aimed at. Same facts, same design: a target changes
   * only the focus line, the summary and the order of skills and projects.
   * The job title stays the one I hold (site.role).
   */
  targets: [
    {
      id: 'general',
      label: { en: 'Software Engineer (general)', bg: 'Софтуерен инженер (общо)' },
      file: '',
      groups: ['frontend', 'backend', 'realtime', 'ai', 'systems', 'delivery'],
      projects: ['uss-x-academy', 'zone-32-19', 'jarvis', 'caelora', 'kobait'],
    },
    {
      id: 'frontend',
      label: { en: 'Frontend / React Developer', bg: 'Фронтенд / React разработчик' },
      file: 'Frontend',
      focus: {
        en: 'Frontend: React, Next.js, TypeScript and accessible interfaces',
        bg: 'Фронтенд: React, Next.js, TypeScript и достъпни интерфейси',
      },
      summary: {
        en: 'Software engineer in Varna focused on frontend work with React, Next.js and TypeScript. I built the Next.js frontends of USS X Academy, an education platform in production for a client, including a keyboard-operable map of 28 regions, and the Next.js client of Zone 32-19 behind a same-origin proxy. On my own projects I also build the APIs and data my interfaces depend on; by day I am a junior backend developer at DXC Technology.',
        bg: 'Софтуерен инженер във Варна с фокус върху фронтенда с React, Next.js и TypeScript. Изградих фронтендите на Next.js за USS X Academy – образователна платформа за клиент, която е в експлоатация, включително карта на 28-те области, управлявана с клавиатура – както и клиента на Next.js за Zone 32-19 зад same-origin прокси. В собствените си проекти изграждам и API интерфейсите и данните, от които зависят; основната ми работа е като младши бекенд разработчик в DXC Technology.',
      },
      groups: ['frontend', 'backend', 'realtime', 'delivery', 'ai', 'systems'],
      projects: ['uss-x-academy', 'zone-32-19', 'jarvis', 'caelora', 'kobait'],
    },
    {
      id: 'fullstack',
      label: { en: 'Full-Stack Developer', bg: 'Full-stack разработчик' },
      file: 'Full-Stack',
      focus: {
        en: 'Full-stack: React, Next.js, Node.js, PostgreSQL and Redis',
        bg: 'Full-stack: React, Next.js, Node.js, PostgreSQL и Redis',
      },
      summary: {
        en: 'Software engineer in Varna who builds web platforms end to end: React and Next.js clients, Node.js and Express APIs, PostgreSQL schemas with versioned migrations, Redis, authentication and deployment. USS X Academy, which I built alone for a client, is in production; Zone 32-19, my own platform, runs in a development environment. By day I am a junior backend developer at DXC Technology.',
        bg: 'Софтуерен инженер във Варна, който изгражда уеб платформи от край до край: клиенти на React и Next.js, API на Node.js и Express, схеми в PostgreSQL с версионирани миграции, Redis, автентикация и внедряване. USS X Academy, която изградих сам за клиент, е в експлоатация; Zone 32-19, моята собствена платформа, работи в среда за разработка. Основната ми работа е като младши бекенд разработчик в DXC Technology.',
      },
      groups: ['frontend', 'backend', 'realtime', 'delivery', 'ai', 'systems'],
      projects: ['uss-x-academy', 'zone-32-19', 'jarvis', 'caelora', 'kobait'],
    },
    {
      id: 'backend',
      label: { en: 'Backend / Node.js Developer', bg: 'Бекенд / Node.js разработчик' },
      file: 'Backend',
      focus: {
        en: 'Backend: Node.js, TypeScript, REST APIs, PostgreSQL and Redis',
        bg: 'Бекенд: Node.js, TypeScript, REST API, PostgreSQL и Redis',
      },
      summary: {
        en: 'Backend-focused software engineer in Varna. At DXC Technology I develop and maintain backend services of a large enterprise insurance platform and trace defects to their root cause. On my own I design Node.js and Express APIs (for USS X Academy from an OpenAPI 3.1 contract), PostgreSQL schemas in raw SQL with versioned migrations, Redis for sockets and rate limits, revocable sessions with two-factor sign-in, and Stripe webhooks that take effect exactly once.',
        bg: 'Софтуерен инженер във Варна с фокус върху бекенда. В DXC Technology разработвам и поддържам бекенд услугите на голяма корпоративна застрахователна платформа и проследявам дефектите до първопричината им. Самостоятелно проектирам API на Node.js и Express (за USS X Academy по договор OpenAPI 3.1), схеми в PostgreSQL с чист SQL и версионирани миграции, Redis за сокети и ограничения на заявките, сесии, които могат да бъдат анулирани, с двуфакторно удостоверяване, и уебхукове на Stripe, обработвани точно веднъж.',
      },
      groups: ['backend', 'realtime', 'delivery', 'frontend', 'ai', 'systems'],
      projects: ['zone-32-19', 'uss-x-academy', 'jarvis', 'kobait', 'caelora'],
    },
    {
      id: 'software',
      label: {
        en: 'Software Engineer / Software Engineer I',
        bg: 'Софтуерен инженер / Software Engineer I',
      },
      file: 'Software-Engineer',
      focus: {
        en: 'TypeScript, React, Node.js, PostgreSQL, testing and CI',
        bg: 'TypeScript, React, Node.js, PostgreSQL, тестове и CI',
      },
      summary: {
        en: 'Software engineer in Varna with a BSc in Computer Science and professional experience at DXC Technology, where I maintain backend services and ship fixes through enterprise QA and release processes. I build software across the stack in TypeScript, React and Node.js, test it with Vitest and Playwright, ship it through GitHub Actions, and write down what is finished and what is not.',
        bg: 'Софтуерен инженер във Варна с бакалавърска степен по компютърни науки и професионален опит в DXC Technology, където поддържам бекенд услуги и пускам корекции през корпоративните процеси за QA и издаване на версии. Разработвам софтуер в целия стек с TypeScript, React и Node.js, тествам го с Vitest и Playwright, пускам го през GitHub Actions и описвам ясно кое е завършено и кое не е.',
      },
      groups: ['backend', 'frontend', 'delivery', 'realtime', 'systems', 'ai'],
      projects: ['uss-x-academy', 'zone-32-19', 'jarvis', 'caelora', 'kobait'],
    },
    {
      id: 'ai',
      label: { en: 'AI Application Developer', bg: 'Разработчик на AI приложения' },
      file: 'AI-Applications',
      focus: {
        en: 'AI applications: local LLMs on llama.cpp, TypeScript, Rust and Python',
        bg: 'AI приложения: локални LLM на llama.cpp, TypeScript, Rust и Python',
      },
      summary: {
        en: 'Software engineer in Varna who builds AI applications as ordinary engineering systems. J.A.R.V.I.S., my private desktop assistant, routes between a local Qwen model on llama.cpp and frontier CLIs, keeps 100 compiled operations behind fixed authority tiers, and refuses answers that claim actions the runtime never took. Much of its code is written by AI agents under my architecture and review. I am not a machine-learning researcher; my day job is backend development at DXC Technology.',
        bg: 'Софтуерен инженер във Варна, който изгражда AI приложения като обикновени инженерни системи. J.A.R.V.I.S., моят личен настолен асистент, насочва заявките между локален модел Qwen на llama.cpp и CLI инструментите на водещи модели, пази 100 компилирани операции зад фиксирани нива на правомощия и отхвърля отговори, които твърдят, че системата е извършила действие, което не е извършила. Голяма част от кода е написана от AI агенти по моя архитектура и преглед. Не съм изследовател в областта на машинното обучение; основната ми работа е бекенд разработка в DXC Technology.',
      },
      groups: ['ai', 'backend', 'frontend', 'systems', 'delivery', 'realtime'],
      projects: ['jarvis', 'uss-x-academy', 'zone-32-19', 'caelora', 'kobait'],
    },
  ] as {
    id: string;
    label: L;
    /** Added to the file name; empty for the general CV. */
    file: string;
    focus?: L;
    summary?: L;
    groups: string[];
    projects: string[];
  }[],

  /** Selected projects, in this order. */
  projects: [
    {
      slug: 'uss-x-academy',
      lead: {
        en: 'A platform for a Bulgarian vocational training centre, in production at ussxacademy.bg: course intakes, applications, live classrooms on LiveKit and a regional technician directory. I am its only engineer.',
        bg: 'Платформа за български център за професионално обучение, в експлоатация на ussxacademy.bg: прием за курсове, кандидатстване, класни стаи на живо с LiveKit и указател на техници по области. Аз съм единственият инженер.',
      },
      points: [
        {
          en: 'Designed contract-first: an OpenAPI 3.1 specification with 216 operations generates the typed client.',
          bg: 'Изградена по подхода contract-first: спецификация OpenAPI 3.1 с 216 операции генерира типизирания клиент.',
        },
        0,
        3,
      ],
      stack: ['nextjs', 'typescript', 'express', 'postgresql', 'redis', 'livekit', 'openapi'],
    },
    {
      slug: 'zone-32-19',
      lead: {
        en: 'My own platform, built alone: a Next.js client, an Express modular monolith with 39 domain modules and PostgreSQL with 123 versioned migrations. It runs in a development environment; the public launch is pending.',
        bg: 'Собствена платформа, която изграждам сам: клиент на Next.js, модулен монолит на Express с 39 домейн модула и PostgreSQL със 123 версионирани миграции. Работи в среда за разработка; публичното пускане предстои.',
      },
      points: [1, 0],
      stack: [
        'nextjs',
        'typescript',
        'nodejs',
        'postgresql',
        'redis',
        'socketio',
        'webrtc',
        'stripe',
      ],
    },
    {
      slug: 'jarvis',
      lead: {
        en: 'Private desktop assistant with a registry of 100 compiled operations at fixed authority tiers, a local Qwen model on llama.cpp and a Rust and Tauri shell. Much of the code is written by AI agents under my architecture and review.',
        bg: 'Личен настолен асистент с регистър от 100 компилирани операции на фиксирани нива на правомощия, локален модел Qwen на llama.cpp и обвивка на Rust и Tauri. Голяма част от кода е написана от AI агенти по моя архитектура и преглед.',
      },
      points: [1, 2],
      stack: ['typescript', 'nodejs', 'rust', 'tauri', 'llamacpp', 'mcp'],
    },
    {
      slug: 'caelora',
      lead: {
        en: 'A playable Windows build, v0.1.0. Unity 6 draws the world; the meshing, streaming, saves and living trees are my own code, much of it written with AI agents.',
        bg: 'Играема версия v0.1.0 за Windows. Unity 6 изобразява света, а генерирането на мешовете, поточното зареждане, записите и живите дървета са мой код, голяма част от който е написана с AI агенти.',
      },
      points: [0, 2],
      stack: ['unity', 'csharp', 'dotnet'],
    },
    {
      slug: 'kobait',
      lead: {
        en: 'A handheld remote and a boat controller joined by a radio protocol of my own; the integration, firmware for both boards and test tooling are mine. Bench-tested, not yet on the water.',
        bg: 'Ръчно дистанционно и контролер за лодката, свързани чрез собствен радиопротокол; интеграцията, фърмуерът и инструментите за тестване са мои. Изпитани само на стенд.',
      },
      points: [0, 1],
      stack: ['cpp', 'arduino', 'python'],
    },
  ] satisfies CvProject[],

  /** Section titles and small labels. */
  labels: {
    summary: { en: 'Profile', bg: 'Профил' },
    experience: { en: 'Experience', bg: 'Професионален опит' },
    /** The application (ATS) version uses the conventional section titles. */
    atsSummary: { en: 'Professional Summary', bg: 'Професионален профил' },
    atsSkills: { en: 'Technical Skills', bg: 'Технически умения' },
    atsExperience: { en: 'Professional Experience', bg: 'Професионален опит' },
    atsProjects: { en: 'Projects', bg: 'Проекти' },
    atsCertificates: { en: 'Certifications', bg: 'Сертификати' },
    /** Independent work is not employment: said where an employer would stand. */
    independent: {
      en: 'Self-employed: own products and client work',
      bg: 'Самостоятелна дейност, собствени и клиентски проекти',
    },
    projects: { en: 'Selected projects', bg: 'Избрани проекти' },
    education: { en: 'Education', bg: 'Образование' },
    contact: { en: 'Contact', bg: 'Контакти' },
    skills: { en: 'Skills', bg: 'Умения' },
    languages: { en: 'Languages', bg: 'Езици' },
    certificates: { en: 'Certificates', bg: 'Сертификати' },
    stack: { en: 'Stack', bg: 'Технологии' },
    present: { en: 'present', bg: 'досега' },
    /** The footer's link to the case studies; the address is added from the data. */
    more: {
      en: 'Case studies with architecture and status:',
      bg: 'Подробно за проектите и техния статус:',
    },
    page: { en: 'Page', bg: 'Страница' },
  },
};
