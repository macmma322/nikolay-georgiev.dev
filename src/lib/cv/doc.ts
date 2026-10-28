import { cv } from '@/data/cv';
import { certificates, education, roles } from '@/data/experience';
import { site } from '@/data/site';
import { practices } from '@/data/skills';
import { getTech, techName } from '@/data/tech';
import { LOCALE_META, resolve, type Locale } from '@/i18n';
import { monthYear } from '@/i18n/format';
import { seo } from '@/i18n/ui/seo';
import type { Project } from '@/lib/projects';
import { STATUS_LABEL } from '@/lib/status';

/**
 * The CV in one language and for one target role, as plain JSON: the page
 * embeds it, the browser lays it out and writes the PDF, and the build
 * renders the same layout as the preview and the ready-made files. See
 * src/data/cv.ts for what is CV-only.
 */
export interface CvDoc {
  locale: Locale;
  lang: string;
  target: string;
  name: string;
  role: string;
  /** The focus line under the role: the main stack, or the target's. */
  headline: string;
  summary: string;
  location: string;
  availability: string;
  contact: { text: string; url: string }[];
  skills: { id: string; label: string; items: { id: string; name: string }[] }[];
  languages: { name: string; level: string }[];
  certificates: { title: string; org: string }[];
  experience: Entry[];
  projects: (Entry & { slug: string; stack: { id: string; name: string }[] })[];
  education: { title: string; org: string; period: string }[];
  labels: { [K in keyof typeof cv.labels]: string };
  /** The case studies in this language. */
  work: string;
}

interface Entry {
  title: string;
  /** Employer (or "self-employed"), or the project's kicker. */
  sub: string;
  /** Right-hand meta: dates, and a project's status. */
  meta: string;
  lead?: string;
  points: string[];
}

export type Mode = 'portfolio' | 'ats';

/** Nikolay-Georgiev-CV-EN.pdf, …-EN-Backend.pdf, …-EN-Backend-ATS.pdf. */
export function cvFile(locale: Locale, target = 'general', mode: Mode = 'portfolio'): string {
  const t = cv.targets.find((x) => x.id === target);
  const parts = [locale.toUpperCase(), t?.file, mode === 'ats' ? 'ATS' : ''].filter(Boolean);
  return `Nikolay-Georgiev-CV-${parts.join('-')}.pdf`;
}

// The public CV never carries the phone number (same pattern as the dist audit).
const PHONE = /(?:\+|00)359[\s().-]*\d(?:[\s().-]*\d){7,8}|\b0[89]\d(?:[\s-]?\d){6,7}\b/;
const numbers = (text: string) => text.match(/\d+(?:\.\d+)*/g) ?? [];

/** A skill id from tech.ts or skills.ts, by name; only demonstrated skills may appear. */
export function skillName(id: string, locale: Locale): string {
  const practice = practices.find((p) => p.id === id);
  if (practice) {
    if (practice.status !== 'verified') throw new Error(`CV: "${id}" is not a verified skill`);
    return practice.name[locale];
  }
  const t = getTech(id);
  if (t.level === 'planned') throw new Error(`CV: "${id}" is planned, not a skill`);
  const name = techName(t, locale);
  const learning = { en: 'learning', bg: 'в процес на усвояване' }[locale];
  return t.level === 'learning' ? `${name} (${learning})` : name;
}

/**
 * `projects` maps a slug to that case study in every locale (getProjects), so
 * CV wording can be checked against what the case study states.
 */
