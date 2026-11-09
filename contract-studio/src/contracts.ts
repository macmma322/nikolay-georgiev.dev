// The contract lifecycle. Every rule about what may change, and when, lives here.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config } from './config.ts';
import { audit, many, one, tx, type Db, type Queryable, type Tx } from './db.ts';
import { RENDERER_VERSION, renderDocx, renderPdf } from './exporters.ts';
import { buildDocument, safeFilename, toHtml } from './render.ts';
import {
  contractContent,
  settingsData,
  type Clause,
  type ContractContent,
  type ContractProposal,
  type SettingsData,
  type TemplateFile,
} from './schema.ts';
import { clausesFromTemplate, unknownPlaceholders } from './templates.ts';

export class Rejected extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}

export const STATUSES = [
  'draft',
  'needs_information',
  'ready_for_review',
  'approved',
  'exported',
  'sent',
  'signed',
  'active',
  'completed',
  'terminated',
  'archived',
] as const;
export type Status = (typeof STATUSES)[number];

// Manual moves only. Approval and new versions go through their own functions.
export const TRANSITIONS: Record<Status, Status[]> = {
  draft: ['needs_information', 'ready_for_review', 'archived'],
  needs_information: ['draft', 'ready_for_review', 'archived'],
  ready_for_review: ['draft', 'needs_information', 'archived'],
  approved: ['sent', 'archived'],
  exported: ['sent', 'archived'],
  sent: ['signed', 'archived'],
  signed: ['active', 'terminated'],
  active: ['completed', 'terminated'],
  completed: ['archived'],
  terminated: ['archived'],
  archived: [],
};

export const canTransition = (from: Status, to: Status) => TRANSITIONS[from].includes(to);

// Signed paper does not change: amendments are additional agreements.
const FROZEN: Status[] = ['signed', 'active', 'completed', 'terminated', 'archived'];
export const isEditable = (status: Status) => !FROZEN.includes(status);

export type ContractRow = {
  id: string;
  client_id: string;
  project_id: string | null;
  template_id: string;
  parent_contract_id: string | null;
  title: string;
  reference: string;
  status: Status;
  current_version: number;
  approved_version: number | null;
  signature_status: string;
  signed_at: string | null;
  effective_date: string | null;
  end_date: string | null;
  created_at: Date;
  updated_at: Date;
};

export type VersionRow = {
  id: string;
  contract_id: string;
  version: number;
  content: ContractContent;
  rendered_html: string;
  content_sha256: string;
  source: 'template' | 'manual' | 'ai_proposal';
  approval_state: 'draft' | 'approved';
  approved_at: Date | null;
  approval_note: string | null;
  created_at: Date;
};

// Key order is fixed by the schema parse, so equal content hashes equally.
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

export async function getSettings(db: Queryable): Promise<SettingsData> {
  const row = await one<{ data: unknown }>(db, 'select data from settings where id');
  return settingsData.parse(row?.data ?? { profile: {} });
}

export const getContract = (db: Queryable, id: string) =>
  one<ContractRow>(db, 'select * from contracts where id = $1', [id]);

export const getVersion = (db: Queryable, contractId: string, version: number) =>
  one<VersionRow>(db, 'select * from contract_versions where contract_id = $1 and version = $2', [
    contractId,
    version,
  ]);

function contractorParty(settings: SettingsData): ContractContent['contractor'] {
  const p = settings.profile;
  const company = p.status === 'eood';
  return {
    kind: company ? 'legal_entity' : 'individual',
    name: company ? p.company_name : p.legal_name,
    ...(p.address ? { address: p.address } : {}),
    ...(p.email ? { email: p.email } : {}),
    ...(company && p.eik ? { eik: p.eik } : {}),
    ...(p.vat_id ? { vat_id: p.vat_id } : {}),
    ...(company && p.legal_name ? { representative: p.legal_name } : {}),
    country: 'BG',
  };
}

type ClientRow = {
  id: string;
  kind: 'individual' | 'legal_entity';
  name: string;
  contact_person: string | null;
  email: string | null;
  address: string | null;
  eik: string | null;
  vat_id: string | null;
  country: string;
};
type ProjectRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  scope_summary: string | null;
  deliverables: string[];
  exclusions: string[];
  start_date: string | null;
  target_date: string | null;
  price: string | null;
  currency: string;
};
type TemplateRow = { id: string; review_status: string; definition: TemplateFile };

