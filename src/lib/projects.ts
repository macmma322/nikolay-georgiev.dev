import { getCollection, render, type CollectionEntry } from 'astro:content';
import { layers } from '@/data/layers';
import { DEFAULT_LOCALE, type Locale } from '@/i18n';
import { period } from '@/i18n/format';

/**
 * Case studies in one locale. English (src/content/projects/*.md) holds every
 * language-neutral field; Bulgarian (src/content/projects/bg/*.md) holds only
 * the text. Every page and component reads projects through here, so both
 * locales take the same path.
 *
 * Structural parity is enforced at build time: a Bulgarian file must exist for
 * every English project and every list must have the same shape, otherwise
 * the build fails naming the project and field. For local work only,
 * I18N_FALLBACK=1 lets a MISSING translation fall back to English (with a
 * warning); a translation that exists but does not match always fails.
 */

type EnEntry = CollectionEntry<'projects'>;
type BgEntry = CollectionEntry<'projectsBg'>;

export type ProjectData = EnEntry['data'] & {
  /** 'Aug 2026 to present' / 'авг. 2026 – досега', from started/ended. */
  years: string;
  /** 'Web · Backend' / 'Уеб · Бекенд', from layers. */
  layerNames: string;
};

export interface Project {
  /** The slug, identical in every locale. */
  id: string;
  data: ProjectData;
  /** The entry whose Markdown body is rendered (renderProject). */
  source: EnEntry | BgEntry;
}

const fallbackAllowed = () => process.env.I18N_FALLBACK === '1';
const warned = new Set<string>();

/** Parity problems between an English project and its translation, as "field: detail". */
function parity(en: EnEntry, tr: BgEntry): string[] {
  const a = en.data;
  const b = tr.data;
  const problems: string[] = [];
  const count = (field: string, x: readonly unknown[], y: readonly unknown[]) => {
    if (x.length !== y.length) {
      problems.push(`${field}: English has ${x.length} item(s), the translation has ${y.length}`);
    }
  };
  const present = (field: string, x: unknown, y: unknown) => {
    if ((x === undefined) !== (y === undefined)) {
      problems.push(`${field}: ${x === undefined ? 'not in English' : 'missing'}`);
    }
  };

  present('signature', a.signature, b.signature);
  count('spec', a.spec, b.spec);
  count('highlights', a.highlights, b.highlights);
  count('built', a.built, b.built);
  a.built.forEach((group, i) => {
    const other = b.built[i];
    if (other) count(`built[${i}].points`, group.points, other.points);
  });
  count('hard', a.hard, b.hard);
  a.hard.forEach((item, i) => {
    const other = b.hard[i];
    if (other) present(`hard[${i}].figure`, item.figure, other.figure);
  });
  count('decisions', a.decisions, b.decisions);
  count('now', a.now, b.now);
  count('next', a.next, b.next);
  count('learned', a.learned, b.learned);
  count('notes', a.notes, b.notes);
  count('media', a.media, b.media);
  if (en.body?.trim() && !tr.body?.trim()) problems.push('body: the Markdown body is empty');
  return problems;
}

/** English neutral fields with the translation's text on top. */
function merge(en: EnEntry, tr: BgEntry): EnEntry['data'] {
  const { links, media, ...text } = tr.data;
  return {
    ...en.data,
    ...text,
    // Never inherit English optional text into another language.
    signature: text.signature,
    seoTitle: text.seoTitle,
    links: {
      ...en.data.links,
      repoNote: links.repoNote,
      // A domain-name label stays as it is in English.
      ...(links.liveLabel ? { liveLabel: links.liveLabel } : {}),
    },
    media: en.data.media.map((item, i) => ({ ...item, ...media[i] })),
  };
}

/** Every project in `locale`, in display order. Throws on missing or mismatched translations. */
export async function getProjects(locale: Locale): Promise<Project[]> {
  const english = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const derive = (data: EnEntry['data']): ProjectData => ({
    ...data,
    years: period(data.started, data.ended, locale),
    layerNames: data.layers
      .map((id) => layers.find((x) => x.id === id)?.name[locale] ?? id)
      .join(' · '),
  });

  if (locale === DEFAULT_LOCALE) {
    return english.map((entry) => ({ id: entry.id, data: derive(entry.data), source: entry }));
  }

  const translations = new Map((await getCollection('projectsBg')).map((t) => [t.id, t]));
  const problems: string[] = [];
  const projects = english.map((entry): Project => {
    const tr = translations.get(entry.id);
    if (!tr) {
      if (fallbackAllowed()) {
        if (!warned.has(entry.id)) {
          warned.add(entry.id);
          console.warn(
            `[i18n] ${entry.id}: no ${locale} translation, using English (I18N_FALLBACK=1)`,
          );
        }
      } else {
        problems.push(`${entry.id}: missing src/content/projects/${locale}/${entry.id}.md`);
      }
      return { id: entry.id, data: derive(entry.data), source: entry };
    }
    problems.push(...parity(entry, tr).map((p) => `${entry.id}: ${p}`));
    return { id: entry.id, data: derive(merge(entry, tr)), source: tr };
  });
  for (const id of translations.keys()) {
    if (!english.some((entry) => entry.id === id)) {
      problems.push(`${id}: src/content/projects/${locale}/${id}.md has no English project`);
    }
  }

  if (problems.length) {
    throw new Error(
      `[i18n] ${locale} case studies do not match English:\n  - ${problems.join('\n  - ')}\n` +
        `Every English project needs src/content/projects/${locale}/<slug>.md with lists of the ` +
        `same length. For local work only, I18N_FALLBACK=1 builds missing translations in English.`,
    );
  }
  return projects;
}

/** One project in `locale`. */
export async function getProject(slug: string, locale: Locale): Promise<Project> {
  const project = (await getProjects(locale)).find((p) => p.id === slug);
  if (!project) throw new Error(`Unknown project "${slug}"`);
  return project;
}

/** getStaticPaths for /work/[slug] in every locale: slugs are the same everywhere. */
export async function projectPaths() {
  const english = await getCollection('projects');
  return english.map((entry) => ({ params: { slug: entry.id }, props: { slug: entry.id } }));
}

/** Renders the project's Markdown body in the locale it was loaded in. */
export function renderProject(project: Project) {
  return render(project.source);
}
