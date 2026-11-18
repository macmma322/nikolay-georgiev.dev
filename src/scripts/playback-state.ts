export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error'
  | 'unavailable';

let state: PlaybackState = 'idle';
const listeners = new Set<(state: PlaybackState) => void>();

export function publishPlaybackState(next: PlaybackState) {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener(state);
}

export function observePlaybackState(listener: (state: PlaybackState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}
