import type { CvDoc } from './doc';

/**
 * The CV's one design, as a pure function: CvDoc in, positioned pages out.
 * The preview (SVG, at build time) and the PDF (pdf-lib, in the browser and
 * at build time) both draw these pages, so what you see is what you get.
 * Units are PDF points, origin top left; the page is A4.
 */

export const PAGE = { w: 595.28, h: 841.89 } as const;
export type FontKey = 'regular' | 'semibold' | 'bold';

/** Advance width of `text` in points. Kerning and ligatures are off on every surface. */
export type Measure = (font: FontKey, size: number, text: string) => number;

export type Item =
  | {
      t: 'text';
      x: number;
      y: number;
      text: string;
      font: FontKey;
      size: number;
      color: string;
    }
  | { t: 'rect'; x: number; y: number; w: number; h: number; color: string }
  | { t: 'image'; x: number; y: number; w: number; h: number }
  | { t: 'link'; x: number; y: number; w: number; h: number; url: string };

export interface Page {
  items: Item[];
}

const C = {
  ink: '#15181d',
  body: '#33383f',
  muted: '#646b75',
  rule: '#d3d8de',
  accent: '#c2412f',
  side: '#1b1f26',
  sideText: '#ece8e0',
  sideSoft: '#c3cbd4',
  sideLabel: '#9fb0c2',
  sideRule: '#3a414b',
};

const SIDE = { w: 186, x: 22 } as const;
const MAIN = { x: 212, right: PAGE.w - 34 } as const;
const TOP = 38;
const BOTTOM = PAGE.h - 46;
const PHOTO = { w: 104, h: 130 } as const;
/** TikTok Sans cap height (705/1000), to centre text in its line box. */
const CAP = 0.705;

interface Run {
  text: string;
  font: FontKey;
  size: number;
  color: string;
  url?: string | undefined;
}

/** Items laid out from y 0 down; `h` is the height they take. */
interface Block {
  items: Item[];
  h: number;
  /** Never ends a page: section headings stay with what follows. */
  keep?: boolean;
  /** Space at the end that may run past the bottom margin (the gap before the next entry). */
  tail?: number;
}

const shift = (items: Item[], dy: number): Item[] => items.map((i) => ({ ...i, y: i.y + dy }));

