import { PAGE, type Page } from './layout';

/**
 * One CV page as SVG markup, from the same layout the PDF is written from.
 * The build renders the first previews with it and the browser re-renders a
 * tailored CV with it. Text stays text (selectable, in the PDF's reading
 * order); the page CSS turns kerning, ligatures and localized forms off, as
 * the PDF has them, so every line breaks the same.
 */
const weight = { regular: 400, semibold: 600, bold: 700 } as const;
const r = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sheetSvg(page: Page, photo: string, label: string): string {
  const out: string[] = [];
  page.items.forEach((it, i) => {
    if (it.t === 'rect') {
      out.push(
        `<rect x="${r(it.x)}" y="${r(it.y)}" width="${r(it.w)}" height="${r(it.h)}" fill="${it.color}"/>`,
      );
    } else if (it.t === 'image') {
      out.push(
        `<image href="${esc(photo)}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"/>`,
      );
    } else if (it.t === 'text') {
      const text = `<text x="${r(it.x)}" y="${r(it.y)}" font-size="${it.size}" font-weight="${weight[it.font]}" fill="${it.color}">${esc(it.text)}</text>`;
      const next = page.items[i + 1];
      out.push(next?.t === 'link' ? `<a href="${esc(next.url)}">${text}</a>` : text);
    }
  });
  return `<svg class="sheet" viewBox="0 0 ${PAGE.w} ${PAGE.h}" role="group" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
}
