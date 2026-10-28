import { site } from '@/data/site';
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, localizePath, type Locale } from '@/i18n';
import { seo } from '@/i18n/ui/seo';

/**
 * schema.org nodes for one JSON-LD @graph per page (SEO.astro assembles it).
 * Every node has a stable @id, references between nodes use { '@id' }, and
 * only facts published on the site go in. No telephone, ever: the phone
 * number belongs to the contact page's visible markup alone.
 */

type Node = Record<string, unknown>;

/** Absolute URL of a site path; the home page keeps its slash. */
export const absolute = (path: string): string => new URL(path, `${site.url}/`).href;

export const ids = {
  person: absolute('/#person'),
  website: absolute('/#website'),
};

const ref = (id: string) => ({ '@id': id });

export function personSchema(locale: Locale = DEFAULT_LOCALE, image?: string | undefined): Node {
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: site.name,
    alternateName: seo.name.bg,
    url: absolute('/'),
    ...(image ? { image } : {}),
    jobTitle: site.role[locale],
    description: seo.home.description[locale],
    // The occupation as practised, with the skills the case studies back up.
    hasOccupation: {
      '@type': 'Occupation',
      name: site.role[locale],
      occupationLocation: { '@type': 'City', name: seo.city[locale] },
      skills: seo.knowsAbout[locale].join(', '),
    },
    // Published in the footer of every page; the site's main contact channel.
    email: site.email,
    worksFor: { '@type': 'Organization', name: 'DXC Technology' },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: seo.university.en,
      alternateName: seo.university.bg,
    },
    knowsAbout: seo.knowsAbout[locale],
    knowsLanguage: ['bg', 'en'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: seo.city[locale],
      addressCountry: 'BG',
    },
    sameAs: [site.links.github, site.links.linkedin, site.elsewhere[0].href],
  };
}

/** The site itself: home pages only. No SearchAction, the site has no search. */
export function websiteSchema(): Node {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: absolute('/'),
    name: site.name,
    alternateName: seo.name.bg,
    inLanguage: LOCALES.map((code) => LOCALE_META[code].lang),
    author: ref(ids.person),
    publisher: ref(ids.person),
  };
}

export type PageType = 'WebPage' | 'CollectionPage' | 'ProfilePage' | 'ContactPage';

interface PageInput {
  type: PageType;
  /** Absolute canonical URL, also the page's @id. */
  url: string;
  name: string;
  description: string;
  locale: Locale;
  /** What the page is mainly about (an @id). */
  mainEntity?: string | undefined;
  about?: string | undefined;
  breadcrumb?: boolean | undefined;
}

export function webPageSchema(p: PageInput): Node {
  return {
    '@type': p.type,
    '@id': p.url,
    url: p.url,
    name: p.name,
    description: p.description,
    inLanguage: LOCALE_META[p.locale].lang,
    isPartOf: ref(ids.website),
    ...(p.about ? { about: ref(p.about) } : {}),
    ...(p.mainEntity ? { mainEntity: ref(p.mainEntity) } : {}),
    ...(p.breadcrumb ? { breadcrumb: ref(`${p.url}#breadcrumb`) } : {}),
  };
}

/** Localized crumbs, home first; the last one is the page itself. */
export function breadcrumbSchema(items: { name: string; path: string }[]): Node {
  const last = items.at(-1);
  return {
    '@type': 'BreadcrumbList',
    ...(last ? { '@id': `${absolute(last.path)}#breadcrumb` } : {}),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/**
 * Code-centric projects are SoftwareSourceCode; products, platforms and
 * hardware stay CreativeWork. Neither type is a rich-result type that would
 * ask for offers or ratings.
 */
const SOURCE_CODE = new Set(['jarvis', 'malrynth']);
const LANGUAGES = new Set(['TypeScript', 'JavaScript', 'Python', 'C++', 'Rust', 'Java']);

interface ProjectSchemaInput {
  name: string;
  description: string;
  slug: string;
  /** Stack names. */
  keywords: string[];
  kicker?: string | undefined;
  /** Status label in the page language. */
  status?: string | undefined;
  /** The live product, when it is in production. */
  live?: string | undefined;
  dateCreated?: string | undefined;
  image?: string | undefined;
  locale?: Locale | undefined;
}

export function projectSchema(p: ProjectSchemaInput): Node {
  const locale = p.locale ?? DEFAULT_LOCALE;
  const page = absolute(localizePath(`/work/${p.slug}`, locale));
  const code = SOURCE_CODE.has(p.slug);
  const languages = p.keywords.filter((name) => LANGUAGES.has(name));
  return {
    '@type': code ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': `${page}#project`,
    name: p.name,
    ...(p.kicker ? { alternativeHeadline: p.kicker } : {}),
    description: p.description,
    inLanguage: LOCALE_META[locale].lang,
    keywords: p.keywords.join(', '),
    ...(code && languages.length ? { programmingLanguage: languages } : {}),
    ...(p.status ? { creativeWorkStatus: p.status } : {}),
    ...(p.dateCreated ? { dateCreated: p.dateCreated } : {}),
    ...(p.image ? { image: absolute(p.image) } : {}),
    ...(p.live ? { url: p.live } : {}),
    author: ref(ids.person),
    mainEntityOfPage: ref(page),
  };
}

/**
 * One @graph from a page's nodes. Nodes are deduplicated by @id (the first
 * wins) and a stray @context from older callers is dropped.
 */
export function graph(nodes: Node[]): Node {
  const seen = new Set<unknown>();
  const out: Node[] = [];
  for (const { '@context': _context, ...node } of nodes) {
    const id = node['@id'];
    if (id !== undefined) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(node);
  }
  return { '@context': 'https://schema.org', '@graph': out };
}
