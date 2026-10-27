import type { STATUSES } from '@/content.config';
import type { L } from '@/i18n';

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, L> = {
  production: { en: 'Production', bg: 'В експлоатация' },
  'live-pre-launch': { en: 'Live, pre-launch', bg: 'Онлайн, преди старта' },
  active: { en: 'Active development', bg: 'Активна разработка' },
  prototype: { en: 'Prototype', bg: 'Прототип' },
  research: { en: 'Research', bg: 'Проучване' },
  experimental: { en: 'Experimental', bg: 'Експериментален' },
  paused: { en: 'Paused', bg: 'На пауза' },
  planned: { en: 'Planned', bg: 'Планиран' },
  concept: { en: 'Concept', bg: 'Концепция' },
};

/**
 * One glyph per meaning, drawn so the shape survives without colour (forced
 * colours, greyscale print): only production is a solid signal square;
 * pre-launch is the same square half filled; nothing pulses.
 */
export type StatusShape = 'production' | 'half' | 'solid' | 'hollow' | 'paused' | 'dashed';

export const STATUS_SHAPE: Record<Status, StatusShape> = {
  production: 'production',
  'live-pre-launch': 'half',
  active: 'solid',
  prototype: 'hollow',
  research: 'hollow',
  experimental: 'hollow',
  paused: 'paused',
  planned: 'dashed',
  concept: 'dashed',
};
