// One document model, three outputs. Preview, PDF and DOCX all walk the same
// blocks, so a version cannot read differently depending on how it was opened.
import type { ContractContent } from './schema.ts';

export type Block =
  | { t: 'title'; text: string }
  | { t: 'meta'; text: string }
  | { t: 'para'; text: string }
  | { t: 'section'; text: string }
  | { t: 'article'; label: string; text: string; items: string[] }
  | { t: 'signatures'; left: [string, string]; right: [string, string] };

export type DocumentModel = {
  blocks: Block[];
  missing: string[];
  lang: 'bg' | 'en';
  title: string;
};

const LABELS = {
  bg: {
    missing: 'ЛИПСВА',
    article: 'Чл.',
    reference: 'Рег. №',
    intro: 'Настоящият документ се сключи между:',
    partyContractor: 'Изпълнител',
    partyClient: 'Възложител',
    contractor: 'ИЗПЪЛНИТЕЛ',
    client: 'ВЪЗЛОЖИТЕЛ',
    forContractor: 'ЗА ИЗПЪЛНИТЕЛЯ',
    forClient: 'ЗА ВЪЗЛОЖИТЕЛЯ',
    address: 'адрес',
    eik: 'ЕИК',
    vat: 'ДДС №',
    by: 'представлявано от',
    called: 'наричан по-долу',
    individual: 'физическо лице',
    and: 'и',
    draft: 'ЧЕРНОВА — НЕ Е УТВЪРДЕНА',
    date: 'Дата',
    place: 'Място',
  },
  en: {
    missing: 'MISSING',
    article: 'Art.',
    reference: 'Ref.',
    intro: 'This document is concluded between:',
    partyContractor: 'Contractor',
    partyClient: 'Client',
    contractor: 'CONTRACTOR',
    client: 'CLIENT',
    forContractor: 'FOR THE CONTRACTOR',
    forClient: 'FOR THE CLIENT',
    address: 'address',
    eik: 'UIC',
    vat: 'VAT No.',
    by: 'represented by',
    called: 'hereinafter',
    individual: 'natural person',
    and: 'and',
    draft: 'DRAFT — NOT APPROVED',
    date: 'Date',
    place: 'Place',
  },
} as const;

export const formatMoney = (amount: number, currency: string, lang: 'bg' | 'en') => {
  const number = new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${number} ${currency}`;
};

export const formatDate = (iso: string | undefined, lang: 'bg' | 'en') => {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  if (lang === 'bg') {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y} г.`;
  }
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
};

const FIELD_LABELS: Record<string, { bg: string; en: string }> = {
  'contract.date': { bg: 'Дата на договора', en: 'Contract date' },
  'contract.place': { bg: 'Място', en: 'Place' },
  'contractor.name': { bg: 'Име на изпълнителя', en: 'Contractor name' },
  'client.name': { bg: 'Име на възложителя', en: 'Client name' },
  'client.representative': { bg: 'Представител', en: 'Representative' },
  'project.title': { bg: 'Наименование на проекта', en: 'Project title' },
  'project.description': { bg: 'Описание', en: 'Description' },
  'terms.scope_summary': { bg: 'Обхват', en: 'Scope' },
  'terms.start_date': { bg: 'Начална дата', en: 'Start date' },
  'terms.delivery_date': { bg: 'Срок за предаване', en: 'Delivery date' },
  'terms.price': { bg: 'Цена', en: 'Price' },
  'terms.price_basis': { bg: 'Брутно/нетно', en: 'Gross/net basis' },
  'terms.payment_days': { bg: 'Срок за плащане (дни)', en: 'Payment term (days)' },
  'terms.acceptance_days': { bg: 'Срок за приемане (дни)', en: 'Acceptance period (days)' },
  'terms.revision_rounds': { bg: 'Брой ревизии', en: 'Revision rounds' },
  'terms.warranty_days': { bg: 'Гаранционен срок (дни)', en: 'Warranty (days)' },
  'terms.additional_work_rate': { bg: 'Цена за допълнителна работа', en: 'Additional work rate' },
  'terms.notice_days': { bg: 'Срок на предизвестие (дни)', en: 'Notice (days)' },
  'terms.liability_cap': { bg: 'Лимит на отговорност', en: 'Liability cap' },
  'terms.dispute_forum': { bg: 'Решаване на спорове', en: 'Dispute forum' },
  'terms.support_terms': { bg: 'Поддръжка', en: 'Support' },
  'terms.hosting_terms': { bg: 'Хостинг и външни услуги', en: 'Hosting' },
  'terms.ip_terms': { bg: 'Интелектуална собственост', en: 'IP terms' },
  'parent.reference': { bg: 'Основен договор', en: 'Parent contract' },
  'parent.date': { bg: 'Дата на основния договор', en: 'Parent date' },
  'parent.title': { bg: 'Заглавие на основния договор', en: 'Parent title' },
  'change.description': { bg: 'Описание на промяната', en: 'Change description' },
  'change.price': { bg: 'Цена на промяната', en: 'Change price' },
  'change.delivery_date': { bg: 'Срок на промяната', en: 'Change delivery date' },
  'settlement.amount': { bg: 'Сума за уреждане', en: 'Settlement amount' },
  'settlement.due_date': { bg: 'Падеж', en: 'Due date' },
  'settlement.reason': { bg: 'Основание', en: 'Reason' },
};

