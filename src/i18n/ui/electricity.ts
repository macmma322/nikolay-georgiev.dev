import type { L } from '@/i18n';

export const electricity = {
  label: { en: 'Electricity reactivity', bg: 'Реакция на електрическите вериги' },
  mode: { en: 'Mode', bg: 'Режим' },
  ambient: { en: 'Ambient', bg: 'Фонов режим' },
  player: { en: 'Player activity', bg: 'Състояние на плейъра' },
  live: { en: 'Live audio', bg: 'Аудио на живо' },
  strength: { en: 'Intensity', bg: 'Интензивност' },
  low: { en: 'Low', bg: 'Ниска' },
  medium: { en: 'Medium', bg: 'Средна' },
  high: { en: 'High', bg: 'Висока' },
  playerHelp: {
    en: 'YouTube changes the circuit through player state alone.',
    bg: 'YouTube променя веригите само чрез състоянието на плейъра.',
  },
  sourceHelp: {
    en: 'Analyze the generated demo or an audio file you choose. Analysis stays in this browser.',
    bg: 'Анализирайте генерирания пример или избран от вас аудиофайл. Анализът остава в този браузър.',
  },
  demo: { en: 'Play circuit demo', bg: 'Пусни звуковия пример' },
  file: { en: 'Choose an audio file', bg: 'Изберете аудиофайл' },
  running: { en: 'Local audio analysis', bg: 'Локален аудиоанализ' },
  paused: { en: 'Local audio paused', bg: 'Локалното аудио е на пауза' },
  pause: { en: 'Pause', bg: 'Пауза' },
  resume: { en: 'Resume', bg: 'Продължи' },
  stop: { en: 'Stop audio', bg: 'Спри аудиото' },
  unavailable: {
    en: 'Local audio is unavailable. Ambient mode restored.',
    bg: 'Локалното аудио е недостъпно. Фоновият режим е възстановен.',
  },
  ended: {
    en: 'Audio ended. Ambient mode restored.',
    bg: 'Аудиото приключи. Фоновият режим е възстановен.',
  },
} as const satisfies Record<string, L>;
