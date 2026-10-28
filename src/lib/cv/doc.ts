import { cv } from '@/data/cv';
import { certificates, education, roles } from '@/data/experience';
import { site } from '@/data/site';
import { getTech, techName } from '@/data/tech';
import { LOCALE_META, resolve, type Locale } from '@/i18n';
import { monthYear } from '@/i18n/format';
import type { Project } from '@/lib/projects';
import { STATUS_LABEL } from '@/lib/status';
import { seo } from '@/i18n/ui/seo';

/**
 * The CV in one language, as plain JSON: the page embeds it, the browser lays
 * it out and writes the PDF, and the build renders the same layout as the
 * preview and as the fallback files. See src/data/cv.ts for what is CV-only.
 */
export interface CvDoc {
  locale: Locale;
  lang: string;
  name: string;
  role: string;
  headline: string;
  summary: string;
  contact: { text: string; url?: string }[];
  skills: { label: string; items: string }[];
  languages: { name: string; level: string }[];
  certificates: { title: string; org: string }[];
  experience: Entry[];
  projects: (Entry & { stack: string })[];
  education: { title: string; org: string; period: string }[];
  labels: { [K in keyof typeof cv.labels]: string };
  /** The case studies in this language. */
  work: string;
  file: string;
}

interface Entry {
  title: string;
  /** Employer, or the project's kicker. */
  sub: string;
  /** Right-hand meta: dates, and a project's status. */
  meta: string;
  lead?: string;
  points: string[];
}

export const cvFile = (locale: Locale) => site.cv.file[locale];

// The public CV never carries the phone number (same pattern as the dist audit).
const PHONE = /(?:\+|00)359[\s().-]*\d(?:[\s().-]*\d){7,8}|\b0[89]\d(?:[\s-]?\d){6,7}\b/;
const numbers = (text: string) => text.match(/\d+(?:\.\d+)*/g) ?? [];

/**
 * `projects` maps a slug to that case study in every locale (getProjects), so
 * CV wording can be checked against what the case study states.
 */
export function buildCv(locale: Locale, projects: Record<string, Record<Locale, Project>>): CvDoc {
  const l = <T>(value: { [K in Locale]: T }) => value[locale];
  const labels = resolve(cv.labels, locale);
  const span = (start: string, end?: string) =>
    `${monthYear(start, locale)} – ${end ? monthYear(end, locale) : labels.present}`;
  const web = new URL(LOCALE_META[locale].prefix || '/', site.url);
  const work = new URL(`${LOCALE_META[locale].prefix}/work`, site.url);

  const experience = roles.map((r) => ({
    title: l(r.title),
    sub: `${l(r.org)} · ${l(r.place)}`,
    meta: span(r.start, r.end),
    points: [...r.points, ...(cv.extraPoints[r.org.en] ?? [])].map(l),
  }));

  const selected = cv.projects.map((p) => {
    const project = projects[p.slug];
    if (!project) throw new Error(`CV: no case study "${p.slug}"`);
    const data = project[locale].data;
    // Whole numbers only: "21" must not pass because the case study says "216".
    const sources = new Set(numbers(JSON.stringify(Object.values(project).map((x) => x.data))));
    const texts = [l(p.lead), ...p.points.map((x) => (typeof x === 'number' ? '' : l(x)))];
    for (const n of texts.flatMap(numbers)) {
      if (!sources.has(n)) throw new Error(`CV: ${p.slug} states "${n}", the case study does not`);
    }
    for (const id of p.stack) {
      if (!data.stack.includes(id))
        throw new Error(`CV: ${p.slug} does not list "${id}" in its stack`);
    }
    return {
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
      stack: p.stack.map((id) => techName(getTech(id), locale)).join(', '),
    };
  });

  const learning = { en: 'learning', bg: 'в процес на усвояване' };
  const skills = cv.skills.map((g) => ({
    label: l(g.label),
    items: g.ids
      .map((id) => {
        const t = getTech(id);
        if (t.level === 'planned') throw new Error(`CV: "${id}" is planned, not a skill`);
        const name = techName(t, locale);
        return t.level === 'learning' ? `${name} (${l(learning)})` : name;
      })
      .join(', '),
  }));

  const doc: CvDoc = {
    locale,
    lang: LOCALE_META[locale].lang,
    // Written in the CV's own script: Николай Георгиев on the Bulgarian CV.
    name: l(seo.name),
    role: l(site.role),
    headline: l(site.statement)
      .filter((s) => s.lights)
      .map((s, i) => (i ? s.text : s.text[0]!.toUpperCase() + s.text.slice(1)))
      .join(' · '),
    summary: l(cv.summary),
    contact: [
      { text: `${l(site.location)}. ${l(site.availability)}` },
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
    file: cvFile(locale),
  };

  // The site writes a non-breaking hyphen (U+2011, in "low-level"); the CV font has none.
  const text = JSON.stringify(doc).replace(/‑/g, '-');
  const leak = text.match(PHONE);
  if (leak) throw new Error(`CV: content contains what looks like a phone number: ${leak[0]}`);
  return JSON.parse(text) as CvDoc;
}
