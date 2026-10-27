/**
 * Equipment explorers on /setup (src/components/setup/Explorer.astro).
 * One part is selected per explorer: its list button is pressed, its detail
 * panel shown and its drawing lit. The choice is kept in localStorage so the
 * same part is open after a language switch or a reload.
 */
for (const explorer of document.querySelectorAll<HTMLElement>('[data-explorer]')) {
  const key = `ng-setup:${explorer.dataset.explorer}`;
  const buttons = [...explorer.querySelectorAll<HTMLButtonElement>('button[data-pick]')];
  const parts = [...explorer.querySelectorAll<SVGElement>('[data-part]')];
  const details = [...explorer.querySelectorAll<HTMLElement>('[data-detail]')];
  const radios = [...explorer.querySelectorAll<HTMLInputElement>('input[data-view]')];
  if (buttons.length === 0) continue;

  const buttonFor = (id: string | undefined) => buttons.find((b) => b.dataset.pick === id);

  const light = (id: string | null, cls: 'is-on' | 'is-hover') => {
    for (const part of parts) part.classList.toggle(cls, part.dataset.part === id);
  };

  const select = (id: string | undefined, store = true) => {
    const button = buttonFor(id);
    if (!button) return;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
    for (const d of details) d.hidden = d.dataset.detail !== id;
    light(id ?? null, 'is-on');
    const radio = radios.find((r) => r.value === button.dataset.view);
    if (radio && !radio.checked) radio.checked = true;
    if (!store) return;
    try {
      localStorage.setItem(key, id ?? '');
    } catch {
      // Storage blocked: the choice simply is not remembered.
    }
  };

  const firstIn = (view: string) => buttons.find((b) => b.dataset.view === view);

  for (const b of buttons) {
    b.addEventListener('click', () => select(b.dataset.pick));
    b.addEventListener('pointerenter', () => light(b.dataset.pick ?? null, 'is-hover'));
    b.addEventListener('pointerleave', () => light(null, 'is-hover'));
    b.addEventListener('focus', () => light(b.dataset.pick ?? null, 'is-hover'));
    b.addEventListener('blur', () => light(null, 'is-hover'));
  }

  for (const part of parts) {
    part.addEventListener('click', () => select(part.dataset.part));
    part.addEventListener('pointerenter', () => light(part.dataset.part ?? null, 'is-hover'));
    part.addEventListener('pointerleave', () => light(null, 'is-hover'));
  }

  for (const radio of radios) {
    radio.addEventListener('change', () => select(firstIn(radio.value)?.dataset.pick));
  }

  for (const go of explorer.querySelectorAll<HTMLButtonElement>('[data-go-view]')) {
    go.addEventListener('click', () => {
      const first = firstIn(go.dataset.goView ?? '');
      select(first?.dataset.pick);
      first?.focus();
    });
  }

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    stored = null;
  }
  select(buttonFor(stored ?? undefined) ? (stored ?? undefined) : buttons[0]?.dataset.pick, false);
  explorer.dataset.ready = '';
}
