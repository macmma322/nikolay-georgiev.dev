/**
 * Case-study section tracking.
 *
 * Marks the section being read (the reading line sits 30% down the viewport)
 * as current in both contents lists with aria-current; CSS turns that into the
 * lit entry and the progress rail. It fades the rail while a diagram passes
 * under it. Below 1180px it also names the section in
 * the compact bar and closes that bar's list after a jump, on Escape, on a
 * click outside it or when focus leaves it. Without this script both lists are plain anchor links.
 */
const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-case-sections] > [id]'));
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
const bar = document.querySelector<HTMLDetailsElement>('[data-toc-bar]');
const barN = document.querySelector<HTMLElement>('[data-toc-now-n]');
const barLabel = document.querySelector<HTMLElement>('[data-toc-now-label]');

let current: string | null = null;

function setCurrent(id: string | null) {
  if (id === current) return;
  current = id;
  for (const link of links) {
    if (link.dataset.tocLink === id) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  const item = links.find((link) => link.dataset.tocLink === id);
  if (barN && barLabel) {
    barN.textContent = item?.dataset.tocN ?? '';
    barLabel.textContent = item?.dataset.tocLabel ?? '';
  }
}

// The current section is the last one whose start has passed the reading
// line. The observer watches the band above that line, so every crossing (and
// every jump, including one into the gap between two sections) re-reads it.
function update() {
  // At least 150px, so a jump on a short landscape phone (which lands a
  // section about 136px down, under the header and the bar) still counts.
  const line = Math.max(window.innerHeight * 0.3, 150);
  let id: string | null = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top > line) break;
    id = section.id;
  }
  setCurrent(id);
}

if (sections.length > 0 && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(update, { rootMargin: '0px 0px -70% 0px' });
  for (const section of sections) observer.observe(section);
}

// From 1180px the diagrams run under the contents rail. The rail steps aside
// while a figure passes behind it, and comes back for keyboard focus (CSS).
const rail = document.querySelector<HTMLElement>('.toc');
const figures = document.querySelector('.diagrams');
let railObserver: IntersectionObserver | undefined;

function watchRail() {
  railObserver?.disconnect();
  if (!rail || !figures || rail.offsetHeight === 0) return;
  const top = parseFloat(getComputedStyle(rail).top) || 0;
  const bottom = window.innerHeight - top - rail.offsetHeight;
  railObserver = new IntersectionObserver(
    (entries) => rail.toggleAttribute('data-aside', entries.at(-1)?.isIntersecting ?? false),
    { rootMargin: `${-top}px 0px ${-bottom}px 0px` },
  );
  railObserver.observe(figures);
}

if ('IntersectionObserver' in window) {
  watchRail();
  window.addEventListener('resize', watchRail);
}

if (bar) {
  const close = () => {
    bar.open = false;
  };
  bar.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) close();
  });
  bar.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bar.open) {
      close();
      bar.querySelector('summary')?.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (bar.open && event.target instanceof Node && !bar.contains(event.target)) close();
  });
  // Tabbing out of the open list closes it, so it never covers focused content.
  bar.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (bar.open && !(next instanceof Node && bar.contains(next))) close();
  });
}
