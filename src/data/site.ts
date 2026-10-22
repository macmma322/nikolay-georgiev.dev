import type { L } from '@/i18n';

/**
 * Identity and contact facts. Sources: CV dated 2026-08-31 and the
 * NIKOLAY.RUNTIME content file. Text shown to visitors is written once per
 * locale (L). The phone number is published on the contact page only: never
 * render it in the header, footer, JSON-LD, meta tags or anywhere else.
 */
export const site = {
  name: 'Nikolay Georgiev',
  role: { en: 'Software Engineer', bg: 'Софтуерен инженер' } satisfies L,
  /**
   * The hero statement as segments, so each locale words it freely. A segment
   * with `lights` lights those layers of the hero's FIG. 01 (layer ids).
   */
  statement: {
    en: [
      { text: 'I build ' },
      { text: 'production platforms', lights: 'web backend realtime' },
      { text: ', ' },
      { text: 'intelligent systems', lights: 'ai' },
      { text: ', ' },
      { text: 'embedded hardware', lights: 'hardware' },
      { text: ' and ' },
      { text: 'low‑level technology', lights: 'system' },
      { text: '.' },
    ],
    bg: [
      { text: 'Изграждам ' },
      { text: 'платформи в\u00a0продукция', lights: 'web backend realtime' },
      { text: ', ' },
      { text: 'интелигентни системи', lights: 'ai' },
      { text: ', ' },
      { text: 'вграден хардуер', lights: 'hardware' },
      { text: ' и ' },
      { text: 'системен софтуер', lights: 'system' },
      { text: '.' },
    ],
  } satisfies L<readonly { text: string; lights?: string }[]>,
  location: { en: 'Varna, Bulgaria', bg: 'Варна, България' } satisfies L,
  timeZone: 'Europe/Sofia',
  availability: {
    en: 'Open to remote and Varna-based engineering roles',
    bg: 'Отворен за инженерни позиции\u00a0– дистанционно или във Варна',
  } satisfies L,
  email: 'nikolay.georgiev00@outlook.com',
  /** Contact page only (see above). */
  phone: { display: '+359 89 367 0247', tel: '+359893670247' },
  url: 'https://nikolay-georgiev.dev',
  cv: { href: '/Nikolay-Georgiev-CV.pdf' },
  links: {
    github: 'https://github.com/macmma322',
    linkedin: 'https://www.linkedin.com/in/nikolaygeorgiev0049/',
  },
  /** Personal profiles (both listed on the GitHub profile); contact page only. */
  elsewhere: [
    { name: 'Instagram', href: 'https://www.instagram.com/nikolay.georgiev00/', icon: 'instagram' },
    { name: 'Discord', href: 'https://discord.com/users/398101326317223938', icon: 'discord' },
  ],
  languages: [
    { name: { en: 'Bulgarian', bg: 'Български' }, level: { en: 'Native', bg: 'Майчин език' } },
    {
      name: { en: 'English', bg: 'Английски' },
      level: { en: 'Fluent, daily working language', bg: 'Свободно, ежедневен работен език' },
    },
    { name: { en: 'German', bg: 'Немски' }, level: { en: 'A2', bg: 'A2' } },
    { name: { en: 'Russian', bg: 'Руски' }, level: { en: 'A1', bg: 'A1' } },
    { name: { en: 'Japanese', bg: 'Японски' }, level: { en: 'A1', bg: 'A1' } },
  ] satisfies { name: L; level: L }[],
} as const;

/** Locale-free hrefs: render them through useI18n's href(). */
export const nav: readonly { href: string; label: L }[] = [
  { href: '/work', label: { en: 'Work', bg: 'Проекти' } },
  { href: '/lab', label: { en: 'Lab', bg: 'Лаборатория' } },
  { href: '/about', label: { en: 'About', bg: 'За мен' } },
  { href: '/contact', label: { en: 'Contact', bg: 'Контакт' } },
];
