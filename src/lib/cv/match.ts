import type { CvDoc } from './doc';

/**
 * Tailor CV to Job: a deterministic, explainable match between a pasted job
 * description and what the site can show. Runs in the browser; the text never
 * leaves the page. No score: a list of requirements, each with its status and
 * the evidence behind it.
 *
 * The taxonomy is resolved at build time (taxonomy.ts) from tech.ts,
 * skills.ts and the case studies, so this file holds only the logic.
 */

export type Status = 'verified' | 'related' | 'learning' | 'missing';

export interface Term {
  id: string;
  name: string;
  status: Status;
  /** Why the status holds: projects, or what is and is not there. */
  evidence: string;
  /** Case-study slugs that show it. */
  projects: string[];
  /** Regular-expression sources; any one counts. */
  patterns: string[];
  cs?: boolean;
  /** Skill group on the CV a verified term belongs to, when it is added. */
  group?: string;
  /** The verified skill this one is near (related terms). */
  related?: string;
}

export interface Found {
  term: Term;
  /** The words in the job description that matched. */
  quote: string;
  /** Where they start, so results read in the ad's order. */
  at: number;
}

// Letters and digits in any script count as word characters, so Cyrillic and
// Latin words both get real boundaries.
const BEFORE = '(?<![\\p{L}\\p{N}_+#])';
const AFTER = '(?![\\p{L}\\p{N}_+#])';
const compiled = new WeakMap<Term, RegExp>();

function regex(term: Term): RegExp {
  let re = compiled.get(term);
  if (!re) {
    re = new RegExp(`${BEFORE}(?:${term.patterns.join('|')})${AFTER}`, `gu${term.cs ? '' : 'i'}`);
    compiled.set(term, re);
  }
  re.lastIndex = 0;
  return re;
}

/** Every term the text asks for, once each, in the order the text first names them. */
export function analyze(text: string, terms: Term[]): Found[] {
  const clean = text.normalize('NFKC').replace(/\s+/g, ' ');
  const found: Found[] = [];
  for (const term of terms) {
    const m = regex(term).exec(clean);
    if (m) found.push({ term, quote: m[0], at: m.index });
  }
  return found.sort((a, b) => a.at - b.at);
}

/** The target whose groups the matched, verified skills fall into most. */
export function suggestTarget(found: Found[]): string {
  const weight: Record<string, number> = {};
  for (const { term } of found) {
    if (term.status !== 'verified' || !term.group) continue;
    weight[term.group] = (weight[term.group] ?? 0) + 1;
  }
  const g = (id: string) => weight[id] ?? 0;
  if (g('ai') >= 2 && g('ai') >= g('frontend') && g('ai') >= g('backend')) return 'ai';
  if (g('frontend') >= 2 && g('backend') >= 2) return 'fullstack';
  if (g('frontend') > g('backend')) return 'frontend';
  if (g('backend') > g('frontend')) return 'backend';
  return 'software';
}

/**
 * The CV aimed at this job: verified skills the ad names move to the front of
 * their group (and are added to it when the CV did not list them), groups
 * and projects with more matches move up. Nothing unverified is added and no
 * wording changes, so the CV stays as true as before.
 */
export function tailor(doc: CvDoc, found: Found[]): CvDoc {
  const verified = found.filter((f) => f.term.status === 'verified').map((f) => f.term);
  const ids = new Set(verified.map((t) => t.id));
  const hits = (list: { id: string }[]) => list.filter((x) => ids.has(x.id)).length;
  const listed = new Set(doc.skills.flatMap((g) => g.items.map((i) => i.id)));

  const skills = doc.skills
    .map((g) => {
      const extra = verified
        .filter((t) => t.group === g.id && !listed.has(t.id))
        .map((t) => ({ id: t.id, name: t.name }));
      const items = [...g.items, ...extra];
      return { ...g, items: stable(items, (i) => (ids.has(i.id) ? 0 : 1)) };
    })
    .map((g, i) => ({ g, i, n: hits(g.items) }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(({ g }) => g);

  const projectHits = (p: CvDoc['projects'][number]) =>
    hits(p.stack) + verified.filter((t) => t.projects.includes(p.slug)).length;
  const projects = doc.projects
    .map((p, i) => ({ p, i, n: projectHits(p) }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(({ p }) => p);

  return { ...doc, skills, projects };
}

const stable = <T>(list: T[], key: (x: T) => number) =>
  list
    .map((x, i) => ({ x, i, k: key(x) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(({ x }) => x);
