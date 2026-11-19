import { electricalInput } from './electrical-input';
import { createLiveCircuitAudio, type AudioSource } from './live-circuit-audio';
import { observePlaybackState } from './playback-state';

class ElectricityControls extends HTMLElement {
  #dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.#dispose) return;
    const mode = this.querySelector<HTMLSelectElement>('[data-mode]')!;
    const strength = this.querySelector<HTMLSelectElement>('[data-intensity]')!;
    const sources = this.querySelector<HTMLElement>('[data-live-sources]')!;
    const file = this.querySelector<HTMLInputElement>('[data-local-file]')!;
    const demo = this.querySelector<HTMLButtonElement>('[data-demo]')!;
    const dock = this.querySelector<HTMLElement>('[data-audio-dock]')!;
    const label = this.querySelector<HTMLElement>('[data-active-audio]')!;
    const toggle = this.querySelector<HTMLButtonElement>('[data-audio-toggle]')!;
    const stopButton = this.querySelector<HTMLButtonElement>('[data-audio-stop]')!;
    const notice = this.querySelector<HTMLElement>('[data-audio-notice]')!;
    const events = new AbortController();
    const { signal } = events;
    let session: ReturnType<typeof createLiveCircuitAudio> | undefined;
    let paused = false;

    const stop = () => {
      session?.stop();
      session = undefined;
      dock.hidden = true;
      this.removeAttribute('data-audio-band');
      this.removeAttribute('data-audio-status');
    };
    const setMode = (next: 'ambient' | 'player' | 'live') => {
      electricalInput.mode = next;
      mode.value = next;
      sources.hidden = next !== 'live';
      this.dataset['reactivity'] = next;
    };
    const finish = (reason?: 'unavailable' | 'ended') => {
      const focusWasInDock = dock.contains(document.activeElement);
      stop();
      setMode('ambient');
      if (reason) notice.textContent = this.dataset[reason] ?? '';
      if (
        focusWasInDock &&
        mode.getBoundingClientRect().top >= 0 &&
        mode.getBoundingClientRect().bottom <= innerHeight
      )
        mode.focus();
    };
    const begin = (source: AudioSource) => {
      stop();
      notice.textContent = '';
      if (!('AudioContext' in window) || (source instanceof File && !source.size)) {
        finish('unavailable');
        return;
      }
      try {
        session = createLiveCircuitAudio(
          source,
          (state) => {
            if (state === 'unavailable' || state === 'ended') {
              finish(state);
              return;
            }
            paused = state === 'paused';
            if (paused) this.removeAttribute('data-audio-band');
            label.textContent = this.dataset[state] ?? '';
            toggle.textContent = this.dataset[paused ? 'resume' : 'pause'] ?? '';
            this.dataset['audioStatus'] = state;
            dock.hidden = false;
          },
          (band) => {
            if (this.dataset['audioBand'] !== band) this.dataset['audioBand'] = band;
          },
        );
        void session.resume();
      } catch {
        finish('unavailable');
      }
    };

    setMode('ambient');
    this.hidden = false;
    mode.addEventListener(
      'change',
      () => {
        stop();
        notice.textContent = '';
        setMode(mode.value === 'live' || mode.value === 'player' ? mode.value : 'ambient');
      },
      { signal },
    );
    strength.addEventListener(
      'change',
      () => {
        electricalInput.strength = Number(strength.value) || 1;
      },
      { signal },
    );
    demo.addEventListener('click', () => begin('demo'), { signal });
    for (const button of this.querySelectorAll<HTMLButtonElement>('[data-site-audio]')) {
      button.addEventListener(
        'click',
        () => {
          begin(new URL(button.dataset['siteAudio']!, document.baseURI));
        },
        { signal },
      );
    }
    file.addEventListener(
      'change',
      () => {
        const selected = file.files?.[0];
        file.value = '';
        if (selected) begin(selected);
      },
      { signal },
    );
    toggle.addEventListener(
      'click',
      () => {
        if (paused) void session?.resume();
        else session?.pause();
      },
      { signal },
    );
    stopButton.addEventListener('click', () => finish(), { signal });
    window.addEventListener('pagehide', () => finish(), { signal });
    const unobserve = observePlaybackState((state) => {
      if (state === 'loading' && session) finish();
    });
    this.#dispose = () => {
      events.abort();
      unobserve();
      stop();
      electricalInput.mode = 'ambient';
    };
  }

  disconnectedCallback() {
    this.#dispose?.();
    this.#dispose = undefined;
  }
}

if (!customElements.get('electricity-controls'))
  customElements.define('electricity-controls', ElectricityControls);
