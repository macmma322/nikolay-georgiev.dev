import { aliases, gaps, practices } from '@/data/skills';
import { tech, techName, type TechCategory } from '@/data/tech';
import type { Locale } from '@/i18n';
import type { Project } from '@/lib/projects';
import type { Status, Term } from './match';

/**
 * The matcher's terms in one language, resolved at build time so the browser
 * gets plain JSON: every technology in tech.ts (evidence: the case studies
 * whose stack or proof names it), the practices and the gaps in skills.ts.
 */

const GROUP: Partial<Record<TechCategory, string>> = {
  frontend: 'frontend',
  backend: 'backend',
  realtime: 'realtime',
  ai: 'ai',
  embedded: 'systems',
  systems: 'systems',
  game: 'systems',
  infra: 'delivery',
  product: 'delivery',
};

/** Where a practice goes when a job asks for it and the CV did not list it. */
const PRACTICE_GROUP: Record<string, string> = {
  rest: 'backend',
  auth: 'backend',
  sql: 'backend',
  security: 'backend',
  payments: 'backend',
  a11y: 'frontend',
  responsive: 'frontend',
  testing: 'delivery',
  cicd: 'delivery',
  debugging: 'delivery',
  realtime: 'realtime',
  llm: 'ai',
  speech: 'ai',
};

/** Work without a case study of its own: this site, or everything. */
const NO_CASE_STUDY: Record<string, { en: string; bg: string }> = {
  astro: { en: 'This site.', bg: 'Този сайт.' },
  css: { en: 'Every web project, and this site.', bg: 'Всеки уеб проект и този сайт.' },
  git: { en: 'Every project.', bg: 'Всеки проект.' },
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function taxonomy(locale: Locale, projects: Project[]): Term[] {
  const name = (slug: string) => projects.find((p) => p.id === slug)?.data.name ?? slug;
  const list = (slugs: string[]) => slugs.map(name).join(', ');
  const used = { en: 'Used in', bg: 'Използвано в' }[locale];

  const techTerms: Term[] = tech.map((t) => {
    const slugs = [
      ...new Set([
        ...t.proof,
        ...projects.filter((p) => p.data.stack.includes(t.id)).map((p) => p.id),
      ]),
    ];
    const alias = aliases[t.id];
    const status: Status =
      alias?.status ??
      (t.level === 'planned' ? 'missing' : t.level === 'learning' ? 'learning' : 'verified');
    const evidence = alias?.note
      ? alias.note[locale]
      : t.level === 'planned'
        ? { en: 'Planned next; not used yet.', bg: 'Предстои; все още не е използван.' }[locale]
        : slugs.length
          ? `${used} ${list(slugs)}.`
          : (NO_CASE_STUDY[t.id]?.[locale] ?? '');
    return {
      id: t.id,
      name: techName(t, locale),
      status,
      evidence,
      projects: slugs,
      patterns: alias?.only ? alias.match : [escape(t.name), ...(alias?.match ?? [])],
      ...(alias?.cs ? { cs: true } : {}),
      ...(status === 'verified' && GROUP[t.category] ? { group: GROUP[t.category] } : {}),
    };
  });

  const practiceTerms: Term[] = practices.map((p) => ({
    id: p.id,
    name: p.name[locale],
    status: p.status,
    evidence: p.evidence[locale],
    projects: p.projects ?? [],
    patterns: p.match,
    ...(p.cs ? { cs: true } : {}),
    ...(PRACTICE_GROUP[p.id] ? { group: PRACTICE_GROUP[p.id] } : {}),
  }));

  const notShown = { en: 'Not demonstrated.', bg: 'Не е демонстрирано.' }[locale];
  const gapTerms: Term[] = gaps.map((g) => ({
    id: g.id,
    name: g.name,
    status: g.related ? 'related' : 'missing',
    evidence: g.note?.[locale] ?? notShown,
    projects: [],
    patterns: g.match,
    ...(g.cs ? { cs: true } : {}),
    ...(g.related ? { related: g.related } : {}),
  }));

  return [...techTerms, ...practiceTerms, ...gapTerms];
}
