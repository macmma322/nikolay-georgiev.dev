import type { L } from '@/i18n';

export const music = {
  feature: { en: 'Now on repeat', bg: 'На повторение' },
  choose: { en: 'Track', bg: 'Песен' },
  open: { en: 'Open YouTube player', bg: 'Отвори плейъра на YouTube' },
  close: { en: 'Close player', bg: 'Затвори плейъра' },
  selection: { en: 'Synthwave selection', bg: 'Синтуейв селекция' },
  watch: { en: 'Watch on YouTube', bg: 'Гледай в YouTube' },
  privacy: {
    en: 'Opening the player connects to YouTube.',
    bg: 'При отваряне плейърът се свързва с YouTube.',
  },
  googlePrivacy: { en: 'Google’s privacy policy', bg: 'Политика за поверителност на Google' },
  status: {
    loading: { en: 'Loading YouTube player…', bg: 'Плейърът на YouTube се зарежда…' },
    ready: { en: 'YouTube player loaded', bg: 'Плейърът на YouTube е зареден' },
    playing: { en: 'Playing', bg: 'Възпроизвежда се' },
    paused: { en: 'Paused', bg: 'На пауза' },
    buffering: { en: 'Buffering…', bg: 'Видеото се зарежда…' },
    ended: { en: 'Playback ended', bg: 'Възпроизвеждането приключи' },
    error: { en: 'YouTube player could not load.', bg: 'Плейърът на YouTube не се зареди.' },
    unavailable: {
      en: 'YouTube playback is unavailable here.',
      bg: 'Възпроизвеждането от YouTube тук е недостъпно.',
    },
  },
} as const satisfies Record<string, L | Record<string, L>>;
