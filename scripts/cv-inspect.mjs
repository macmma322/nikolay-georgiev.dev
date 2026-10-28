// Inspects built CV PDFs with pdf.js: page count and size, metadata, fonts,
// links and the extracted text in reading order, and renders every page to a
// PNG for a visual check.
//   node scripts/cv-inspect.mjs dist/Nikolay-Georgiev-CV-EN.pdf [out-dir]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [file, out] = process.argv.slice(2);
if (!file) throw new Error('usage: node scripts/cv-inspect.mjs <file.pdf> [out-dir]');

const pdf = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
const { info } = await pdf.getMetadata();
console.log(`${file}: ${pdf.numPages} page(s)`);
console.log('metadata', JSON.stringify({ ...info, PDFFormatVersion: undefined }));

for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n);
  const [, , w, h] = page.view;
  console.log(`\n--- page ${n}: ${w} × ${h} pt (A4 is 595.28 × 841.89)`);
  const ops = await page.getOperatorList();
  const fonts = new Set();
  ops.fnArray.forEach((fn, i) => fn === OPS.setFont && fonts.add(ops.argsArray[i][0]));
  console.log('fonts', [...fonts].map((id) => page.commonObjs.get(id)?.name).join(', '));
  const links = (await page.getAnnotations()).filter((a) => a.subtype === 'Link');
  console.log('links', links.map((a) => a.url).join(' '));
  const text = await page.getTextContent();
  let line = '';
  let y;
  for (const item of text.items) {
    const iy = Math.round(item.transform[5]);
    if (y !== undefined && iy !== y) {
      console.log(line);
      line = '';
    }
    line += item.str;
    y = iy;
  }
  console.log(line);
  if (out) {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
    mkdirSync(out, { recursive: true });
    const png = join(out, `${basename(file, '.pdf')}-p${n}.png`);
    writeFileSync(png, canvas.toBuffer('image/png'));
    console.log('rendered', png);
  }
}
