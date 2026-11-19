import type { L } from '@/i18n';

export const music = {
  feature: { en: 'Now on repeat', bg: 'На повторение' },
  choose: { en: 'Track', bg: 'Песен' },
  open: { en: 'Open YouTube player', bg: 'Отвори плейъра на YouTube' },
  close: { en: 'Close player', bg: 'Затвори плейъра' },
  selection: { en: 'Synthwave selection', bg: 'Синтуейв селекция' },
  watch: { en: 'Watch on YouTube', bg: 'Гледай в YouTube' },
  listen: { en: 'Listen on YouTube', bg: 'Слушай в YouTube' },
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
    restricted: {
      en: 'Embedded playback is restricted for this track.',
      bg: 'Вграденото възпроизвеждане е ограничено за тази песен.',
    },
    unavailable: {
      en: 'YouTube playback is unavailable here.',
      bg: 'Възпроизвеждането от YouTube тук е недостъпно.',
    },
    error: { en: 'YouTube player could not load.', bg: 'Плейърът на YouTube не се зареди.' },
    unsupported: {
      en: 'Embedded playback is not supported in this browser.',
      bg: 'Вграденото възпроизвеждане не се поддържа в този браузър.',
    },
  },
  fallback: {
    restricted: {
      en: 'YouTube did not permit embedded playback for this track on the current address. Open it directly on YouTube to listen.',
      bg: 'YouTube не разреши вграденото възпроизвеждане за тази песен на текущия адрес. Отворете я директно в YouTube, за да я чуете.',
    },
    configBlocked: {
      en: 'YouTube blocked embedded playback because the browser did not send a page referrer or privacy settings restricted the player.',
      bg: 'YouTube блокира вграденото възпроизвеждане, защото браузърът не изпрати реферер или настройките за поверителност ограничиха плейъра.',
    },
    unavailable: {
      en: 'Embedded playback is unavailable right now. You can still listen directly on YouTube.',
      bg: 'Вграденото възпроизвеждане в момента е недостъпно. Все още можете да слушате директно в YouTube.',
    },
    error: {
      en: 'Could not reach the YouTube player. Check your connection or open the track directly on YouTube.',
      bg: 'Връзката с плейъра на YouTube беше неуспешна. Проверете мрежата или отворете песента директно в YouTube.',
    },
    unsupported: {
      en: 'This browser cannot initialize the embedded YouTube player. Open the track directly on YouTube instead.',
      bg: 'Този браузър не може да стартира вградения плейър на YouTube. Отворете песента директно в YouTube.',
    },
  },
} as const satisfies Record<string, L | Record<string, L>>;
