import { electricalInput } from './electrical-input';
import { createLiveCircuitAudio, type AudioSource } from './live-circuit-audio';
import { observePlaybackState } from './playback-state';
import {
  getQualityPreference,
  observeQualityTier,
  setQualityPreference,
  type QualityPreference,
} from './circuit-clock';

class ElectricityControls extends HTMLElement {
  #dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.#dispose) return;
    const details = this.querySelector('details')!;
    const summary = details.querySelector('summary')!;
    const mode = this.querySelector<HTMLSelectElement>('[data-mode]')!;
    const strength = this.querySelector<HTMLSelectElement>('[data-intensity]')!;
    const qualitySelect = this.querySelector<HTMLSelectElement>('[data-quality]');
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
      if (focusWasInDock) summary.focus();
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
    if (qualitySelect) {
      qualitySelect.value = getQualityPreference();
      qualitySelect.addEventListener(
        'change',
        () => {
          const value = qualitySelect.value;
          const next: QualityPreference =
            value === 'high' || value === 'balanced' || value === 'low' ? value : 'auto';
          setQualityPreference(next);
        },
        { signal },
      );
    }
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
    document.addEventListener(
      'pointerdown',
      ({ target }) => {
        if (details.open && target instanceof Node && !this.contains(target)) details.open = false;
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && details.open) {
          const hadFocus = details.contains(document.activeElement);
          details.open = false;
          if (hadFocus) summary.focus();
        }
      },
      { signal },
    );
    window.addEventListener('pagehide', () => finish(), { signal });
    const unobserve = observePlaybackState((state) => {
      if (state === 'loading' && session) finish();
    });
    const unobserveQuality = qualitySelect
      ? observeQualityTier(() => {
          qualitySelect.value = getQualityPreference();
        })
      : undefined;
    this.#dispose = () => {
      events.abort();
      unobserve();
      unobserveQuality?.();
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
