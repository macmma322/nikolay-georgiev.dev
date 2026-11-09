// PDF and DOCX from the document model. A PDF depends only on the model and the
// version's own timestamp, so re-rendering it gives identical bytes.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { draftMark, type DocumentModel } from './render.ts';

export const RENDERER_VERSION = '1';

const require = createRequire(import.meta.url);
const fontDir = dirname(require.resolve('@expo-google-fonts/noto-serif/package.json'));
const fontFile = (weight: string) => readFile(join(fontDir, weight, `NotoSerif_${weight}.ttf`));

type Options = { draft: boolean; timestamp: Date; pageNumbers: boolean };

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { top: 70, bottom: 70, left: 71, right: 62 };
const WIDTH = A4.width - MARGIN.left - MARGIN.right;

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const source of text.split(/\r?\n/)) {
    let line = '';
    for (const raw of source.split(/\s+/).filter(Boolean)) {
      // A single token wider than the line (a long URL) is broken by characters.
      let word = raw;
      while (font.widthOfTextAtSize(word, size) > width) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut -= 1;
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export async function renderPdf(model: DocumentModel, options: Options): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    pdf.embedFont(await fontFile('400Regular'), { subset: true }),
    pdf.embedFont(await fontFile('700Bold'), { subset: true }),
  ]);
  pdf.setTitle(model.title);
  pdf.setCreator('Contract Studio');
  pdf.setProducer('Contract Studio');
  pdf.setCreationDate(options.timestamp);
  pdf.setModificationDate(options.timestamp);

  let page: PDFPage = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN.top;
  const ink = rgb(0.08, 0.08, 0.1);
  const nextPage = () => {
    page = pdf.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN.top;
  };
  const room = (height: number) => {
    if (y - height < MARGIN.bottom) nextPage();
  };
  const print = (text: string, x: number, font: PDFFont, size: number) =>
    page.drawText(text, { x, y: y - size, size, font, color: ink });

  const paragraph = (
    text: string,
    { font = regular, size = 10.5, indent = 0, center = false, after = 7, lead = '' } = {},
  ) => {
    const leadWidth = lead ? bold.widthOfTextAtSize(`${lead} `, size) : 0;
    const lineHeight = size * 1.42;
    const lines = wrap(text, font, size, WIDTH - indent - leadWidth);
    lines.forEach((line, index) => {
      room(lineHeight);
      if (lead && index === 0) print(lead, MARGIN.left + indent, bold, size);
      const x = center
        ? MARGIN.left + (WIDTH - font.widthOfTextAtSize(line, size)) / 2
        : MARGIN.left + indent + leadWidth;
      print(line, x, font, size);
      y -= lineHeight;
    });
    y -= after;
  };

  for (const block of model.blocks) {
    switch (block.t) {
      case 'title':
        paragraph(block.text, { font: bold, size: 14, center: true, after: 6 });
        break;
      case 'meta':
        paragraph(block.text, { size: 9.5, center: true, after: 4 });
        break;
      case 'para':
        paragraph(block.text);
        break;
      case 'section':
        y -= 8;
        room(60); // keep a heading with the start of its first article
        paragraph(block.text, { font: bold, size: 11, center: true, after: 8 });
        break;
      case 'article':
        paragraph(block.text, { lead: block.label, after: block.items.length ? 3 : 7 });
        block.items.forEach((item, index) => {
          const letters =
            model.lang === 'bg' ? 'абвгдежзиклмнопрстуфхцчшщюя' : 'abcdefghijklmnopqrstuvwxyz';
          paragraph(item, { indent: 18, lead: `${letters[index % letters.length]})`, after: 3 });
        });
        if (block.items.length) y -= 4;
        break;
      case 'signatures': {
        y -= 24;
        room(90);
        const column = WIDTH / 2;
        [block.left, block.right].forEach(([role, name], index) => {
          const x = MARGIN.left + index * column;
          page.drawText(role, { x, y: y - 10, size: 10, font: bold, color: ink });
          page.drawLine({
            start: { x, y: y - 52 },
            end: { x: x + column - 24, y: y - 52 },
            thickness: 0.6,
            color: ink,
          });
          const label = wrap(name, regular, 9.5, column - 24)[0] ?? '';
          page.drawText(label, { x, y: y - 66, size: 9.5, font: regular, color: ink });
        });
        y -= 80;
        break;
      }
    }
  }

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    const size = 8.5;
    if (options.pageNumbers) {
      const label = `${index + 1} / ${pages.length}`;
      current.drawText(label, {
        x: A4.width - MARGIN.right - regular.widthOfTextAtSize(label, size),
        y: 36,
        size,
        font: regular,
        color: ink,
      });
    }
    if (options.draft) {
      current.drawText(draftMark(model.lang), {
        x: MARGIN.left,
        y: 36,
        size,
        font: bold,
        color: rgb(0.7, 0.12, 0.08),
      });
    }
  });
  return pdf.save({ useObjectStreams: false });
}

const FONT = 'Noto Serif';
const LIST_REF = 'contract-items';

export async function renderDocx(model: DocumentModel, options: Options): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [];
  let listInstance = 0;
  for (const block of model.blocks) {
    switch (block.t) {
      case 'title':
        children.push(
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: block.text, bold: true, size: 28 })],
          }),
        );
        break;
      case 'meta':
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: block.text, size: 19 })],
          }),
        );
        break;
      case 'para':
        children.push(
          new Paragraph({ spacing: { after: 140 }, children: [new TextRun(block.text)] }),
        );
        break;
      case 'section':
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 240, after: 140 },
            children: [new TextRun({ text: block.text, bold: true, size: 22 })],
          }),
        );
        break;
      case 'article':
        children.push(
          new Paragraph({
            spacing: { after: block.items.length ? 60 : 140 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: `${block.label} `, bold: true }),
              new TextRun(block.text),
            ],
          }),
        );
        listInstance += 1;
        for (const item of block.items) {
          children.push(
            new Paragraph({
              numbering: { reference: LIST_REF, level: 0, instance: listInstance },
              spacing: { after: 60 },
              children: [new TextRun(item)],
            }),
          );
        }
        break;
      case 'signatures':
        children.push(
          new Paragraph({ spacing: { before: 480 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: TableBorders.NONE,
            rows: [
              new TableRow({
                children: [block.left, block.right].map(
                  ([role, name]) =>
                    new TableCell({
                      borders: TableBorders.NONE,
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({ children: [new TextRun({ text: role, bold: true })] }),
                        new Paragraph({
                          spacing: { before: 720 },
                          children: [new TextRun('______________________')],
                        }),
                        new Paragraph({ children: [new TextRun(name)] }),
                      ],
                    }),
                ),
              }),
            ],
          }),
        );
        break;
    }
  }

  const footerParts: TextRun[] = [];
  if (options.draft)
    footerParts.push(new TextRun({ text: `${draftMark(model.lang)}    `, bold: true, size: 16 }));
  if (options.pageNumbers)
    footerParts.push(
      new TextRun({ children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: 16 }),
    );

  const document = new Document({
    title: model.title,
    creator: 'Contract Studio',
    lastModifiedBy: 'Contract Studio',
    description: '',
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 21,
            language: { value: model.lang === 'bg' ? 'bg-BG' : 'en-GB' },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: LIST_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.LOWER_LETTER,
              text: '%1)',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 500, hanging: 300 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1400, bottom: 1400, left: 1420, right: 1240 },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: footerParts })],
          }),
        },
        children,
      },
    ],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
