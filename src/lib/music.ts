export const tracks = [
  { title: 'Memory Reboot', artist: 'VØJ, Narvent', videoId: '44UaY-AN6ho' },
  { title: 'Fainted (You’re Wonderful)', artist: 'Narvent', videoId: '5Kn0Yc56jaw' },
  { title: 'Distant Echoes', artist: 'VXLLAIN, VØJ, Narvent', videoId: 'IzTJQiFoNGE' },
  { title: 'Fade Into Darkness', artist: 'Narvent', videoId: 'JOUELP4mnCQ' },
] as const;

export type Track = (typeof tracks)[number];

export const youtube = {
  api: 'https://www.youtube.com/iframe_api',
  widgetScripts: 'https://www.youtube.com/s/player/',
  embedOrigin: 'https://www.youtube-nocookie.com',
  watch: (track: Track) => `https://youtu.be/${track.videoId}`,
} as const;
