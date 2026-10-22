/**
 * The six layers the portfolio is organised around. Each layer links to the
 * project that proves it best; `proof` lists every project that touches it.
 */
import type { L } from '@/i18n';

export type LayerId = 'web' | 'backend' | 'realtime' | 'ai' | 'hardware' | 'system';

export interface Layer {
  id: LayerId;
  name: L;
  short: L;
  accent: 'ussx' | 'zone' | 'jarvis' | 'kobait' | 'malrynth' | 'stemini';
  /** Project names, never translated. */
  proof: string[];
  /** Locale-free: render it through useI18n's href(). */
  href: string;
}

export const layers: Layer[] = [
  {
    id: 'web',
    name: { en: 'Web', bg: 'Уеб' },
    short: { en: 'Interfaces', bg: 'Интерфейси' },
    accent: 'zone',
    proof: ['Zone 32-19', 'USS X Academy'],
    href: '/work/zone-32-19',
  },
  {
    id: 'backend',
    name: { en: 'Backend', bg: 'Бекенд' },
    short: { en: 'APIs and data', bg: 'API и данни' },
    accent: 'ussx',
    proof: ['USS X Academy', 'Zone 32-19', 'Stemini'],
    href: '/work/uss-x-academy',
  },
  {
    id: 'realtime',
    name: { en: 'Realtime', bg: 'Реално време' },
    short: { en: 'Sockets and media', bg: 'Сокети и медия' },
    accent: 'zone',
    proof: ['Zone 32-19', 'USS X Academy'],
    href: '/work/zone-32-19',
  },
  {
    id: 'ai',
    name: { en: 'AI', bg: 'AI' },
    short: { en: 'Local-first intelligence', bg: 'Локален AI' },
    accent: 'jarvis',
    proof: ['J.A.R.V.I.S.', 'Stemini'],
    href: '/work/jarvis',
  },
  {
    id: 'hardware',
    name: { en: 'Hardware', bg: 'Хардуер' },
    short: { en: 'Firmware and radio', bg: 'Фърмуер и радио' },
    accent: 'kobait',
    proof: ['KObait'],
    href: '/work/kobait',
  },
  {
    id: 'system',
    name: { en: 'System software', bg: 'Системен софтуер' },
    short: { en: 'Boot and kernel', bg: 'Зареждане и ядро' },
    accent: 'malrynth',
    proof: ['Malrynth'],
    href: '/work/malrynth',
  },
];
