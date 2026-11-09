// Trust-boundary validation: forms, template files and Claude's tool input.
import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const optionalDate = z
  .union([isoDate, z.literal('')])
  .transform((value) => value || undefined)
  .optional();
const money = z.coerce.number().min(0).max(999_999_999);
const blankToUndefined = (value: unknown) => (value === '' || value == null ? undefined : value);
const optionalMoney = z.preprocess(blankToUndefined, money.optional());
const optionalInt = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(0).max(3650).optional(),
);
export const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code');
const lines = z.array(text(2000).min(1)).max(100);

export const clientInput = z.object({
  kind: z.enum(['individual', 'legal_entity']),
  name: text(300).min(1, 'Name is required'),
  contact_person: optionalText(200),
  email: z
    .union([z.email(), z.literal('')])
    .transform((v) => v || undefined)
    .optional(),
  phone: optionalText(50),
  address: optionalText(500),
  eik: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{9}(\d{4})?$/, 'EIK/BULSTAT has 9 or 13 digits'),
      z.literal(''),
    ])
    .transform((v) => v || undefined)
    .optional(),
  vat_id: optionalText(20),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use a 2-letter country code')
    .default('BG'),
  notes: optionalText(5000),
});

export const projectInput = z.object({
  client_id: z.uuid('Choose a client'),
  title: text(300).min(1, 'Title is required'),
  description: optionalText(10_000),
  scope_summary: optionalText(10_000),
  deliverables: lines.default([]),
  exclusions: lines.default([]),
  start_date: optionalDate,
  target_date: optionalDate,
  price: optionalMoney,
  currency: currency.default('EUR'),
  payment_structure: optionalText(2000),
  status: z
    .enum(['planned', 'active', 'on_hold', 'delivered', 'closed', 'cancelled'])
    .default('planned'),
  notes: optionalText(5000),
});

export const milestone = z.strictObject({
  label: text(300).min(1),
  amount: money,
  due: text(300).default(''),
});

// What the contract fields can hold. Parties are absent on purpose: they come
// only from client records and Settings, so nothing can invent them.
export const terms = z.strictObject({
  scope_summary: optionalText(10_000),
  deliverables: lines.default([]),
  exclusions: lines.default([]),
  acceptance_criteria: lines.default([]),
  start_date: optionalDate,
  delivery_date: optionalDate,
  price_amount: optionalMoney,
  currency: currency.default('EUR'),
  price_basis: optionalText(200),
  payment_schedule: z.array(milestone).max(50).default([]),
  payment_days: optionalInt,
  acceptance_days: optionalInt,
  revision_rounds: optionalInt,
  warranty_days: optionalInt,
  additional_work_rate: optionalText(300),
  notice_days: optionalInt,
  liability_cap: optionalText(500),
  dispute_forum: optionalText(500),
  support_terms: optionalText(3000),
  hosting_terms: optionalText(3000),
  ip_terms: optionalText(3000),
});
export type Terms = z.infer<typeof terms>;

const party = z.object({
  kind: z.enum(['individual', 'legal_entity']),
  name: z.string().default(''),
  address: z.string().optional(),
  email: z.string().optional(),
  eik: z.string().optional(),
  vat_id: z.string().optional(),
  representative: z.string().optional(),
  country: z.string().default('BG'),
});

export const clause = z.object({
  section_key: z.string(),
  section_title: z.string(),
  key: z.string(),
  text: text(20_000),
  list: z.string().optional(),
  material: z.boolean().default(true),
  origin: z.enum(['template', 'manual', 'ai']),
  review_status: z.enum(['unreviewed', 'lawyer_reviewed']),
  enabled: z.boolean().default(true),
  source_refs: z.array(z.string()).default([]),
});
export type Clause = z.infer<typeof clause>;

export const contractContent = z.object({
  template_key: z.string(),
  template_version: z.string(),
  lang: z.enum(['bg', 'en']),
  title: text(300),
  reference: z.string(),
  contract_date: z.string().optional(),
  place: z.string().optional(),
  contractor: party,
  client: party,
  project: z.object({ title: z.string().default(''), description: z.string().optional() }),
  parent: z
    .object({ reference: z.string(), date: z.string().optional(), title: z.string() })
    .optional(),
  change: z
    .object({
      description: z.string().optional(),
      price: z.number().optional(),
      delivery_date: z.string().optional(),
      deliverables: z.array(z.string()).default([]),
    })
    .optional(),
  settlement: z
    .object({
      amount: z.number().optional(),
      due_date: z.string().optional(),
      reason: z.string().optional(),
      instalments: z.array(z.string()).default([]),
    })
    .optional(),
  terms,
  clauses: z.array(clause).max(300),
});
export type ContractContent = z.infer<typeof contractContent>;

