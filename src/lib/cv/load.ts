import { cv } from '@/data/cv';
import { LOCALES, type Locale } from '@/i18n';
import { getProjects, type Project } from '@/lib/projects';
import { buildCv, type CvDoc } from './doc';
import type { Term } from './match';
import { taxonomy } from './taxonomy';

/** The CV in every locale and for every target role, from the site's data (build time). */
export async function cvDocs(): Promise<Record<Locale, Record<string, CvDoc>>> {
  const bySlug: Record<string, Record<Locale, Project>> = {};
  for (const locale of LOCALES) {
    for (const p of await getProjects(locale))
      (bySlug[p.id] ??= {} as Record<Locale, Project>)[locale] = p;
  }
  return Object.fromEntries(
    LOCALES.map((l) => [
      l,
      Object.fromEntries(cv.targets.map((t) => [t.id, buildCv(l, t.id, bySlug)])),
    ]),
  ) as Record<Locale, Record<string, CvDoc>>;
}

/** The job matcher's terms in every locale. */
export async function cvTerms(): Promise<Record<Locale, Term[]>> {
  const entries = await Promise.all(
    LOCALES.map(async (l) => [l, taxonomy(l, await getProjects(l))] as const),
  );
  return Object.fromEntries(entries) as Record<Locale, Term[]>;
}
