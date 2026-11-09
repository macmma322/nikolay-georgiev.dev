import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Queryable } from './db.ts';
import { audit, one } from './db.ts';
import { templateFile, type Clause, type TemplateFile } from './schema.ts';

export const PLACEHOLDERS = new Set([
  'contract.reference',
  'contract.date',
  'contract.place',
  'contractor.name',
  'client.name',
  'client.representative',
  'project.title',
  'project.description',
  'terms.scope_summary',
  'terms.start_date',
  'terms.delivery_date',
  'terms.price',
  'terms.price_basis',
  'terms.payment_days',
  'terms.acceptance_days',
  'terms.revision_rounds',
  'terms.warranty_days',
  'terms.additional_work_rate',
  'terms.notice_days',
  'terms.liability_cap',
  'terms.dispute_forum',
  'terms.support_terms',
  'terms.hosting_terms',
  'terms.ip_terms',
  'parent.reference',
  'parent.date',
  'parent.title',
  'change.description',
  'change.price',
  'change.delivery_date',
  'settlement.amount',
  'settlement.due_date',
  'settlement.reason',
]);

export const LISTS = new Set([
  'terms.deliverables',
  'terms.exclusions',
  'terms.payment_schedule',
  'terms.acceptance_criteria',
  'change.deliverables',
  'settlement.instalments',
]);

export const placeholdersIn = (text: string) =>
  [...text.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1] as string);

export const unknownPlaceholders = (text: string) =>
  placeholdersIn(text).filter((name) => !PLACEHOLDERS.has(name));

const DIR = fileURLToPath(new URL('../templates', import.meta.url));

export async function readTemplateFiles(dir = DIR): Promise<TemplateFile[]> {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(
    names.map(async (name) => {
      const parsed = templateFile.parse(JSON.parse(await readFile(join(dir, name), 'utf8')));
      const expected = `${parsed.key}.${parsed.lang}.json`;
      if (name !== expected) throw new Error(`${name}: file name must be ${expected}`);
      for (const section of parsed.sections) {
        for (const item of section.clauses) {
          const bad = unknownPlaceholders(item.text);
          if (bad.length) throw new Error(`${name} ${item.key}: unknown placeholder ${bad[0]}`);
          if (item.list && !LISTS.has(item.list)) {
            throw new Error(`${name} ${item.key}: unknown list ${item.list}`);
          }
        }
      }
      return parsed;
    }),
  );
}

// Adds versions, never rewrites one: contracts reference a template row, and a
// lawyer's sign-off belongs to the exact text that was reviewed.
export async function seedTemplates(db: Queryable, dir = DIR): Promise<number> {
  let added = 0;
  for (const file of await readTemplateFiles(dir)) {
    const row = await one<{ id: string }>(
      db,
      `insert into contract_templates (key, lang, category, name, jurisdiction, version, review_status, definition)
       values ($1, $2, $3, $4, $5, $6, 'unreviewed', $7)
       on conflict (key, lang, version) do nothing returning id`,
      [file.key, file.lang, file.category, file.name, file.jurisdiction, file.version, file],
    );
    if (row) {
      added += 1;
      await audit(db, 'template.added', 'template', row.id, {
        key: file.key,
        version: file.version,
      });
    }
  }
  return added;
}

export const clausesFromTemplate = (file: TemplateFile, reviewed: boolean): Clause[] =>
  file.sections.flatMap((section) =>
    section.clauses.map((item) => ({
      section_key: section.key,
      section_title: section.title,
      key: item.key,
      text: item.text,
      ...(item.list ? { list: item.list } : {}),
      material: item.material,
      origin: 'template' as const,
      review_status: reviewed ? ('lawyer_reviewed' as const) : ('unreviewed' as const),
      enabled: !item.optional,
      source_refs: item.sourceRefs,
    })),
  );
