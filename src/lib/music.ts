export const tracks = [
  {
    title: 'Memory Reboot',
    artist: 'VØJ, Narvent',
    videoId: '44UaY-AN6ho',
    catalog: 'A1',
    accent: 'copper',
  },
  {
    title: 'Fainted (You’re Wonderful)',
    artist: 'Narvent',
    videoId: '5Kn0Yc56jaw',
    catalog: 'A2',
    accent: 'amber',
  },
  {
    title: 'Distant Echoes',
    artist: 'VXLLAIN, VØJ, Narvent',
    videoId: 'IzTJQiFoNGE',
    catalog: 'B1',
    accent: 'violet',
  },
  {
    title: 'Fade Into Darkness',
    artist: 'Narvent',
    videoId: 'JOUELP4mnCQ',
    catalog: 'B2',
    accent: 'ember',
  },
] as const;

export type Track = (typeof tracks)[number];

export const youtube = {
  api: 'https://www.youtube.com/iframe_api',
  widgetScripts: 'https://www.youtube.com/s/player/',
  embedOrigin: 'https://www.youtube-nocookie.com',
  // Standard YouTube embed permissions; omits `web-share` (unrecognized in Chromium)
  // and handles fullscreen here instead of combining with the legacy `allowfullscreen`.
  allow:
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
  watch: (track: Track) => `https://youtu.be/${track.videoId}`,
} as const;