export function layout(doc: CvDoc, measure: Measure): Page[] {
  /** Wraps runs into lines of `width`, greedy at ordinary spaces (never at a no-break space). */
  function para(runs: Run[], x: number, width: number, lh: number, top = 0): Block {
    type Seg = { run: Run; text: string };
    const lines: Seg[][] = [[]];
    let used = 0;
    for (const run of runs) {
      for (const token of run.text.split(/(?<= )/)) {
        const word = token.trimEnd();
        const w = measure(run.font, run.size, word);
        const line = lines[lines.length - 1]!;
        if (used > 0 && used + w > width) {
          const last = line[line.length - 1];
          if (last) last.text = last.text.trimEnd();
          lines.push([{ run, text: token }]);
          used = measure(run.font, run.size, token);
        } else {
          const prev = line[line.length - 1];
          if (prev && prev.run === run) prev.text += token;
          else line.push({ run, text: token });
          used += measure(run.font, run.size, token);
        }
      }
    }
    const items: Item[] = [];
    lines.forEach((line, i) => {
      let cx = x;
      for (const [k, seg] of line.entries()) {
        const text =
          i === lines.length - 1 && k === line.length - 1 ? seg.text.trimEnd() : seg.text;
        if (!text) continue;
        const { font, size, color, url } = seg.run;
        const y = top + i * lh + lh / 2 + (CAP * size) / 2;
        const w = measure(font, size, text);
        items.push({ t: 'text', x: cx, y, text, font, size, color });
        if (url) {
          const lw = measure(font, size, text.trimEnd());
          items.push({ t: 'link', x: cx, y: y - size * 0.85, w: lw, h: size * 1.15, url });
        }
        cx += w;
      }
    });
    return { items, h: lines.length * lh };
  }

  const join = (blocks: Block[], gap = 0): Block => {
    const items: Item[] = [];
    let h = 0;
    blocks.forEach((b, i) => {
      if (i) h += gap;
      items.push(...shift(b.items, h));
      h += b.h;
    });
    return { items, h };
  };
  const space = (h: number): Block => ({ items: [], h });

  // ---------- main column ----------
  const mw = MAIN.right - MAIN.x;
  const body = (text: string, x: number = MAIN.x, w = mw): Block =>
    para([{ text, font: 'regular', size: 8.7, color: C.body }], x, w, 12);

  // Section titles are plain words, not letter-spaced capitals: spaced
  // letters come out of text extraction as "P R O F I L E".
  const heading = (text: string): Block => {
    const size = 10.5;
    const tw = measure('semibold', size, text);
    const y = 14 + (CAP * size) / 2;
    return {
      keep: true,
      h: 24,
      items: [
        { t: 'rect', x: MAIN.x, y: y - CAP * size + 1, w: 3.6, h: 3.6, color: C.accent },
        { t: 'text', x: MAIN.x + 9, y, text, font: 'semibold', size, color: C.ink },
        {
          t: 'rect',
          x: MAIN.x + 9 + tw + 6,
          y: y - (CAP * size) / 2,
          w: MAIN.right - (MAIN.x + 9 + tw + 6),
          h: 0.6,
          color: C.rule,
        },
      ],
    };
  };

  const bullets = (points: string[]): Block =>
    join(
      points.map((p) => {
        const b = body(p, MAIN.x + 10, mw - 10);
        const y = 12 / 2 - 1.3;
        return {
          h: b.h,
          items: [{ t: 'rect', x: MAIN.x + 1.5, y, w: 2.6, h: 2.6, color: C.muted }, ...b.items],
        };
      }),
      1.5,
    );

  const entry = (e: CvDoc['experience'][number] & { stack?: string }): Block => {
    const metaSize = 7.8;
    const metaW = measure('regular', metaSize, e.meta);
    const title = para(
      [{ text: e.title, font: 'semibold', size: 9.8, color: C.ink }],
      MAIN.x,
      mw - metaW - 12,
      13.5,
    );
    const meta: Item = {
      t: 'text',
      x: MAIN.right - metaW,
      y: 13.5 / 2 + (CAP * 9.8) / 2,
      text: e.meta,
      font: 'regular',
      size: metaSize,
      color: C.muted,
    };
    const parts: Block[] = [
      { items: [...title.items, meta], h: title.h },
      para([{ text: e.sub, font: 'regular', size: 8.4, color: C.accent }], MAIN.x, mw, 11.5),
      space(2.5),
    ];
    if (e.lead) parts.push(body(e.lead), space(1.5));
    if (e.points.length) parts.push(bullets(e.points));
    if (e.stack) {
      parts.push(
        space(2),
        para(
          [
            { text: `${doc.labels.stack}: `, font: 'semibold', size: 7.9, color: C.muted },
            { text: e.stack, font: 'regular', size: 7.9, color: C.muted },
          ],
          MAIN.x,
          mw,
          10.5,
        ),
      );
    }
    return { ...join([...parts, space(9)]), tail: 9 };
  };

  const header = join([
    para([{ text: doc.name, font: 'bold', size: 25, color: C.ink }], MAIN.x, mw, 28),
    space(3),
    para([{ text: doc.role, font: 'semibold', size: 11.5, color: C.accent }], MAIN.x, mw, 15),
    space(2),
    para([{ text: doc.headline, font: 'regular', size: 8.6, color: C.muted }], MAIN.x, mw, 11.5),
    space(4),
  ]);

  const main: Block[] = [
    header,
    heading(doc.labels.summary),
    join([body(doc.summary), space(6)]),
    heading(doc.labels.experience),
    ...doc.experience.map(entry),
    // Education is short: before the projects it closes page one instead of trailing page two.
    heading(doc.labels.education),
    ...doc.education.map((e) =>
      join([
        para([{ text: e.title, font: 'semibold', size: 9.4, color: C.ink }], MAIN.x, mw, 12.5),
        para(
          [{ text: `${e.org} · ${e.period}`, font: 'regular', size: 8.4, color: C.muted }],
          MAIN.x,
          mw,
          11.5,
        ),
        space(6),
      ]),
    ),
    space(4),
    heading(doc.labels.projects),
    ...doc.projects.map(entry),
  ];

  // ---------- sidebar ----------
  const sw = SIDE.w - SIDE.x * 2;
  const sideHeading = (text: string): Block => {
    const size = 9.2;
    const y = 12 + (CAP * size) / 2;
    return {
      keep: true,
      h: 23,
      items: [
        { t: 'text', x: SIDE.x, y, text, font: 'semibold', size, color: C.sideLabel },
        { t: 'rect', x: SIDE.x, y: y + 5, w: sw, h: 0.6, color: C.sideRule },
      ],
    };
  };
  const sideText = (runs: Run[], gap = 4): Block =>
    join([para(runs, SIDE.x, sw, 11.2), space(gap)]);

  const side: Block[] = [
    {
      h: PHOTO.h + 10,
      items: [
        { t: 'image', x: SIDE.x, y: 0, w: PHOTO.w, h: PHOTO.h },
        { t: 'rect', x: SIDE.x, y: PHOTO.h + 5, w: 18, h: 1.6, color: C.accent },
      ],
    },
    sideHeading(doc.labels.contact),
    ...doc.contact.map((c) =>
      sideText([
        {
          text: c.text,
          font: 'regular',
          size: 8,
          color: c.url ? C.sideText : C.sideSoft,
          url: c.url,
        },
      ]),
    ),
    space(4),
    sideHeading(doc.labels.skills),
    ...doc.skills.map((g) =>
      join([
        para([{ text: g.label, font: 'semibold', size: 8, color: C.sideText }], SIDE.x, sw, 11.2),
        sideText([{ text: g.items, font: 'regular', size: 7.9, color: C.sideSoft }], 5),
      ]),
    ),
    space(4),
    sideHeading(doc.labels.languages),
    ...doc.languages.map((x) =>
      join([
        para([{ text: x.name, font: 'semibold', size: 8, color: C.sideText }], SIDE.x, sw, 11.2),
        sideText([{ text: x.level, font: 'regular', size: 7.9, color: C.sideSoft }], 3),
      ]),
    ),
    space(6),
    sideHeading(doc.labels.certificates),
    ...doc.certificates.map((c) =>
      join([
        para([{ text: c.title, font: 'semibold', size: 8, color: C.sideText }], SIDE.x, sw, 11.2),
        sideText([{ text: c.org, font: 'regular', size: 7.9, color: C.sideSoft }]),
      ]),
    ),
  ];

  // ---------- pagination ----------
  /** Places blocks top to bottom; a block that does not fit (with its kept neighbours) opens a page. */
  const flow = (blocks: Block[]): Item[][] => {
    const pages: Item[][] = [[]];
    let y = TOP;
    for (let i = 0; i < blocks.length; i++) {
      let need = blocks[i]!.h;
      let last = i;
      for (; blocks[last]?.keep && blocks[last + 1]; last++) need += blocks[last + 1]!.h;
      if (y + need - (blocks[last]!.tail ?? 0) > BOTTOM && y > TOP) {
        pages.push([]);
        y = TOP;
      }
      pages[pages.length - 1]!.push(...shift(blocks[i]!.items, y));
      y += blocks[i]!.h;
    }
    return pages;
  };

  const mainPages = flow(main);
  const sidePages = flow(side);
  const count = Math.max(mainPages.length, sidePages.length);
  return Array.from({ length: count }, (_, p) => {
    const items: Item[] = [{ t: 'rect', x: 0, y: 0, w: SIDE.w, h: PAGE.h, color: C.side }];
    const sideItems = sidePages[p] ?? [];
    // The photo first: it is an image, not text, so it does not affect reading order.
    items.push(...sideItems.filter((i) => i.t !== 'text' && i.t !== 'link'));
    items.push(...(mainPages[p] ?? []));
    items.push(...sideItems.filter((i) => i.t === 'text' || i.t === 'link'));
    // Footer: where the case studies are (a link on every page) and the page number.
    const size = 7.2;
    const y = PAGE.h - 24;
    const more = doc.labels.more;
    const mw = measure('regular', size, more);
    items.push(
      { t: 'text', x: MAIN.x, y, text: more, font: 'regular', size, color: C.muted },
      { t: 'link', x: MAIN.x, y: y - size * 0.85, w: mw, h: size * 1.15, url: doc.work },
    );
    if (count > 1) {
      const label = `${doc.labels.page} ${p + 1} / ${count}`;
      const x = MAIN.right - measure('regular', size, label);
      items.push({ t: 'text', x, y, text: label, font: 'regular', size, color: C.muted });
    }
    return { items };
  });
}
