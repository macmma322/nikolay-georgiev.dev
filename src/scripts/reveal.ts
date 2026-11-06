/**
 * Reveal-once for elements with the `.reveal` class (styles in base.css).
 *
 * Content is visible without this script and under reduced motion: the CSS
 * only hides `.reveal` after the document is marked with data-motion. Anything
 * already on screen is shown instantly in the same task, so nothing flashes.
 * The rest plays once as it arrives, with a short stagger inside one batch,
 * and never replays or scrubs backwards.
 */
// Typed labels (base.css, .type) step once per character: give each its length.
for (const el of document.querySelectorAll<HTMLElement>(
  '.type, :is(.intro, .intro-copy, .nf) > .label',
)) {
  el.style.setProperty('--chars', String(Math.max(4, el.textContent?.trim().length ?? 0)));
}

// A .reveal-each container (long text) reveals its children one by one.
for (const el of document.querySelectorAll<HTMLElement>('.reveal-each > *')) {
  el.classList.add('reveal');
}

const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (items.length > 0 && !reduce && 'IntersectionObserver' in window) {
  const fold = window.innerHeight * 0.92;
  for (const el of items) {
    if (el.getBoundingClientRect().top < fold) el.dataset.shown = 'instant';
  }
  document.documentElement.dataset.motion = '';

  const observer = new IntersectionObserver(
    (entries) => {
      let batch = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        const delay = Math.min(batch++, 4) * 40;
        window.setTimeout(() => (el.dataset.shown = 'play'), delay);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  for (const el of items) {
    if (!el.dataset.shown) observer.observe(el);
  }
}
