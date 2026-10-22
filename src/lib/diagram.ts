import { LOCALES, type L } from '@/i18n';
import { diagram as ui } from '@/i18n/ui/diagram';

/**
 * Architecture diagrams are data. Every node must correspond to something that
 * exists in the project's source (planned parts are drawn dashed and labelled).
 * Text is written once per language (L); the geometry is shared, so every
 * language must fit the same boxes (checked by diagramProblems below).
 */
export type NodeKind =
  | 'client'
  | 'gateway'
  | 'service'
  | 'worker'
  | 'store'
  | 'queue'
  | 'external'
  | 'hardware'
  | 'firmware'
  | 'stage'
  | 'model';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface DiagramNode {
  id: string;
  label: L;
  /**
   * Detail under the label. Use "\n" for a manual break (max two lines); a
   * break right after a hyphen ("server-to-\nserver") is rejoined in the list.
   */
  sub?: L;
  kind: NodeKind;
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
  emphasis?: boolean;
  planned?: boolean;
  /** Overrides the kind tag, e.g. "Built, not live". */
  tag?: L;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: L;
  fromSide?: Side;
  toSide?: Side;
  /** Shift the anchor along the side, in SVG units (positive = right/down). */
  fromOffset?: number;
  toOffset?: number;
  dashed?: boolean;
  both?: boolean;
  /** Animate a packet along this edge. */
  flow?: boolean;
}