const clientParty = (c: ClientRow): ContractContent['client'] => ({
  kind: c.kind,
  name: c.name,
  ...(c.address ? { address: c.address } : {}),
  ...(c.email ? { email: c.email } : {}),
  ...(c.eik ? { eik: c.eik } : {}),
  ...(c.vat_id ? { vat_id: c.vat_id } : {}),
  ...(c.contact_person ? { representative: c.contact_person } : {}),
  country: c.country,
});

async function insertVersion(
  db: Tx,
  contractId: string,
  version: number,
  content: ContractContent,
  source: VersionRow['source'],
) {
  const clean = contractContent.parse(content);
  const row = await one<VersionRow>(
    db,
    `insert into contract_versions (contract_id, version, content, rendered_html, content_sha256, source)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [
      contractId,
      version,
      clean,
      toHtml(buildDocument(clean)),
      sha256(JSON.stringify(clean)),
      source,
    ],
  );
  return row as VersionRow;
}

const latestTemplate = (db: Queryable, key: string, lang: string) =>
  one<TemplateRow>(
    db,
    `select id, review_status, definition from contract_templates
     where key = $1 and lang = $2
     order by string_to_array(version, '.')::int[] desc limit 1`,
    [key, lang],
  );

type NewContract = {
  clientId: string;
  projectId?: string | undefined;
  templateKey: string;
  lang: 'bg' | 'en';
  title?: string | undefined;
  parent?: ContractContent['parent'] | undefined;
  parentId?: string | undefined;
  change?: ContractContent['change'] | undefined;
  settlement?: ContractContent['settlement'] | undefined;
};

export async function buildParentReference(
  db: Queryable,
  parentId: string,
  clientId?: string,
): Promise<{ reference: string; title: string; date?: string }> {
  const parent = await getContract(db, parentId);
  if (!parent) throw new Rejected('Parent contract not found', 404);
  if (clientId && parent.client_id !== clientId) {
    throw new Rejected('Parent contract belongs to another client', 422);
  }
  const parentVersion = await getVersion(
    db,
    parent.id,
    parent.approved_version ?? parent.current_version,
  );
  return {
    reference: parent.reference,
    title: parent.title,
    ...(parentVersion?.content.contract_date ? { date: parentVersion.content.contract_date } : {}),
  };
}

export async function createContract(db: Db, input: NewContract, ip: string | null = null) {
  return tx(db, async (client) => {
    const template = await latestTemplate(client, input.templateKey, input.lang);
    if (!template) throw new Rejected('Unknown template', 422);
    const party = await one<ClientRow>(client, 'select * from clients where id = $1', [
      input.clientId,
    ]);
    if (!party) throw new Rejected('Unknown client', 422);
    const project = input.projectId
      ? await one<ProjectRow>(client, 'select * from projects where id = $1 and client_id = $2', [
          input.projectId,
          input.clientId,
        ])
      : undefined;
    if (input.projectId && !project)
      throw new Rejected('That project belongs to another client', 422);

    let parent = input.parent;
    if (input.parentId) {
      const parentRef = await buildParentReference(client, input.parentId, input.clientId);
      parent = parent ?? parentRef;
    }

    const settings = await getSettings(client);
    const seq = await one<{ n: number }>(client, "select nextval('contract_reference_seq') as n");
    const reference = `CS-${new Date().getUTCFullYear()}-${String(seq?.n).padStart(4, '0')}`;
    const definition = template.definition;
    const title = input.title?.trim() || definition.title;

    const defStr = JSON.stringify(definition);
    const hasChange = /change\./.test(defStr);
    const hasSettlement = /settlement\./.test(defStr);
    const change = input.change ?? (hasChange ? { deliverables: [] } : undefined);
    const settlement = input.settlement ?? (hasSettlement ? { instalments: [] } : undefined);

    const content = contractContent.parse({
      template_key: definition.key,
      template_version: definition.version,
      lang: definition.lang,
      title,
      reference,
      contractor: contractorParty(settings),
      client: clientParty(party),
      project: {
        title: project?.title ?? '',
        ...(project?.description ? { description: project.description } : {}),
      },
      ...(parent ? { parent } : {}),
      ...(change ? { change } : {}),
      ...(settlement ? { settlement } : {}),
      terms: {
        ...(project?.scope_summary ? { scope_summary: project.scope_summary } : {}),
        deliverables: project?.deliverables ?? [],
        exclusions: project?.exclusions ?? [],
        ...(project?.start_date ? { start_date: project.start_date } : {}),
        ...(project?.target_date ? { delivery_date: project.target_date } : {}),
        ...(project?.price ? { price_amount: Number(project.price) } : {}),
        currency: project?.currency ?? settings.currency,
      },
      clauses: clausesFromTemplate(definition, template.review_status === 'lawyer_reviewed'),
    });
    const row = await one<ContractRow>(
      client,
      `insert into contracts (client_id, project_id, template_id, parent_contract_id, title, reference)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [
        input.clientId,
        input.projectId ?? null,
        template.id,
        input.parentId ?? null,
        title,
        reference,
      ],
    );
    const contract = row as ContractRow;
    await insertVersion(client, contract.id, 1, content, 'template');
    await audit(
      client,
      'contract.created',
      'contract',
      contract.id,
      { template: definition.key },
      ip,
    );
    return contract;
  });
}

