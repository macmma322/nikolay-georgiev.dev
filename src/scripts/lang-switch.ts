/**
 * Language switch links ([data-lang-link], LangSwitch.astro). A click
 * remembers the choice (HeadBoot sends later visits of "/" to it) and, when
 * the page is scrolled, carries the section in view across: its id becomes
 * the link's fragment (the no-JS fallback) and its viewport offset goes to
 * sessionStorage, so the new page can put it back at the same height. The
 * navigation itself stays native.
 */
const LINE = 0.3;

/** The last section whose top has passed the 30% line. */
function sectionInView(): HTMLElement | undefined {
  const line = window.innerHeight * LINE;
  let found: HTMLElement | undefined;
  for (const el of document.querySelectorAll('main [id]')) {
    if (!(el instanceof HTMLElement) || el.closest('.visually-hidden, [hidden]')) continue;
    const box = el.getBoundingClientRect();
    if (box.height > 0 && box.top <= line) found = el;
  }
  return found;
}

document.addEventListener('click', (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const link = event.target instanceof Element ? event.target.closest('a[data-lang-link]') : null;
  if (!(link instanceof HTMLAnchorElement)) return;

  // Already in this language: nothing to switch, and no reload to the top.
  if (link.hasAttribute('aria-current')) {
    event.preventDefault();
    return;
  }

  try {
    localStorage.setItem('ng-lang', link.dataset.langLink ?? '');
  } catch {
    // Storage blocked: the switch still works, it is just not remembered.
  }

  const section = window.scrollY > 0 ? sectionInView() : undefined;
  const url = new URL(link.href);
  url.hash = section?.id ?? '';
  link.href = url.href;
  if (!section) return;

  try {
    sessionStorage.setItem(
      'ng-lang-anchor',
      JSON.stringify({
        path: url.pathname,
        id: section.id,
        offsetY: Math.round(section.getBoundingClientRect().top),
        t: Date.now(),
      }),
    );
  } catch {
    // Without the record the fragment alone still lands on the section.
  }
});

/**
 * English pages never load the Cyrillic faces, so the first Bulgarian page
 * could paint in the Latin fallback and reflow when they arrive. Pointing at
 * or focusing the BG link, or the menu that holds it, starts them early.
 * ponytail: a head start, not a guarantee; a click faster than the download
 * still swaps once.
 */
let warmed = false;
const warm = () => {
  if (warmed || document.documentElement.lang !== 'en') return;
  warmed = true;
  const css = getComputedStyle(document.documentElement);
  for (const name of ['--font-cyr', '--font-mono-cyr']) {
    const family = css.getPropertyValue(name).trim();
    if (family) document.fonts.load(`1em ${family}`, 'Ж').catch(() => {});
  }
};
for (const type of ['pointerover', 'focusin']) {
  document.addEventListener(
    type,
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a[data-lang-link="bg"], .menu-button')) warm();
    },
    { passive: true },
  );
}
