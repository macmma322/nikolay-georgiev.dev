import { youtube, type Track } from '@/lib/music';
import type { Locale } from '@/i18n/config';

type Player = {
  pauseVideo(): void;
  destroy(): void;
};

type PlayerEvent = { target: Player };
type PlayerDataEvent = PlayerEvent & { data: number };

type YouTubeApi = {
  Player: new (
    iframe: HTMLIFrameElement,
    options: {
      events: {
        onReady(event: PlayerEvent): void;
        onStateChange(event: PlayerDataEvent): void;
        onError(event: PlayerDataEvent): void;
      };
    },
  ) => Player;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type PlaybackStatus =
  'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error' | 'unavailable';

export function applyYouTubeState(
  code: number,
  hidden: boolean,
  report: (status: PlaybackStatus) => void,
  pause: () => void,
) {
  switch (code) {
    case 0:
      report('ended');
      break;
    case 1:
      if (hidden) pause();
      else report('playing');
      break;
    case 2:
      report('paused');
      break;
    case 3:
      // Buffering may resume into playback while the page is hidden.
      if (hidden) pause();
      else report('buffering');
      break;
  }
}

const TIMEOUT_MS = 12_000;
let apiRequest: Promise<YouTubeApi> | undefined;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (apiRequest) return apiRequest;
  if (window.YT?.Player) return Promise.resolve(window.YT);

  apiRequest = new Promise<YouTubeApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = youtube.api;
    script.async = true;
    const previousCallback = window.onYouTubeIframeAPIReady;

    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('error', onFailure);
      if (window.onYouTubeIframeAPIReady !== onReady) return;
      if (previousCallback) window.onYouTubeIframeAPIReady = previousCallback;
      else delete window.onYouTubeIframeAPIReady;
    };

    const onFailure = () => {
      cleanup();
      script.remove();
      reject(new Error('YouTube IFrame API could not load'));
    };

    const onReady = () => {
      if (window.YT?.Player) {
        cleanup();
        resolve(window.YT);
      } else {
        onFailure();
      }
      previousCallback?.();
    };

    const timeout = window.setTimeout(onFailure, TIMEOUT_MS);
    window.onYouTubeIframeAPIReady = onReady;
    script.addEventListener('error', onFailure, { once: true });
    document.head.append(script);
  }).catch((error: unknown) => {
    apiRequest = undefined;
    throw error;
  });
  return apiRequest;
}

export function attachYouTubePlayer(
  host: HTMLElement,
  locale: Locale,
  track: Track,
  onStatus: (status: PlaybackStatus, restoreFocus?: boolean) => void,
): () => void {
  const lifetime = new AbortController();
  let player: Player | undefined;
  let frame: HTMLIFrameElement | undefined;
  let readyTimeout: number | undefined;
  let frameVisible = true;
  let isReady = false;

  const dispose = () => {
    if (lifetime.signal.aborted) return;
    lifetime.abort();
    observer.disconnect();
    window.clearTimeout(readyTimeout);
    // A removed browsing context stops playback even if YouTube is unresponsive.
    try {
      if (isReady) player?.pauseVideo();
    } catch {
      // The iframe may have already disconnected.
    }
    try {
      player?.destroy();
    } catch {
      // Continue with DOM cleanup if the remote player is already gone.
    } finally {
      frame?.remove();
      host.replaceChildren();
    }
  };

  const fail = (reason: 'error' | 'unavailable') => {
    if (lifetime.signal.aborted) return;
    const hadFocus = host.contains(document.activeElement);
    dispose();
    onStatus(reason, hadFocus);
  };

  const pauseIfHidden = (activePlayer = player) => {
    if (!isReady || (!document.hidden && frameVisible)) return;
    try {
      activePlayer?.pauseVideo();
    } catch {
      fail('error');
    }
  };

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry || lifetime.signal.aborted) return;
    frameVisible = entry.isIntersecting;
    pauseIfHidden();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', () => pauseIfHidden(), { signal: lifetime.signal });

  void loadYouTubeApi()
    .then((api) => {
      if (lifetime.signal.aborted) return;
      const url = new URL(`/embed/${track.videoId}`, youtube.embedOrigin);
      url.search = new URLSearchParams({
        autoplay: '0',
        controls: '1',
        enablejsapi: '1',
        playsinline: '1',
        origin: window.location.origin,
        hl: locale,
      }).toString();

      frame = document.createElement('iframe');
      frame.title = `${track.title} — ${track.artist}`;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'encrypted-media; fullscreen';
      frame.allowFullscreen = true;
      frame.src = url.href;
      frame.addEventListener('error', () => fail('error'), { signal: lifetime.signal });
      host.append(frame);
      readyTimeout = window.setTimeout(() => fail('error'), TIMEOUT_MS);

      player = new api.Player(frame, {
        events: {
          onReady() {
            if (lifetime.signal.aborted) return;
            window.clearTimeout(readyTimeout);
            isReady = true;
            onStatus('ready');
            pauseIfHidden();
          },
          onStateChange({ data, target }) {
            if (lifetime.signal.aborted || !isReady) return;
            applyYouTubeState(data, document.hidden || !frameVisible, onStatus, () => {
              pauseIfHidden(target);
            });
          },
          onError({ data }) {
            fail([5, 100, 101, 150, 153].includes(data) ? 'unavailable' : 'error');
          },
        },
      });
    })
    .catch(() => fail('error'));

  return dispose;
}