async function lock(client: Tx, id: string) {
  const contract = await one<ContractRow>(
    client,
    'select * from contracts where id = $1 for update',
    [id],
  );
  if (!contract) throw new Rejected('Not found', 404);
  return contract;
}

// A new revision is always a new row. Editing after approval starts a new draft
// and leaves the approved one where it is.
async function addVersion(
  client: Tx,
  contract: ContractRow,
  content: ContractContent,
  source: VersionRow['source'],
) {
  if (!isEditable(contract.status)) {
    throw new Rejected('This contract is frozen. Prepare an additional agreement instead.');
  }
  const next = contract.current_version + 1;
  const version = await insertVersion(client, contract.id, next, content, source);
  const status: Status = ['approved', 'exported', 'sent'].includes(contract.status)
    ? 'draft'
    : contract.status;
  await client.query(
    'update contracts set current_version = $1, status = $2, title = $3, updated_at = now() where id = $4',
    [next, status, content.title, contract.id],
  );
  return version;
}

type ManualEdit = {
  title?: string | undefined;
  contract_date?: string | undefined;
  place?: string | undefined;
  project?: ContractContent['project'] | undefined;
  terms: ContractContent['terms'];
  clauses: { key: string; text: string; enabled: boolean }[];
  change?: ContractContent['change'] | undefined;
  settlement?: ContractContent['settlement'] | undefined;
};

export function applyManualEdit(base: ContractContent, edit: ManualEdit): ContractContent {
  const edits = new Map(edit.clauses.map((clause) => [clause.key, clause]));
  const clauses: Clause[] = base.clauses.map((clause) => {
    const change = edits.get(clause.key);
    if (!change) return clause;
    const bad = unknownPlaceholders(change.text);
    if (bad.length) throw new Rejected(`Unknown placeholder: ${bad[0]}`, 422);
    const edited = change.text.trim() !== clause.text.trim();
    return {
      ...clause,
      text: change.text,
      enabled: change.enabled,
      ...(edited ? { origin: 'manual' as const, review_status: 'unreviewed' as const } : {}),
    };
  });
  const next = { ...base, terms: edit.terms, clauses, title: edit.title?.trim() || base.title };
  delete next.contract_date;
  delete next.place;
  if (edit.contract_date) next.contract_date = edit.contract_date;
  if (edit.place) next.place = edit.place;
  if (edit.project) next.project = edit.project;
  if (edit.change) next.change = edit.change;
  if (edit.settlement) next.settlement = edit.settlement;
  return next;
}

export async function saveManualVersion(
  db: Db,
  id: string,
  edit: ManualEdit,
  ip: string | null = null,
) {
  return tx(db, async (client) => {
    const contract = await lock(client, id);
    const current = await getVersion(client, id, contract.current_version);
    if (!current) throw new Rejected('Not found', 404);
    const version = await addVersion(
      client,
      contract,
      applyManualEdit(current.content, edit),
      'manual',
    );
    await audit(client, 'contract.modified', 'contract', id, { version: version.version }, ip);
    return version;
  });
}

