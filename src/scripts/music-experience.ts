import { isLocale } from '@/i18n/config';
import { attachYouTubePlayer, type PlaybackStatus } from './youtube-player';

class MusicExperience extends HTMLElement {
  #connection: AbortController | undefined;
  #closeSession: (() => void) | undefined;

  connectedCallback() {
    if (this.#connection) return;
    const launch = this.querySelector<HTMLAnchorElement>('[data-music-launch]');
    const panel = this.querySelector<HTMLDialogElement>('dialog');
    const closeButton = this.querySelector<HTMLButtonElement>('[data-music-close]');
    const screen = this.querySelector<HTMLElement>('[data-music-screen]');
    const statusLine = this.querySelector<HTMLElement>('[data-music-status]');
    const watch = this.querySelector<HTMLAnchorElement>('[data-watch]');
    const locale = this.dataset['locale'] ?? '';
    const title = panel?.dataset['videoTitle'];
    if (!launch || !panel?.showModal || !closeButton || !screen || !statusLine || !title) return;
    if (!isLocale(locale)) return;

    this.#connection = new AbortController();
    const { signal } = this.#connection;
    launch.setAttribute('aria-haspopup', 'dialog');
    launch.setAttribute('aria-controls', panel.id);

    const setStatus = (state: PlaybackStatus | 'loading') => {
      this.dataset['state'] = state;
      const text = statusLine.dataset[state] ?? '';
      if (statusLine.textContent !== text) statusLine.textContent = text;
    };

    const close = (restoreFocus: boolean) => {
      const wasOpen = panel.open;
      // Stop and dispose before allowing the modal to hide the player.
      try {
        this.#closeSession?.();
      } finally {
        this.#closeSession = undefined;
        this.removeAttribute('data-open');
        this.removeAttribute('data-state');
        if (wasOpen) panel.close();
        if (restoreFocus && wasOpen) launch.focus({ preventScroll: true });
      }
    };

    launch.addEventListener(
      'click',
      (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
          return;
        if (panel.open) {
          event.preventDefault();
          return;
        }
        // If a browser cannot open a dialog, keep the link's normal destination.
        try {
          panel.showModal();
        } catch {
          return;
        }
        event.preventDefault();
        this.setAttribute('data-open', '');
        setStatus('loading');
        this.#closeSession = attachYouTubePlayer(screen, locale, title, (state, restoreFocus) => {
          setStatus(state);
          if (restoreFocus) watch?.focus();
        });
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