export interface DiagramGroup {
  label: L;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface Diagram {
  id: string;
  title: L;
  caption: L;
  cols: number;
  rows: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  /** Named tiers for the text list (narrow figures, screen readers); every node once. */
  tiers: { label: L; nodes: string[] }[];
}

/** The tag above a node's label: its own, else "Planned" when planned, else its kind. */
export const tagOf = (n: DiagramNode): L => n.tag ?? (n.planned ? ui.planned : ui.kind[n.kind]);

/** The drawn lines of a sub. */
export const subLines = (text: string | undefined): string[] => (text ? text.split('\n') : []);

/**
 * Grid and type, in SVG units. Five columns is the widest layout that keeps
 * every text role at 9px or more in the 1366px case-study column (scale ~0.9);
 * the component switches to the text list before the scale drops further.
 */
export const MAX_COLS = 5;
export const CELL_W = 200;
export const CELL_H = 120;
export const PAD_X = 10;
export const PAD_Y = 15;
/** Text inset from the left edge of a node box. */
export const TEXT_X = 11;
export const TYPE = { tag: 10.5, label: 14, sub: 12, edge: 11, group: 10.5 } as const;
/** Martian Mono advance (0.7em, Latin and Cyrillic) plus the 0.14em label tracking used on tags. */
export const MONO_EM = 0.7;
export const TAG_EM = MONO_EM + 0.14;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function nodeBox(n: Pick<DiagramNode, 'col' | 'row' | 'colSpan' | 'rowSpan'>): Box {
  const x = n.col * CELL_W + PAD_X;
  const y = n.row * CELL_H + PAD_Y;
  return {
    x,
    y,
    w: (n.colSpan ?? 1) * CELL_W - PAD_X * 2,
    h: (n.rowSpan ?? 1) * CELL_H - PAD_Y * 2,
  };
}

/** Edge label pill (mono) and group label (mono, tracked, drawn in capitals). */
export const edgeLabelW = (text: string) => text.length * TYPE.edge * MONO_EM + 12;
export const groupLabelW = (text: string) => text.length * TYPE.group * TAG_EM;

/*
 * Advance widths in 1/1000 em, measured in Chromium from the shipped woff2
 * files at the node settings: label = Hubot Sans / TikTok Sans 620 at 104%
 * width, sub = Mona Sans / TikTok Sans 460. Latin comes from the Latin face,
 * Cyrillic from TikTok Sans with the Bulgarian (locl) forms, as <html
 * lang="bg"> renders them. Re-measure if a face or a node setting changes.
 */
const GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~µ×°·–—’“”„…²\u00a0' +
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяёЁ№';
const ADVANCE: Record<'label' | 'sub', readonly number[]> = {
  label: [
    179, 235, 390, 693, 710, 862, 764, 186, 338, 338, 307, 659, 227, 382, 227, 484, 705, 413, 639,
    643, 700, 650, 677, 639, 666, 677, 227, 227, 659, 659, 659, 543, 876, 815, 732, 791, 773, 670,
    655, 810, 806, 624, 432, 770, 624, 964, 800, 821, 703, 821, 749, 700, 710, 774, 814, 1076, 821,
    771, 703, 360, 483, 360, 659, 377, 329, 644, 644, 614, 644, 624, 369, 633, 634, 246, 246, 642,
    246, 1012, 634, 636, 644, 644, 391, 561, 406, 634, 643, 890, 655, 638, 542, 421, 306, 421, 645,
    576, 659, 396, 227, 523, 704, 227, 442, 442, 442, 680, 412, 179, 731, 673, 699, 557, 824, 610,
    1053, 670, 774, 774, 719, 730, 937, 776, 826, 756, 679, 755, 630, 698, 940, 749, 790, 691, 1032,
    1070, 826, 958, 671, 751, 1081, 712, 592, 642, 638, 538, 644, 608, 895, 582, 619, 619, 616, 568,
    813, 628, 641, 620, 649, 570, 913, 593, 832, 597, 651, 591, 913, 945, 709, 826, 608, 562, 857,
    598, 608, 610, 1005,
  ],
  sub: [
    226, 249, 382, 656, 659, 849, 779, 189, 344, 344, 310, 600, 202, 399, 193, 403, 615, 374, 555,
    578, 625, 590, 613, 560, 596, 613, 193, 202, 600, 600, 600, 535, 917, 711, 697, 771, 747, 625,
    614, 811, 782, 261, 401, 686, 558, 898, 774, 807, 661, 832, 710, 650, 615, 730, 718, 986, 717,
    681, 627, 362, 390, 362, 600, 461, 238, 615, 615, 565, 615, 545, 300, 597, 606, 241, 241, 564,
    241, 964, 606, 596, 615, 615, 374, 514, 337, 607, 534, 729, 567, 532, 507, 397, 278, 397, 600,
    576, 600, 472, 209, 513, 678, 202, 377, 377, 377, 633, 377, 226, 690, 638, 659, 530, 790, 578,
    990, 640, 727, 727, 671, 689, 882, 733, 790, 712, 642, 723, 603, 653, 892, 705, 744, 653, 984,
    1019, 790, 892, 635, 719, 1020, 673, 559, 612, 597, 506, 616, 581, 833, 536, 588, 588, 576, 527,
    758, 591, 609, 588, 621, 539, 869, 551, 787, 552, 609, 552, 869, 891, 669, 769, 577, 532, 802,
    560, 581, 578, 954,
  ],
};
if (ADVANCE.label.length !== GLYPHS.length || ADVANCE.sub.length !== GLYPHS.length) {
  throw new Error('src/lib/diagram.ts: GLYPHS and ADVANCE are out of step');
}
/** Letter spacing of each face, in em (the label's -0.005em). */
const TRACKING = { label: -0.005, sub: 0 } as const;

/**
 * Rendered width in em of a node label or a sub line. Kerning is ignored,
 * which errs slightly wide; an unmeasured character counts as 1em.
 */
export function textEm(text: string, face: 'label' | 'sub'): number {
  let em = 0;
  for (const c of text) em += (ADVANCE[face][GLYPHS.indexOf(c)] ?? 1000) / 1000 + TRACKING[face];
  return em;
}

function anchor(b: Box, side: Side, offset = 0): [number, number] {
  switch (side) {
    case 'top':
      return [b.x + b.w / 2 + offset, b.y];
    case 'bottom':
      return [b.x + b.w / 2 + offset, b.y + b.h];
    case 'left':
      return [b.x, b.y + b.h / 2 + offset];
    case 'right':
      return [b.x + b.w, b.y + b.h / 2 + offset];
  }
}

function autoSides(a: Box, b: Box): [Side, Side] {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const dx = bcx - acx;
  const dy = bcy - acy;
  const verticalGap = dy > 0 ? b.y - (a.y + a.h) : a.y - (b.y + b.h);
  if (verticalGap > 0 && Math.abs(dy) >= Math.abs(dx) * 0.35) {
    return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
  }
  return dx > 0 ? ['right', 'left'] : ['left', 'right'];
}

const HEAD_L = 7;
const HEAD_W = 3.5;
const OUTWARD: Record<Side, [number, number]> = {
  top: [0, -1],
  bottom: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** An open arrowhead whose tip touches the node border on `side`. */
function arrowHead([x, y]: [number, number], side: Side): string {
  const [dx, dy] = OUTWARD[side];
  const bx = x + dx * HEAD_L;
  const by = y + dy * HEAD_L;
  return `M${bx + dy * HEAD_W} ${by + dx * HEAD_W}L${x} ${y}L${bx - dy * HEAD_W} ${by - dx * HEAD_W}`;
}

export interface RoutedEdge extends DiagramEdge {
  d: string;
  /** The corners of the route, from the source anchor to the target anchor. */
  pts: [number, number][];
  /** Arrowheads as their own path (not markers), so a build can stage them. */
  head: string;
  labelAt: [number, number];
  /** Sum of the orthogonal segments, in SVG units. */
  length: number;
}

/** Orthogonal elbow routing between two node boxes. */
export function routeEdge(edge: DiagramEdge, a: Box, b: Box): RoutedEdge {
  const [autoFrom, autoTo] = autoSides(a, b);
  const fromSide = edge.fromSide ?? autoFrom;
  const toSide = edge.toSide ?? autoTo;
  const [x1, y1] = anchor(a, fromSide, edge.fromOffset);
  const [x2, y2] = anchor(b, toSide, edge.toOffset);
  const vertical = (s: Side) => s === 'top' || s === 'bottom';

  let pts: [number, number][];
  let labelAt: [number, number];
  if (vertical(fromSide) && vertical(toSide)) {
    const my = (y1 + y2) / 2;
    pts =
      x1 === x2
        ? [
            [x1, y1],
            [x2, y2],
          ]
        : [
            [x1, y1],
            [x1, my],
            [x2, my],
            [x2, y2],
          ];
    labelAt = [x1 === x2 ? x1 : (x1 + x2) / 2, my];
  } else if (!vertical(fromSide) && !vertical(toSide)) {
    const mx = (x1 + x2) / 2;
    pts =
      y1 === y2
        ? [
            [x1, y1],
            [x2, y2],
          ]
        : [
            [x1, y1],
            [mx, y1],
            [mx, y2],
            [x2, y2],
          ];
    labelAt = [mx, y1 === y2 ? y1 : (y1 + y2) / 2];
  } else if (vertical(fromSide)) {
    pts = [
      [x1, y1],
      [x1, y2],
      [x2, y2],
    ];
    labelAt = [x1, (y1 + y2) / 2];
  } else {
    pts = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
    ];
    labelAt = [(x1 + x2) / 2, y1];
  }

  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  // Every route is a monotone elbow through midpoints, so its length is the
  // Manhattan distance between the two anchors.
  const length = Math.abs(x2 - x1) + Math.abs(y2 - y1);
  const head = arrowHead([x2, y2], toSide) + (edge.both ? arrowHead([x1, y1], fromSide) : '');
  return { ...edge, fromSide, toSide, d, pts, head, labelAt, length };
}

/** Two boxes overlap (a segment is a box with no width or no height). */
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Authoring guard for every language: SVG text does not wrap, so text that
 * would overflow its box, or a label that would sit on another part of the
 * drawing, is reported. The data module fails the build on any problem.
 */
export function diagramProblems(d: Diagram): string[] {
  const problems: string[] = [];
  const report = (msg: string) => problems.push(`diagram "${d.id}": ${msg}`);
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  if (d.cols > MAX_COLS) report(`${d.cols} columns: text drops below 9px at 1366px`);
  for (const n of d.nodes) {
    if (!d.tiers.some((t) => t.nodes.includes(n.id))) report(`"${n.id}" is missing from the tiers`);
  }
  const edges = d.edges.flatMap((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) {
      report(`edge ${e.from} → ${e.to} names an unknown node`);
      return [];
    }
    return [routeEdge(e, nodeBox(a), nodeBox(b))];
  });
  const segments = (e: RoutedEdge): Box[] =>
    e.pts.slice(1).map(([x2, y2], i) => {
      const [x1, y1] = e.pts[i] ?? [x2, y2];
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
      };
    });

  for (const locale of LOCALES) {
    for (const n of d.nodes) {
      const room = nodeBox(n).w - TEXT_X - 6; // left inset, at least 6 units clear on the right
      const fit = (what: string, text: string, w: number) => {
        if (w > room) {
          report(
            `[${locale}] node "${n.id}" ${what} "${text}" overflows by ${Math.ceil(w - room)} (${Math.round(w)}/${room})`,
          );
        }
      };
      const tag = tagOf(n)[locale];
      fit('tag', tag, tag.length * TYPE.tag * TAG_EM);
      fit('label', n.label[locale], textEm(n.label[locale], 'label') * TYPE.label);
      const lines = subLines(n.sub?.[locale]);
      if (lines.length > 2)
        report(`[${locale}] node "${n.id}" sub has ${lines.length} lines (max 2)`);
      for (const line of lines) fit('sub line', line, textEm(line, 'sub') * TYPE.sub);
    }

    // Group labels sit in a mask on the frame's top edge.
    const masks = (d.groups ?? []).map((g) => {
      const label = g.label[locale].toUpperCase();
      const mask = {
        x: g.col * CELL_W + 9,
        y: g.row * CELL_H - 3,
        w: groupLabelW(label) + 8,
        h: 12,
      };
      const over = mask.x + mask.w - (g.col * CELL_W + g.colSpan * CELL_W - 10);
      if (over > 0)
        report(`[${locale}] group "${label}" overflows its frame by ${Math.ceil(over)}`);
      for (const e of edges) {
        if (segments(e).some((s) => overlaps(mask, s))) {
          report(`[${locale}] group "${label}" is crossed by edge ${e.from} → ${e.to}`);
        }
      }
      return { what: `group "${label}"`, box: mask };
    });

    // Edge label pills: clear of every node, every other edge and each other.
    const pills = edges.flatMap((e) => {
      const text = e.label?.[locale];
      if (!text) return [];
      const w = edgeLabelW(text);
      const [x, y] = e.labelAt;
      return [{ e, text, box: { x: x - w / 2, y: y - 8.5, w, h: 17 } }];
    });
    for (const [i, p] of pills.entries()) {
      const at = `[${locale}] edge label "${p.text}" (${p.e.from} → ${p.e.to})`;
      // On a horizontal run the pill must not hide the run's corners or head.
      const [x, y] = p.e.labelAt;
      const run = segments(p.e).find((s) => s.h === 0 && s.y === y && s.x <= x && x <= s.x + s.w);
      if (run && p.box.w > run.w) {
        report(`${at} is wider than its line by ${Math.ceil(p.box.w - run.w)}`);
      }
      for (const n of d.nodes) {
        if (overlaps(p.box, nodeBox(n))) report(`${at} covers node "${n.id}"`);
      }
      for (const e of edges) {
        if (e !== p.e && segments(e).some((s) => overlaps(p.box, s))) {
          report(`${at} covers edge ${e.from} → ${e.to}`);
        }
      }
      for (const q of [
        ...pills.slice(i + 1),
        ...masks.map((m) => ({ text: m.what, box: m.box })),
      ]) {
        if (overlaps(p.box, q.box)) report(`${at} overlaps ${q.text}`);
      }
    }
  }
  return problems;
}