export const paymentProblems = (terms: ContractContent['terms']) => {
  const { payment_schedule: schedule, price_amount: price } = terms;
  if (!schedule.length || price === undefined) return [];
  const sum = schedule.reduce((total, item) => total + Math.round(item.amount * 100), 0);
  return sum === Math.round(price * 100)
    ? []
    : [`Payment milestones add up to ${(sum / 100).toFixed(2)}, the price is ${price.toFixed(2)}`];
};

export function approvalProblems(content: ContractContent): string[] {
  const model = buildDocument(content);
  return [...model.missing.map((name) => `Missing: ${name}`), ...paymentProblems(content.terms)];
}

export async function approveCurrent(
  db: Db,
  id: string,
  note: string | undefined,
  ip: string | null = null,
) {
  return tx(db, async (client) => {
    const contract = await lock(client, id);
    if (contract.status !== 'ready_for_review') {
      throw new Rejected('Move the contract to "ready for review" before approving it.');
    }
    const current = await getVersion(client, id, contract.current_version);
    if (!current) throw new Rejected('Not found', 404);
    const problems = approvalProblems(current.content);
    if (problems.length) throw new Rejected(problems.join('; '), 422);
    await client.query(
      `update contract_versions set approval_state = 'approved', approved_at = now(), approval_note = $1 where id = $2`,
      [note || null, current.id],
    );
    await client.query(
      `update contracts set status = 'approved', approved_version = $1, updated_at = now() where id = $2`,
      [current.version, id],
    );
    await audit(client, 'version.approved', 'contract', id, { version: current.version }, ip);
  });
}

export async function transition(db: Db, id: string, to: Status, ip: string | null = null) {
  return tx(db, async (client) => {
    const contract = await lock(client, id);
    if (!canTransition(contract.status, to)) {
      throw new Rejected(`A contract cannot go from ${contract.status} to ${to}.`);
    }
    const signed = to === 'signed';
    await client.query(
      `update contracts set status = $1, updated_at = now(),
         signature_status = case when $3 then 'signed' else signature_status end,
         signed_at = case when $3 then current_date else signed_at end
       where id = $2`,
      [to, id, signed],
    );
    await audit(client, 'contract.status', 'contract', id, { from: contract.status, to }, ip);
  });
}

export async function deleteContract(db: Db, config: Config, id: string, ip: string | null = null) {
  await tx(db, async (client) => {
    const contract = await lock(client, id);
    if (
      contract.approved_version !== null ||
      !['draft', 'needs_information'].includes(contract.status)
    ) {
      throw new Rejected('Only drafts that were never approved can be deleted. Archive this one.');
    }
    await client.query('delete from contracts where id = $1', [id]);
    await audit(client, 'contract.deleted', 'contract', id, { reference: contract.reference }, ip);
  });
  await rm(join(config.documentDir, id), { recursive: true, force: true });
}

// ------------------------------- AI proposals -------------------------------

export function applyProposalContent(
  base: ContractContent,
  proposal: ContractProposal,
): ContractContent {
  const clauses = [...base.clauses];
  for (const edit of proposal.clause_edits) {
    const index = clauses.findIndex((clause) => clause.key === edit.key);
    const text = edit.new_text?.trim();
    if (text && unknownPlaceholders(text).length) {
      throw new Rejected(`Proposal uses an unknown placeholder in ${edit.key}`, 422);
    }
    if (edit.op === 'add') {
      if (index >= 0) throw new Rejected(`Clause ${edit.key} already exists`, 422);
      const section = clauses.findLastIndex((clause) => clause.section_key === edit.section_key);
      const anchor = clauses[section];
      if (!anchor || !text) throw new Rejected(`Proposal cannot add ${edit.key}`, 422);
      clauses.splice(section + 1, 0, {
        section_key: anchor.section_key,
        section_title: anchor.section_title,
        key: edit.key,
        text,
        material: true,
        origin: 'ai',
        review_status: 'unreviewed',
        enabled: true,
        source_refs: [],
      });
      continue;
    }
    const existing = clauses[index];
    if (!existing) throw new Rejected(`Proposal refers to unknown clause ${edit.key}`, 422);
    if (edit.op === 'disable') {
      clauses[index] = { ...existing, enabled: false, origin: 'ai', review_status: 'unreviewed' };
    } else {
      if (!text) throw new Rejected(`Proposal has no text for ${edit.key}`, 422);
      clauses[index] = {
        ...existing,
        text,
        enabled: true,
        origin: 'ai',
        review_status: 'unreviewed',
      };
    }
  }
  return { ...base, terms: { ...base.terms, ...proposal.set_terms }, clauses };
}