export const fieldLabel = (name: string, lang: 'bg' | 'en') => FIELD_LABELS[name]?.[lang] ?? name;

function variables(c: ContractContent): Record<string, string | undefined> {
  const { lang, terms: t } = c;
  const date = (value?: string) => formatDate(value, lang);
  const money = (value?: number) =>
    value === undefined ? undefined : formatMoney(value, t.currency, lang);
  const count = (value?: number) => (value === undefined ? undefined : String(value));
  return {
    'contract.reference': c.reference,
    'contract.date': date(c.contract_date),
    'contract.place': c.place,
    'contractor.name': c.contractor.name || undefined,
    'client.name': c.client.name || undefined,
    'client.representative': c.client.representative,
    'project.title': c.project.title || undefined,
    'project.description': c.project.description,
    'terms.scope_summary': t.scope_summary,
    'terms.start_date': date(t.start_date),
    'terms.delivery_date': date(t.delivery_date),
    'terms.price': money(t.price_amount),
    'terms.price_basis': t.price_basis,
    'terms.payment_days': count(t.payment_days),
    'terms.acceptance_days': count(t.acceptance_days),
    'terms.revision_rounds': count(t.revision_rounds),
    'terms.warranty_days': count(t.warranty_days),
    'terms.additional_work_rate': t.additional_work_rate,
    'terms.notice_days': count(t.notice_days),
    'terms.liability_cap': t.liability_cap,
    'terms.dispute_forum': t.dispute_forum,
    'terms.support_terms': t.support_terms,
    'terms.hosting_terms': t.hosting_terms,
    'terms.ip_terms': t.ip_terms,
    'parent.reference': c.parent?.reference,
    'parent.date': date(c.parent?.date),
    'parent.title': c.parent?.title,
    'change.description': c.change?.description,
    'change.price': money(c.change?.price),
    'change.delivery_date': date(c.change?.delivery_date),
    'settlement.amount': money(c.settlement?.amount),
    'settlement.due_date': date(c.settlement?.due_date),
    'settlement.reason': c.settlement?.reason,
  };
}

function listItems(c: ContractContent, name: string | undefined): string[] {
  const { lang, terms: t } = c;
  switch (name) {
    case 'terms.deliverables':
      return t.deliverables;
    case 'terms.exclusions':
      return t.exclusions;
    case 'terms.acceptance_criteria':
      return t.acceptance_criteria;
    case 'terms.payment_schedule':
      return t.payment_schedule.map((m) =>
        [m.label, formatMoney(m.amount, t.currency, lang), m.due].filter(Boolean).join(' — '),
      );
    case 'change.deliverables':
      return c.change?.deliverables ?? [];
    case 'settlement.instalments':
      return c.settlement?.instalments ?? [];
    default:
      return [];
  }
}

function partyLine(role: string, p: ContractContent['client'], lang: 'bg' | 'en'): string {
  const L = LABELS[lang];
  const missing = `[${L.missing}: ${role}]`;
  const parts = [p.name || missing];
  if (p.kind === 'individual') parts.push(L.individual);
  if (p.eik) parts.push(`${L.eik} ${p.eik}`);
  if (p.vat_id) parts.push(`${L.vat} ${p.vat_id}`);
  parts.push(`${L.address}: ${p.address || `[${L.missing}: ${L.address}]`}`);
  if (p.kind === 'legal_entity' && p.representative) parts.push(`${L.by} ${p.representative}`);
  return `${parts.join(', ')}, ${L.called} „${role}“`;
}