const templateClause = z.strictObject({
  key: z.string().min(1),
  text: z.string().min(1),
  list: z.string().optional(),
  material: z.boolean(),
  optional: z.boolean(),
  sourceRefs: z.array(z.string()).default([]),
  note: z.string().optional(),
});

export const templateFile = z.strictObject({
  key: z.string().regex(/^[a-z-]+$/),
  lang: z.enum(['bg', 'en']),
  category: z.enum([
    'software_development',
    'it_services',
    'annex',
    'additional_agreement',
    'acceptance_protocol',
    'payment_settlement',
  ]),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  jurisdiction: z.string(),
  title: z.string().min(1),
  reviewStatus: z.enum(['unreviewed', 'lawyer_reviewed']),
  sources: z
    .array(
      z.strictObject({
        id: z.string(),
        label: z.string(),
        url: z.string(),
        checkedAt: isoDate,
        note: z.string().optional(),
      }),
    )
    .default([]),
  sections: z
    .array(
      z.strictObject({
        key: z.string().min(1),
        title: z.string().min(1),
        clauses: z.array(templateClause).min(1),
      }),
    )
    .min(1),
});
export type TemplateFile = z.infer<typeof templateFile>;

export const settingsData = z.object({
  profile: z.object({
    legal_name: z.string().trim().max(200).default(''),
    email: z.string().trim().max(200).default(''),
    address: z.string().trim().max(500).default(''),
    // Individual until changed; old contracts keep the snapshot they were created with.
    status: z.enum(['individual', 'registered_freelancer', 'eood']).default('individual'),
    company_name: z.string().trim().max(300).default(''),
    eik: z.string().trim().max(13).default(''),
    vat_id: z.string().trim().max(20).default(''),
  }),
  currency: currency.default('EUR'),
  language: z.enum(['bg', 'en']).default('bg'),
  default_template: z.string().default('software-development'),
  model: z.string().default(''),
  retention_days: z.coerce.number().int().min(0).max(3650).default(365),
  page_numbers: z.boolean().default(true),
});
export type SettingsData = z.infer<typeof settingsData>;

// Claude's tools. Strict objects: an attempt to touch anything outside these
// fields (parties, status, approvals) fails validation and is never stored.
const clauseEdit = z.strictObject({
  op: z.enum(['replace', 'add', 'disable']),
  key: z.string().max(100).describe('Existing clause key, or a new unique key for add'),
  section_key: z.string().max(100).optional().describe('Required for add: an existing section'),
  new_text: z.string().max(20_000).optional().describe('Required for replace and add'),
  reason: z.string().max(2000).describe('Why this change; flag legal uncertainty here'),
});

const patchText = (max: number) => z.string().trim().min(1).max(max).optional();
const patchCount = z.number().int().min(0).max(3650).optional();
const patchLines = z.array(z.string().trim().min(1).max(2000)).max(100).optional();
const termsPatch = z.strictObject({
  scope_summary: patchText(10_000),
  deliverables: patchLines,
  exclusions: patchLines,
  acceptance_criteria: patchLines,
  start_date: isoDate.optional(),
  delivery_date: isoDate.optional(),
  price_amount: z.number().min(0).max(999_999_999).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  price_basis: patchText(200),
  payment_schedule: z
    .array(
      z.strictObject({
        label: z.string().trim().min(1).max(300),
        amount: z.number().min(0).max(999_999_999),
        due: z.string().trim().max(300),
      }),
    )
    .max(50)
    .optional(),
  payment_days: patchCount,
  acceptance_days: patchCount,
  revision_rounds: patchCount,
  warranty_days: patchCount,
  additional_work_rate: patchText(300),
  notice_days: patchCount,
  liability_cap: patchText(500),
  dispute_forum: patchText(500),
  support_terms: patchText(3000),
  hosting_terms: patchText(3000),
  ip_terms: patchText(3000),
});

export const contractProposal = z.strictObject({
  summary: z.string().max(2000),
  set_terms: termsPatch.default({}),
  clause_edits: z.array(clauseEdit).max(50).default([]),
  missing_information: z.array(z.string().max(500)).max(50).default([]),
  questions: z.array(z.string().max(1000)).max(20).default([]),
  legal_uncertainties: z.array(z.string().max(2000)).max(20).default([]),
});
export type ContractProposal = z.infer<typeof contractProposal>;

// No price field: amounts are the user's to enter on the change request.
export const scopeAssessment = z.strictObject({
  title: z.string().min(1).max(300),
  request_summary: z.string().min(1).max(5000),
  classification: z.enum(['covered', 'excluded', 'ambiguous']),
  reasoning: z.string().min(1).max(5000),
  questions: z.array(z.string().max(1000)).max(20).default([]),
  proposed_deliverables: z.array(z.string().max(2000)).max(50).default([]),
});
export type ScopeAssessment = z.infer<typeof scopeAssessment>;