// Amounts are the one fact the application can check for itself: a figure is
// kept only if the user or the contract already states it.
export function groundProposal(proposal: ContractProposal, sourceText: string): ContractProposal {
  const known = new Set(
    [...sourceText.matchAll(/\d[\d\s.,]*\d|\d/g)].map((match) =>
      match[0].replace(/[.,]\d{1,2}$/, '').replace(/\D/g, ''),
    ),
  );
  const isKnown = (amount: number) => known.has(String(Math.trunc(amount)));
  const questions = [...proposal.questions];
  const terms = { ...proposal.set_terms };
  if (terms.price_amount !== undefined && !isKnown(terms.price_amount)) {
    questions.push(`Please confirm the price; ${terms.price_amount} was not stated anywhere.`);
    delete terms.price_amount;
  }
  if (terms.payment_schedule?.some((item) => !isKnown(item.amount))) {
    questions.push('Please confirm the milestone amounts; some were not stated anywhere.');
    delete terms.payment_schedule;
  }
  return { ...proposal, set_terms: terms, questions };
}

export async function applyProposal(db: Db, proposalId: string, ip: string | null = null) {
  return tx(db, async (client) => {
    const proposal = await one<{
      id: string;
      contract_id: string | null;
      payload: ContractProposal;
      base_version: number | null;
      status: string;
    }>(client, 'select * from ai_proposals where id = $1 for update', [proposalId]);
    if (!proposal || !proposal.contract_id) throw new Rejected('Not found', 404);
    if (proposal.status !== 'pending') throw new Rejected('This proposal was already decided.');
    const contract = await lock(client, proposal.contract_id);
    if (proposal.base_version !== contract.current_version) {
      await client.query(
        `update ai_proposals set status = 'stale', decided_at = now() where id = $1`,
        [proposalId],
      );
      await audit(client, 'proposal.stale', 'contract', contract.id, {}, ip);
      return { stale: true as const };
    }
    const current = await getVersion(client, contract.id, contract.current_version);
    if (!current) throw new Rejected('Not found', 404);
    const version = await addVersion(
      client,
      contract,
      applyProposalContent(current.content, proposal.payload),
      'ai_proposal',
    );
    await client.query(
      `update ai_proposals set status = 'applied', applied_version = $1, decided_at = now() where id = $2`,
      [version.version, proposalId],
    );
    await audit(
      client,
      'proposal.applied',
      'contract',
      contract.id,
      { version: version.version },
      ip,
    );
    return { stale: false as const, version: version.version };
  });
}

export async function rejectProposal(db: Db, proposalId: string, ip: string | null = null) {
  const row = await one<{ contract_id: string | null }>(
    db,
    `update ai_proposals set status = 'rejected', decided_at = now()
     where id = $1 and status = 'pending' returning contract_id`,
    [proposalId],
  );
  if (!row) throw new Rejected('This proposal was already decided.');
  await audit(db, 'proposal.rejected', 'contract', row.contract_id, {}, ip);
}

// ------------------------------ Change requests ------------------------------

export async function prepareAdditionalAgreement(
  db: Db,
  changeRequestId: string,
  input: { price?: number | undefined; delivery_date?: string | undefined },
  ip: string | null = null,
) {
  const cr = await one<{
    id: string;
    contract_id: string;
    description: string;
    title: string;
    proposed_deliverables: string[];
    status: string;
  }>(db, 'select * from change_requests where id = $1', [changeRequestId]);
  if (!cr) throw new Rejected('Not found', 404);
  if (cr.status !== 'open')
    throw new Rejected('An agreement was already prepared for this request.');
  const parent = await getContract(db, cr.contract_id);
  if (!parent) throw new Rejected('Not found', 404);
  const parentVersion = await getVersion(
    db,
    parent.id,
    parent.approved_version ?? parent.current_version,
  );

  const additional = await createContract(
    db,
    {
      clientId: parent.client_id,
      projectId: parent.project_id ?? undefined,
      templateKey: 'additional-agreement',
      lang: parentVersion?.content.lang ?? 'bg',
      parentId: parent.id,
      parent: {
        reference: parent.reference,
        title: parent.title,
        ...(parentVersion?.content.contract_date
          ? { date: parentVersion.content.contract_date }
          : {}),
      },
      change: {
        description: cr.description,
        deliverables: cr.proposed_deliverables,
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.delivery_date ? { delivery_date: input.delivery_date } : {}),
      },
    },
    ip,
  );
  await db.query(
    `update change_requests set status = 'agreement_prepared', additional_contract_id = $1,
       price = $2, updated_at = now() where id = $3`,
    [additional.id, input.price ?? null, cr.id],
  );
  await audit(
    db,
    'change_request.agreement_prepared',
    'contract',
    parent.id,
    { additional: additional.id },
    ip,
  );
  return additional;
}

