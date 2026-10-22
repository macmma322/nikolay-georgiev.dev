import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const STATUSES = [
  'production',
  'live-pre-launch',
  'active',
  'prototype',
  'research',
  'experimental',
  'paused',
  'planned',
  'concept',
] as const;

export const ACCENTS = [
  'zone',
  'jarvis',
  'ussx',
  'kobait',
  'malrynth',
  'stemini',
  'steel',
] as const;
export const LAYERS = ['web', 'backend', 'realtime', 'ai', 'hardware', 'system'] as const;

const fact = z.object({ label: z.string(), value: z.string() });
const month = z.string().regex(/^\d{4}-\d{2}$/);

/**
 * Case studies. Frontmatter carries the structured, verifiable parts of each
 * study (facts, decisions, hard problems); the Markdown body is the narrative.
 * English is the source of truth for every language-neutral field; the period
 * shown on the page is derived from `started`/`ended` (src/lib/projects.ts).
 * Only top-level files: translations live in subfolders (bg/).
 */
const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      order: z.number().int(),
      tier: z.enum(['A', 'B']),
      accent: z.enum(ACCENTS),
      kicker: z.string(),
      /** One verifiable sentence that belongs to this project alone (homepage chapter). */
      signature: z.string().max(200).optional(),
      summary: z.string().max(220),
      description: z.string().max(170),
      /** Search-result title when `name: kicker` is not the best one. */
      seoTitle: z.string().optional(),
      status: z.enum(STATUSES),
      statusNote: z.string(),
      started: month,
      /** Omitted while the project is ongoing ("to present"). */
      ended: month.optional(),
      role: z.string(),
      context: z.string(),
      layers: z.array(z.enum(LAYERS)).min(1),
      stack: z.array(z.string()).min(1),
      links: z.object({
        live: z.url().optional(),
        liveLabel: z.string().optional(),
        repo: z.url().optional(),
        repoNote: z.string(),
      }),
      spec: z.array(fact).min(3).max(10),
      highlights: z.array(z.string()).min(2).max(5),
      built: z.array(z.object({ title: z.string(), points: z.array(z.string()).min(1) })).min(1),
      diagrams: z.array(z.string()).default([]),
      architecture: z.string(),
      hard: z.array(
        z.object({
          title: z.string(),
          problem: z.string(),
          solution: z.string(),
          /** A number already stated in the problem or solution, pulled out large. */
          figure: z.object({ value: z.string(), label: z.string() }).optional(),
        }),
      ),
      decisions: z.array(z.object({ decision: z.string(), why: z.string() })),
      now: z.array(z.string()).min(1),
      next: z.array(z.string()).default([]),
      learned: z.array(z.string()).default([]),
      notes: z.array(z.string()).default([]),
      media: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            caption: z.string(),
            wide: z.boolean().default(false),
          }),
        )
        .default([]),
    }),
});

/**
 * Bulgarian case studies: src/content/projects/bg/<same slug>.md holds only
 * the translatable text and the translated body. Everything language-neutral
 * comes from the English file; src/lib/projects.ts merges the two and checks
 * that every list has the same shape as in English. Limits are looser than
 * English because Bulgarian runs longer.
 */
const projectsBg = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects/bg' }),
  schema: z.object({
    kicker: z.string(),
    signature: z.string().max(260).optional(),
    summary: z.string().max(280),
    description: z.string().max(190),
    seoTitle: z.string().optional(),
    statusNote: z.string(),
    role: z.string(),
    context: z.string(),
    links: z.object({
      repoNote: z.string(),
      /** Only when the English label is prose, not a domain name. */
      liveLabel: z.string().optional(),
    }),
    spec: z.array(fact),
    highlights: z.array(z.string()),
    built: z.array(z.object({ title: z.string(), points: z.array(z.string()) })),
    architecture: z.string(),
    hard: z
      .array(
        z.object({
          title: z.string(),
          problem: z.string(),
          solution: z.string(),
          figure: z.object({ value: z.string(), label: z.string() }).optional(),
        }),
      )
      .default([]),
    decisions: z.array(z.object({ decision: z.string(), why: z.string() })).default([]),
    now: z.array(z.string()),
    next: z.array(z.string()).default([]),
    learned: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([]),
    /** Same order as the English media list. */
    media: z.array(z.object({ alt: z.string(), caption: z.string() })).default([]),
  }),
});

/** Text written once per locale in the same file (an L<string> from @/i18n). */
const localized = z.object({ en: z.string(), bg: z.string() });

/**
 * Lab: smaller, earlier or future systems. Honest status is the point.
 * Translatable text is `localized`; a proper-noun name stays a plain string.
 * `related` links an entry to the case study it genuinely belongs to.
 */
const lab = defineCollection({
  loader: file('./src/content/lab.json'),
  schema: z.object({
    name: z.union([z.string(), localized]),
    order: z.number().int(),
    group: z.enum(['building', 'tooling', 'next', 'paused']),
    status: z.enum(STATUSES),
    kicker: localized,
    summary: localized,
    points: z.array(localized).default([]),
    stack: z.array(z.string()).default([]),
    evidence: localized,
    related: z.object({ project: reference('projects'), note: localized }).optional(),
  }),
});

export const collections = { projects, projectsBg, lab };
