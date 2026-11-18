import { isLocale } from '@/i18n/config';
import { tracks, youtube, type Track } from '@/lib/music';
import { publishPlaybackState, type PlaybackState } from './playback-state';
import { attachYouTubePlayer } from './youtube-player';

class MusicExperience extends HTMLElement {
  #connection: AbortController | undefined;
  #closeSession: (() => void) | undefined;
  #track: Track = tracks[0];

  connectedCallback() {
    if (this.#connection) return;
    const launch = this.querySelector<HTMLAnchorElement>('[data-music-launch]');
    const panel = this.querySelector<HTMLDialogElement>('dialog');
    const closeButton = this.querySelector<HTMLButtonElement>('[data-music-close]');
    const screen = this.querySelector<HTMLElement>('[data-music-screen]');
    const statusLine = this.querySelector<HTMLElement>('[data-music-status]');
    const watch = this.querySelector<HTMLAnchorElement>('[data-watch]');
    const choose = this.querySelector<HTMLSelectElement>('[data-track-select]');
    const locale = this.dataset['locale'] ?? '';
    if (!launch || !panel?.showModal || !closeButton || !screen || !statusLine || !watch || !choose)
      return;
    if (!isLocale(locale)) return;

    this.#connection = new AbortController();
    const { signal } = this.#connection;
    launch.setAttribute('aria-haspopup', 'dialog');
    launch.setAttribute('aria-controls', panel.id);

    const setStatus = (state: PlaybackState) => {
      if (state === 'idle') this.removeAttribute('data-state');
      else this.dataset['state'] = state;
      const text = statusLine.dataset[state] ?? '';
      if (statusLine.textContent !== text) statusLine.textContent = text;
      publishPlaybackState(state);
    };

    const selectTrack = (track: Track) => {
      this.#track = track;
      choose.value = track.videoId;
      launch.href = watch.href = youtube.watch(track);
      for (const title of this.querySelectorAll('[data-track-title]'))
        title.textContent = track.title;
      for (const artist of this.querySelectorAll('[data-track-artist]'))
        artist.textContent = track.artist;
    };

    const startTrack = () => {
      this.#closeSession?.();
      setStatus('loading');
      const track = this.#track;
      this.#closeSession = attachYouTubePlayer(screen, locale, track, (state, restoreFocus) => {
        setStatus(state);
        if (restoreFocus) watch.focus();
      });
    };

    const close = (restoreFocus: boolean) => {
      const wasOpen = panel.open;
      try {
        this.#closeSession?.();
      } finally {
        this.#closeSession = undefined;
        this.removeAttribute('data-open');
        setStatus('idle');
        if (wasOpen) panel.close();
        if (restoreFocus && wasOpen) launch.focus({ preventScroll: true });
      }
    };

    selectTrack(this.#track);
    choose.addEventListener(
      'change',
      () => {
        const track = tracks.find(({ videoId }) => videoId === choose.value);
        if (!track || track === this.#track) return;
        selectTrack(track);
        if (panel.open) startTrack();
      },
      { signal },
    );

    launch.addEventListener(
      'click',
      (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
          return;
        if (panel.open) {
          event.preventDefault();
          return;
        }
        try {
          panel.showModal();
        } catch {
          return;
        }
        event.preventDefault();
        this.setAttribute('data-open', '');
        startTrack();
      },
      { signal },
    );

    closeButton.addEventListener('click', () => close(true), { signal });
    panel.addEventListener(
      'cancel',
      (event) => {
        event.preventDefault();
        close(true);
      },
      { signal },
    );
    panel.addEventListener(
      'close',
      () => {
        if (!panel.open) close(false);
      },
      { signal },
    );
    window.addEventListener('pagehide', () => close(false), { signal });
    signal.addEventListener('abort', () => close(false), { once: true });
  }

  disconnectedCallback() {
    this.#connection?.abort();
    this.#connection = undefined;
  }
}

if (!customElements.get('music-experience')) {
  customElements.define('music-experience', MusicExperience);
}
