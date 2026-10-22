/**
 * Professional history and education. Source: CV dated 2026-08-31.
 * Client names of employers are kept general on purpose. Text is written once
 * per locale (L); role periods come from `start`/`end` ('YYYY-MM') through
 * period() in src/i18n/format.ts.
 */
import type { L } from '@/i18n';

export interface Role {
  org: L;
  title: L;
  start: string;
  /** Omitted while the role is current ('… to present'). */
  end?: string;
  place: L;
  kind: 'employment' | 'independent';
  points: L[];
}

const varna: L = { en: 'Varna, Bulgaria', bg: 'Варна, България' };

export const roles: Role[] = [
  {
    org: { en: 'DXC Technology', bg: 'DXC Technology' },
    title: { en: 'Junior Backend Developer', bg: 'Младши бекенд разработчик' },
    start: '2025-09',
    place: varna,
    kind: 'employment',
    points: [
      {
        en: 'Develop and maintain backend functionality and web services on a large enterprise insurance platform for a major insurance group.',
        bg: 'Разработвам и поддържам бекенд функционалност и уеб услуги в голяма корпоративна застрахователна платформа на водеща застрахователна група.',
      },
      {
        en: 'Trace defects through a substantial legacy codebase, find root causes and ship fixes through enterprise QA and release processes.',
        bg: 'Проследявам дефекти в обширна наследена кодова база, откривам първопричините и пускам корекциите през корпоративните процеси за QA и издаване на версии.',
      },
      {
        en: 'Picked up a proprietary, Prolog-like declarative rules language with little documentation, and work daily in English with distributed international teams.',
        bg: 'Усвоих вътрешен декларативен език за правила, подобен на Prolog и с оскъдна документация, и всеки ден работя на английски с разпределени международни екипи.',
      },
    ],
  },
  {
    org: { en: 'Zone 32-19 and client work', bg: 'Zone 32-19 и клиентски проекти' },
    title: { en: 'Independent engineer', bg: 'Инженер на свободна практика' },
    start: '2025-02',
    place: varna,
    kind: 'independent',
    points: [
      {
        en: 'Build and run Zone 32-19, my own community and commerce platform, and deliver USS X Academy, a production education platform for a training centre.',
        bg: 'Изграждам и поддържам Zone 32-19, собствена платформа за общност и онлайн търговия, и разработвам USS X Academy, образователна платформа в продукция за учебен център.',
      },
      {
        en: 'Develop J.A.R.V.I.S., KObait and Malrynth as long-running personal systems across AI, embedded hardware and operating systems.',
        bg: 'Развивам J.A.R.V.I.S., KObait и Malrynth – дългосрочни лични системи в областта на изкуствения интелект, вградения хардуер и операционните системи.',
      },
    ],
  },
  {
    org: { en: 'Genpact', bg: 'Genpact' },
    title: { en: 'Content Moderator', bg: 'Модератор на съдържание' },
    start: '2024-10',
    end: '2025-09',
    place: { en: 'Bucharest, Romania', bg: 'Букурещ, Румъния' },
    kind: 'employment',
    points: [
      {
        en: 'Reviewed user-generated content against community policy under QA targets, and contributed process improvements adopted for the assigned market.',
        bg: 'Преглеждах потребителско съдържание спрямо правилата на общността при зададени цели за качество и допринесох за подобрения в процеса, приети за пазара, който обслужвах.',
      },
    ],
  },
];

export interface Education {
  title: L;
  org: L;
  /** Years only, so written out: '2019 to 2023' / '2019–2023'. */
  period: L;
}

export const education: Education[] = [
  {
    title: { en: 'BSc Computer Science', bg: 'Бакалавър по компютърни науки' },
    org: {
      en: 'University of Ruse "Angel Kanchev"',
      bg: 'Русенски университет „Ангел Кънчев“',
    },
    period: { en: '2019 to 2023', bg: '2019–2023' },
  },
  {
    title: {
      en: 'Diploma, Mathematics and Informatics',
      bg: 'Средно образование, математика и информатика',
    },
    org: {
      en: '"St. Kliment Ohridski" High School, Silistra',
      bg: 'ПМГ „Св. Климент Охридски“, Силистра',
    },
    period: { en: '2012 to 2019', bg: '2012–2019' },
  },
];

/** Certificate titles are never translated. */
export const certificates: { title: string; org: L }[] = [
  {
    title: 'Generative AI Essentials',
    org: { en: 'AWS Partner training', bg: 'Обучение за партньори на AWS' },
  },
  {
    title: 'Agentic AI Essentials',
    org: { en: 'AWS Partner training', bg: 'Обучение за партньори на AWS' },
  },
];
