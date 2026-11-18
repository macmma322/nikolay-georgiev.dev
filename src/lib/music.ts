export const featuredTrack = {
  title: 'Loser',
  artist: 'Tame Impala',
  videoId: 's3a4OQR-10M',
} as const;

export const youtube = {
  api: 'https://www.youtube.com/iframe_api',
  widgetScripts: 'https://www.youtube.com/s/player/',
  embedOrigin: 'https://www.youtube-nocookie.com',
  watch: `https://www.youtube.com/watch?v=${featuredTrack.videoId}`,
} as const;
