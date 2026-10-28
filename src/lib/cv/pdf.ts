import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFName, PDFString, rgb, type PDFFont } from 'pdf-lib';
import type { CvDoc } from './doc';
import { layout, PAGE, type FontKey, type Measure } from './layout';

/**
 * Writes the CV as a PDF with pdf-lib, in the browser (the Generate button)
 * and at build time (the fallback files). Free and offline: no service, no
 * account. Text is real text in embedded, subset TikTok Sans with a Unicode
 * map, so it can be selected, searched and parsed.
 */

export type FontBytes = Record<FontKey, Uint8Array>;

/** Glyph substitution and kerning off, here and in the preview's CSS, so widths agree everywhere. */
const FEATURES = { liga: false, clig: false, calt: false, kern: false };

export function measurer(fonts: FontBytes): Measure {
  const faces = Object.fromEntries(
    Object.entries(fonts).map(([key, bytes]) => [key, fontkit.create(bytes)]),
  ) as Record<FontKey, ReturnType<typeof fontkit.create>>;
  const cache = new Map<string, number>();
  return (font, size, text) => {
    const key = `${font}\u0000${text}`;
    let units = cache.get(key);
    if (units === undefined) {
      const face = faces[font];
      const run = face.layout(text, FEATURES);
      // A missing glyph would print as a blank box: fail the build instead.
      const missing = run.glyphs.findIndex((g) => g.id === 0);
      if (missing >= 0) throw new Error(`CV font has no glyph for "${text[missing]}" in "${text}"`);
      units = run.glyphs.reduce((sum, g) => sum + g.advanceWidth, 0) / face.unitsPerEm;
      cache.set(key, units);
    }
    return units * size;
  };
}

const color = (hex: string) =>
  rgb(
    ...([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]),
  );

export async function cvPdf(
  doc: CvDoc,
  assets: { fonts: FontBytes; photo: Uint8Array },
  date = new Date(),
): Promise<Uint8Array> {
  const pages = layout(doc, measurer(assets.fonts));
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts = {} as Record<FontKey, PDFFont>;
  for (const key of Object.keys(assets.fonts) as FontKey[]) {
    fonts[key] = await pdf.embedFont(assets.fonts[key], { subset: true, features: FEATURES });
  }
  const photo = await pdf.embedJpg(assets.photo);

  for (const p of pages) {
    const page = pdf.addPage([PAGE.w, PAGE.h]);
    const y = (top: number) => PAGE.h - top;
    for (const it of p.items) {
      if (it.t === 'rect') {
        page.drawRectangle({
          x: it.x,
          y: y(it.y + it.h),
          width: it.w,
          height: it.h,
          color: color(it.color),
        });
      } else if (it.t === 'image') {
        page.drawImage(photo, { x: it.x, y: y(it.y + it.h), width: it.w, height: it.h });
      } else if (it.t === 'text') {
        page.drawText(it.text, {
          x: it.x,
          y: y(it.y),
          size: it.size,
          font: fonts[it.font],
          color: color(it.color),
        });
      } else {
        const annot = pdf.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [it.x, y(it.y + it.h), it.x + it.w, y(it.y)],
          Border: [0, 0, 0],
          Contents: PDFString.of(it.url.replace(/^mailto:/, '')),
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(it.url) },
        });
        page.node.addAnnot(pdf.context.register(annot));
      }
    }
  }

  pdf.setTitle(`${doc.name} · CV`, { showInWindowTitleBar: true });
  pdf.setAuthor(doc.name);
  pdf.setSubject(`${doc.role}. ${doc.headline}`);
  pdf.setKeywords(doc.skills.flatMap((g) => g.items.split(', ')));
  pdf.setLanguage(doc.lang);
  pdf.setCreator('nikolay-georgiev.dev');
  pdf.setProducer('pdf-lib');
  pdf.setCreationDate(date);
  pdf.setModificationDate(date);
  // Readers show the pages one under another.
  pdf.catalog.set(PDFName.of('PageLayout'), PDFName.of('OneColumn'));
  return pdf.save();
}