export function buildDocument(c: ContractContent): DocumentModel {
  const L = LABELS[c.lang];
  const vars = variables(c);
  const missing = new Set<string>();
  const fill = (text: string) =>
    text
      .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, name: string) => {
        const value = vars[name];
        if (value) return value;
        missing.add(name);
        return `[${L.missing}: ${fieldLabel(name, c.lang)}]`;
      })
      // A date ending in "г." at the end of a sentence.
      .replace(/ г\.\./g, ' г.');

  const blocks: Block[] = [{ t: 'title', text: c.title }];
  blocks.push({ t: 'meta', text: `${L.reference} ${c.reference}` });
  if (c.contract_date || c.place) {
    blocks.push({
      t: 'meta',
      text: [
        c.contract_date && `${L.date}: ${formatDate(c.contract_date, c.lang)}`,
        c.place && `${L.place}: ${c.place}`,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }
  blocks.push({ t: 'para', text: L.intro });
  blocks.push({ t: 'para', text: partyLine(L.partyClient, c.client, c.lang) });
  blocks.push({ t: 'para', text: L.and });
  blocks.push({ t: 'para', text: partyLine(L.partyContractor, c.contractor, c.lang) });
  if (!c.client.name) missing.add('client.name');
  if (!c.contractor.name) missing.add('contractor.name');

  let article = 0;
  let section = '';
  for (const clause of c.clauses) {
    if (!clause.enabled) continue;
    if (clause.section_key !== section) {
      section = clause.section_key;
      blocks.push({ t: 'section', text: clause.section_title });
    }
    article += 1;
    const items = listItems(c, clause.list);
    if (clause.list && items.length === 0) missing.add(clause.list);
    blocks.push({
      t: 'article',
      label: `${L.article} ${article}.`,
      text: fill(clause.text),
      items: clause.list && items.length === 0 ? [`[${L.missing}]`] : items.map(fill),
    });
  }

  blocks.push({
    t: 'signatures',
    left: [L.forClient, c.client.name || '............................'],
    right: [L.forContractor, c.contractor.name || '............................'],
  });
  return { blocks, missing: [...missing], lang: c.lang, title: c.title };
}

export const draftMark = (lang: 'bg' | 'en') => LABELS[lang].draft;

const escape = (value: string) => value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const inline = (value: string) =>
  escape(value).replace(/\[(ЛИПСВА|MISSING)(: [^\]]*)?\]/g, '<mark>$&</mark>');

export function toHtml(model: DocumentModel): string {
  const out = model.blocks.map((block) => {
    switch (block.t) {
      case 'title':
        return `<h1>${inline(block.text)}</h1>`;
      case 'meta':
        return `<p class="doc-meta">${inline(block.text)}</p>`;
      case 'para':
        return `<p>${inline(block.text)}</p>`;
      case 'section':
        return `<h2>${inline(block.text)}</h2>`;
      case 'article': {
        const items = block.items.length
          ? `<ol type="a">${block.items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`
          : '';
        return `<div class="doc-article"><p><b>${escape(block.label)}</b> ${inline(block.text)}</p>${items}</div>`;
      }
      case 'signatures':
        return `<div class="doc-signatures">${[block.left, block.right]
          .map(
            ([role, name]) =>
              `<div><b>${escape(role)}</b><span class="doc-line"></span><span>${escape(name)}</span></div>`,
          )
          .join('')}</div>`;
    }
  });
  return `<article class="doc" lang="${model.lang}">${out.join('')}</article>`;
}

// ASCII only and never a personal identifier: reference plus version.
export const safeFilename = (
  templateKey: string,
  reference: string,
  version: number,
  ext: string,
  draft = false,
) => {
  const clean = (value: string) =>
    value
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  const tag = draft ? `-v${version}-draft` : `-v${version}`;
  return `${clean(templateKey) || 'contract'}-${clean(reference) || 'draft'}${tag}.${ext}`;
};
