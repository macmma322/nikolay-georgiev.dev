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
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'restricted'
  | 'unavailable'
  | 'error'
  | 'unsupported';

export type FallbackReason =
  'restricted' | 'configBlocked' | 'unavailable' | 'error' | 'unsupported';

export interface StatusDetail {
  restoreFocus?: boolean;
  errorCode?: number;
  fallbackReason?: FallbackReason;
}

export function classifyYouTubeError(code: number): {
  status: 'restricted' | 'unavailable' | 'error';
  fallbackReason: FallbackReason;
} {
  if (code === 101 || code === 150) {
    return { status: 'restricted', fallbackReason: 'restricted' };
  }
  if (code === 153) {
    return { status: 'unavailable', fallbackReason: 'configBlocked' };
  }
  if (code === 5 || code === 100) {
    return { status: 'unavailable', fallbackReason: 'unavailable' };
  }
  return { status: 'error', fallbackReason: 'error' };
}

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

export function isYouTubeEmbedSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.postMessage === 'function' &&
    typeof URL === 'function' &&
    'IntersectionObserver' in window
  );
}

export function attachYouTubePlayer(
  host: HTMLElement,
  locale: Locale,
  track: Track,
  onStatus: (status: PlaybackStatus, detail?: StatusDetail) => void,
): () => void {
  const lifetime = new AbortController();
  let player: Player | undefined;
  let frame: HTMLIFrameElement | undefined;
  let readyTimeout: number | undefined;
  let frameVisible = true;
  let isReady = false;

  if (!isYouTubeEmbedSupported()) {
    queueMicrotask(() => {
      if (!lifetime.signal.aborted) {
        onStatus('unsupported', { fallbackReason: 'unsupported' });
      }
    });
    return () => {
      lifetime.abort();
      host.replaceChildren();
    };
  }

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

  const fail = (
    reason: 'restricted' | 'unavailable' | 'error' | 'unsupported',
    fallbackReason: FallbackReason = reason,
    errorCode?: number,
  ) => {
    if (lifetime.signal.aborted) return;
    const hadFocus = host.contains(document.activeElement);
    dispose();
    const detail: StatusDetail = { restoreFocus: hadFocus, fallbackReason };
    if (errorCode !== undefined) detail.errorCode = errorCode;
    onStatus(reason, detail);
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
        rel: '0',
        origin: window.location.origin,
        hl: locale,
      }).toString();

      frame = document.createElement('iframe');
      frame.title = `${track.title} — ${track.artist}`;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = youtube.allow;

      const attach = () => {
        if (lifetime.signal.aborted || !frame || player) return;
        try {
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
                const classified = classifyYouTubeError(data);
                fail(classified.status, classified.fallbackReason, data);
              },
            },
          });
        } catch {
          fail('error');
        }
      };

      // Wait for the embed document to load before binding the IFrame API so
      // YouTube's initial postMessage never races against an about:blank origin.
      frame.addEventListener('load', attach, { once: true, signal: lifetime.signal });
      frame.addEventListener('error', () => fail('error'), {
        once: true,
        signal: lifetime.signal,
      });
      frame.src = url.href;
      host.replaceChildren(frame);
      readyTimeout = window.setTimeout(() => fail('error'), TIMEOUT_MS);
    })
    .catch(() => fail('error'));

  return dispose;
}
