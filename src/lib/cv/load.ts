import { LOCALES, type Locale } from '@/i18n';
import { getProjects, type Project } from '@/lib/projects';
import { buildCv, type CvDoc } from './doc';

/** The CV in every locale, from the site's data and case studies (build time). */
export async function cvDocs(): Promise<Record<Locale, CvDoc>> {
  const bySlug: Record<string, Record<Locale, Project>> = {};
  for (const locale of LOCALES) {
    for (const p of await getProjects(locale))
      (bySlug[p.id] ??= {} as Record<Locale, Project>)[locale] = p;
  }
  return Object.fromEntries(LOCALES.map((l) => [l, buildCv(l, bySlug)])) as Record<Locale, CvDoc>;
}
