import type { L } from '@/i18n';

/** The street that closes every page (components/layout/Street.astro). */
export const street = {
  label: { en: 'Street level', bg: 'На улицата' },
  /** Rendered as `{lead} <em>{em}</em>`. */
  title: {
    lead: { en: 'The page ends.', bg: 'Страницата свършва.' },
    em: { en: 'The building doesn’t.', bg: 'Строежът продължава.' },
  },
  support: {
    en: 'Software, systems and worlds. Always something in progress.',
    bg: 'Софтуер, системи и светове. Винаги има нещо в строеж.',
  },
  navLabel: { en: 'Footer', bg: 'Долна навигация' },
  toTop: { en: 'Back to top', bg: 'Към началото' },
  /** The standing figure is a button: this is its name. */
  me: {
    en: 'Nikolay, standing in the street. Say hello.',
    bg: 'Николай стои на улицата. Поздравете го.',
  },
  castLabel: { en: 'In the crowd', bg: 'В тълпата' },
  /** One passer-by per project; the name follows as a link. */
  cast: {
    caelora: { en: 'The traveller', bg: 'Пътешественикът' },
    'uss-x-academy': { en: 'The trainee', bg: 'Курсистът' },
    jarvis: { en: 'The companion', bg: 'Спътникът' },
    'zone-32-19': { en: 'The courier', bg: 'Куриерът' },
    kobait: { en: 'The angler', bg: 'Рибарят' },
    malrynth: { en: 'The kernel author', bg: 'Авторът на ядрото' },
    stemini: { en: 'The maker', bg: 'Майсторът' },
  },
  /** Stencilled on the site hoarding behind him. */
  sign: { en: 'Work in progress', bg: 'В строеж' },
  /** Mono label before the count of people who have walked off the page. */
  passed: { en: 'Passed by', bg: 'Отминали' },
  /** Clarifies that the counter tallies simulated scene pedestrians. */
  passedNote: {
    en: 'Simulated passers-by in this scene',
    bg: 'Симулирани минувачи в тази сцена',
  },
  /** What the scene shows, for anyone who cannot see it. */
  description: {
    en: 'An illustrated street in the evening, in front of buildings that are still going up. People walk past in both directions: commuters, students, tourists, a runner, someone with a dog. Nikolay stands still among them: bearded, in amber glasses, a black hoodie and cargo trousers, hands in his pockets. Some pass in front of him, some behind. A few carry something from one of his projects.',
    bg: 'Илюстрирана вечерна улица пред сгради, които още се строят. Хора минават в двете посоки: служители, ученици, туристи, бегач, човек с куче. Николай стои неподвижно сред тях: с брада, с кехлибарени очила, черен суитшърт и карго панталон, с ръце в джобовете. Едни минават пред него, други зад него. Неколцина носят по нещо от негов проект.',
  },
} as const satisfies Record<string, L | Record<string, L>>;
