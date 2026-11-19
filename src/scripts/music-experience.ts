import { isLocale } from '@/i18n/config';
import { tracks, youtube, type Track } from '@/lib/music';
import { isPlaybackFailure, publishPlaybackState, type PlaybackState } from './playback-state';
import { attachYouTubePlayer, type StatusDetail } from './youtube-player';

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
    const playerSlot = this.querySelector<HTMLElement>('[data-music-player]') ?? screen;
    const fallbackCard = this.querySelector<HTMLElement>('[data-music-fallback]');
    const fallbackReason = this.querySelector<HTMLElement>('[data-fallback-reason]');
    const fallbackWatch = this.querySelector<HTMLAnchorElement>('[data-fallback-watch]');
    const statusLine = this.querySelector<HTMLElement>('[data-music-status]');
    const watch = this.querySelector<HTMLAnchorElement>('[data-watch]');
    const choose = this.querySelector<HTMLSelectElement>('[data-track-select]');
    const locale = this.dataset['locale'] ?? '';
    if (
      !launch ||
      !panel ||
      !closeButton ||
      !screen ||
      !playerSlot ||
      !statusLine ||
      !watch ||
      !choose
    )
      return;
    if (!isLocale(locale)) return;

    this.#connection = new AbortController();
    const { signal } = this.#connection;
    const canShowModal = typeof panel.showModal === 'function';
    if (canShowModal) {
      launch.setAttribute('aria-haspopup', 'dialog');
      launch.setAttribute('aria-controls', panel.id);
    }

    const setStatus = (state: PlaybackState, detail?: StatusDetail) => {
      if (state === 'idle') this.removeAttribute('data-state');
      else this.dataset['state'] = state;

      if (detail?.errorCode !== undefined) this.dataset['errorCode'] = String(detail.errorCode);
      else this.removeAttribute('data-error-code');

      const text = statusLine.dataset[state] ?? '';
      if (statusLine.textContent !== text) statusLine.textContent = text;

      if (fallbackCard) {
        const failed = isPlaybackFailure(state);
        fallbackCard.hidden = !failed;
        if (failed && fallbackReason) {
          const reasonKey = detail?.fallbackReason ?? state;
          const explanation =
            fallbackCard.dataset[reasonKey] ?? fallbackCard.dataset['unavailable'] ?? text;
          if (fallbackReason.textContent !== explanation) fallbackReason.textContent = explanation;
        }
      }

      publishPlaybackState(state);
    };

    const selectTrack = (track: Track) => {
      this.#track = track;
      this.dataset['trackAccent'] = track.accent;
      choose.value = track.videoId;
      const watchHref = youtube.watch(track);
      launch.href = watch.href = watchHref;
      if (fallbackWatch) fallbackWatch.href = watchHref;
      for (const title of this.querySelectorAll('[data-track-title]'))
        title.textContent = track.title;
      for (const artist of this.querySelectorAll('[data-track-artist]'))
        artist.textContent = track.artist;
      for (const catalog of this.querySelectorAll('[data-track-catalog]'))
        catalog.textContent = track.catalog;
    };

    const startTrack = () => {
      this.#closeSession?.();
      this.#closeSession = undefined;
      setStatus('loading');
      const track = this.#track;
      this.#closeSession = attachYouTubePlayer(playerSlot, locale, track, (state, detail) => {
        setStatus(state, detail);
        if (detail?.restoreFocus) {
          if (fallbackWatch && !fallbackCard?.hidden) fallbackWatch.focus();
          else watch.focus();
        }
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
        if (!canShowModal) return;
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