export function buildCv(
  locale: Locale,
  targetId: string,
  projects: Record<string, Record<Locale, Project>>,
): CvDoc {
  const l = <T>(value: { [K in Locale]: T }) => value[locale];
  const target = cv.targets.find((t) => t.id === targetId);
  if (!target) throw new Error(`CV: no target "${targetId}"`);
  const labels = resolve(cv.labels, locale);
  const span = (start: string, end?: string) =>
    `${monthYear(start, locale)} – ${end ? monthYear(end, locale) : labels.present}`;
  const web = new URL(LOCALE_META[locale].prefix || '/', site.url);
  const work = new URL(`${LOCALE_META[locale].prefix}/work`, site.url);
  // Whole numbers only: "21" must not pass because a case study says "216".
  const facts = (slugs: string[]) =>
    new Set(
      numbers(
        JSON.stringify(slugs.flatMap((s) => Object.values(projects[s] ?? {}).map((x) => x.data))),
      ),
    );
  const check = (texts: string[], sources: Set<string>, where: string) => {
    for (const n of texts.flatMap(numbers)) {
      if (!sources.has(n)) throw new Error(`CV: ${where} states "${n}", no case study does`);
    }
  };

  const experience = roles.map((r) => ({
    title: l(r.title),
    // Independent work is not employment: no employer name where one would stand.
    sub: `${r.kind === 'independent' ? labels.independent : l(r.org)} · ${l(r.place)}`,
    meta: span(r.start, r.end),
    points: [...r.points, ...(cv.extraPoints[r.org.en] ?? [])].map(l),
  }));

  const byOrder = (slug: string) => {
    const i = target.projects.indexOf(slug);
    if (i < 0) throw new Error(`CV: target "${target.id}" does not place "${slug}"`);
    return i;
  };
  const selected = [...cv.projects]
    .sort((a, b) => byOrder(a.slug) - byOrder(b.slug))
    .map((p) => {
      const project = projects[p.slug];
      if (!project) throw new Error(`CV: no case study "${p.slug}"`);
      const data = project[locale].data;
      check(
        [l(p.lead), ...p.points.map((x) => (typeof x === 'number' ? '' : l(x)))],
        facts([p.slug]),
        p.slug,
      );
      for (const id of p.stack) {
        if (!data.stack.includes(id))
          throw new Error(`CV: ${p.slug} does not list "${id}" in its stack`);
      }
      return {
        slug: p.slug,
        title: data.name,
        sub: data.kicker,
        meta: `${l(STATUS_LABEL[data.status])} · ${span(data.started, data.ended)}`,
        lead: l(p.lead),
        points: p.points.map((x) => {
          if (typeof x !== 'number') return l(x);
          const h = data.highlights[x];
          if (!h) throw new Error(`CV: ${p.slug} has no highlight ${x}`);
          return h;
        }),
        stack: p.stack.map((id) => ({ id, name: techName(getTech(id), locale) })),
      };
    });

  const groups = target.groups.map((id) => {
    const g = cv.skills.find((x) => x.id === id);
    if (!g) throw new Error(`CV: no skill group "${id}"`);
    return g;
  });
  const skills = groups.map((g) => ({
    id: g.id,
    label: l(g.label),
    items: g.ids.map((id) => ({ id, name: skillName(id, locale) })),
  }));

  const summary = l(target.summary ?? cv.summary);
  check([summary], facts(Object.keys(projects)), `the ${target.id} summary`);

  const doc: CvDoc = {
    locale,
    lang: LOCALE_META[locale].lang,
    target: target.id,
    // Written in the CV's own script: Николай Георгиев on the Bulgarian CV.
    name: l(seo.name),
    role: l(site.role),
    headline: l(target.focus ?? site.focus),
    summary,
    location: l(site.location),
    availability: l(site.availability),
    contact: [
      { text: site.email, url: `mailto:${site.email}` },
      { text: web.host + web.pathname.replace(/\/$/, ''), url: web.href },
      { text: site.links.github.replace(/^https:\/\//, ''), url: site.links.github },
      {
        text: site.links.linkedin.replace(/^https:\/\/www\./, '').replace(/\/$/, ''),
        url: site.links.linkedin,
      },
    ],
    skills,
    languages: site.languages.map((x) => ({ name: l(x.name), level: l(x.level) })),
    certificates: certificates.map((c) => ({ title: c.title, org: l(c.org) })),
    experience,
    projects: selected,
    // The Bulgarian period ('2019–2023') is written without words, so both CVs use it.
    education: education.map((e) => ({ title: l(e.title), org: l(e.org), period: e.period.bg })),
    labels: { ...labels, more: `${labels.more} ${work.host}${work.pathname}` },
    work: work.href,
  };

  // The site writes a non-breaking hyphen (U+2011, in "low-level"); the CV font has none.
  const text = JSON.stringify(doc).replace(/‑/g, '-');
  const leak = text.match(PHONE);
  if (leak) throw new Error(`CV: content contains what looks like a phone number: ${leak[0]}`);
  return JSON.parse(text) as CvDoc;
}
