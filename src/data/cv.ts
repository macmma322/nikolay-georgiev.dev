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

  /** Skill groups by competency: tech.ts ids, shown in this order. */
  skills: [
    {
      label: { en: 'Frontend', bg: 'Фронтенд' },
      ids: ['typescript', 'react', 'nextjs', 'tailwind', 'css', 'astro'],
    },
    {
      label: { en: 'Backend and data', bg: 'Бекенд и данни' },
      ids: ['nodejs', 'express', 'postgresql', 'redis', 'bullmq', 'openapi', 'zod'],
    },
    {
      label: { en: 'Realtime', bg: 'Комуникация в реално време' },
      ids: ['socketio', 'webrtc', 'livekit', 'sse'],
    },
    {
      label: { en: 'AI systems', bg: 'AI системи' },
      ids: ['llamacpp', 'mcp', 'claude', 'python'],
    },
    {
      label: { en: 'Systems and embedded', bg: 'Системен и вграден софтуер' },
      ids: ['cpp', 'arduino', 'rust', 'tauri', 'unity', 'csharp'],
    },
    {
      label: { en: 'Delivery and tooling', bg: 'Внедряване и инструменти' },
      ids: ['git', 'githubactions', 'docker', 'railway', 'linux', 'stripe'],
    },
  ] satisfies { label: L; ids: string[] }[],

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
          en: 'Designed contract-first: an OpenAPI 3.1 specification with 216 operations generates the typed client, and contract tests hold the API to it.',
          bg: 'Изградена по подхода contract-first: спецификация OpenAPI 3.1 с 216 операции генерира типизирания клиент, а тестове на договора проверяват API-то спрямо нея.',
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