// --------------------------------- Exports -----------------------------------

export type DocumentRow = {
  id: string;
  contract_version_id: string;
  format: 'pdf' | 'docx';
  draft: boolean;
  filename: string;
  byte_size: number;
  sha256: string;
  storage_path: string;
  renderer_version: string;
  created_at: Date;
};

export const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

// Generated once per version and format, then served from disk after a checksum
// check: what downloads is exactly what was recorded.
export async function exportVersion(
  db: Db,
  config: Config,
  contractId: string,
  versionNumber: number,
  format: 'pdf' | 'docx',
  ip: string | null = null,
): Promise<{ row: DocumentRow; bytes: Uint8Array }> {
  const contract = await getContract(db, contractId);
  const version = contract && (await getVersion(db, contractId, versionNumber));
  if (!contract || !version) throw new Rejected('Not found', 404);

  const isDraft = version.approval_state !== 'approved';
  const existing = await one<DocumentRow>(
    db,
    'select * from generated_documents where contract_version_id = $1 and format = $2 and draft = $3',
    [version.id, format, isDraft],
  );
  if (existing) {
    const bytes = new Uint8Array(await readFile(join(config.documentDir, existing.storage_path)));
    if (sha256(bytes) !== existing.sha256) throw new Error('Stored document failed its checksum');
    await audit(
      db,
      'document.downloaded',
      'contract',
      contractId,
      { version: versionNumber, format, draft: isDraft },
      ip,
    );
    if (!isDraft && contract.status === 'approved') {
      await db.query(`update contracts set status = 'exported', updated_at = now() where id = $1`, [
        contractId,
      ]);
    }
    return { row: existing, bytes };
  }

  const settings = await getSettings(db);
  const model = buildDocument(version.content);
  const options = {
    draft: isDraft,
    timestamp: version.approved_at ?? version.created_at,
    pageNumbers: settings.page_numbers,
  };
  const bytes =
    format === 'pdf' ? await renderPdf(model, options) : await renderDocx(model, options);
  const storageName = isDraft ? `${version.id}.draft.${format}` : `${version.id}.${format}`;
  const storagePath = join(contractId, storageName);
  await mkdir(join(config.documentDir, contractId), { recursive: true });
  await writeFile(join(config.documentDir, storagePath), bytes);
  await db.query(
    `insert into generated_documents (contract_version_id, format, draft, filename, byte_size, sha256, storage_path, renderer_version)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (contract_version_id, format, draft) do nothing`,
    [
      version.id,
      format,
      isDraft,
      safeFilename(
        version.content.template_key,
        version.content.reference,
        version.version,
        format,
        isDraft,
      ),
      bytes.length,
      sha256(bytes),
      storagePath,
      RENDERER_VERSION,
    ],
  );
  const row = (await one<DocumentRow>(
    db,
    'select * from generated_documents where contract_version_id = $1 and format = $2 and draft = $3',
    [version.id, format, isDraft],
  )) as DocumentRow;
  await audit(
    db,
    'document.exported',
    'contract',
    contractId,
    { version: versionNumber, format, draft: isDraft },
    ip,
  );
  if (!isDraft && contract.status === 'approved') {
    await db.query(`update contracts set status = 'exported', updated_at = now() where id = $1`, [
      contractId,
    ]);
  }
  return { row, bytes };
}

export const documentsFor = (db: Queryable, contractId: string) =>
  many<DocumentRow & { version: number }>(
    db,
    `select d.*, v.version from generated_documents d
     join contract_versions v on v.id = d.contract_version_id
     where v.contract_id = $1 order by v.version desc, d.format`,
    [contractId],
  );
