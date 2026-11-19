export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'restricted'
  | 'unavailable'
  | 'error'
  | 'unsupported';

export function isPlaybackFailure(value: PlaybackState): boolean {
  return (
    value === 'restricted' ||
    value === 'unavailable' ||
    value === 'error' ||
    value === 'unsupported'
  );
}

let state: PlaybackState = 'idle';
const listeners = new Set<(state: PlaybackState) => void>();

export function getPlaybackState(): PlaybackState {
  return state;
}

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
