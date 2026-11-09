import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { createApp } from '../src/app.ts';
import { createSession } from '../src/auth.ts';
import { BASE, loadConfig, type Config } from '../src/config.ts';
import { createContract } from '../src/contracts.ts';
import { createPool, migrate, one, type Db } from '../src/db.ts';
import { seedTemplates } from '../src/templates.ts';

export const ORIGIN = 'https://studio.test';
export const SECRET = 'proxy-secret-for-tests';
export { BASE };

export async function freshDb(): Promise<{ db: Db; url: string; drop: () => Promise<void> }> {
  const admin = process.env['TEST_PG_URL'];
  if (!admin) throw new Error('Run through `npm test`');
  const name = `t_${randomBytes(6).toString('hex')}`;
  const root = new pg.Client({ connectionString: admin });
  await root.connect();
  await root.query(`create database ${name}`);
  await root.end();
  const url = admin.replace(/\/postgres$/, `/${name}`);
  const db = createPool(url);
  await migrate(db);
  await seedTemplates(db);
  await db.query(`insert into settings (id, data) values (true, $1)`, [
    { profile: { legal_name: 'Тест Тестов', address: 'гр. Варна', email: 'dev@example.test' } },
  ]);
  return { db, url, drop: () => db.end() };
}

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    ...loadConfig({
      APP_ORIGIN: ORIGIN,
      RP_ID: 'studio.test',
      PROXY_SHARED_SECRET: SECRET,
      DATABASE_URL: 'unused',
      DOCUMENT_DIR: mkdtempSync(join(tmpdir(), 'studio-docs-')),
    }),
    ...overrides,
  };
}

export function harness(db: Db, config: Config, baseURL?: string) {
  const anthropic = baseURL
    ? new Anthropic({ apiKey: 'sk-test-key-do-not-leak', baseURL, maxRetries: 0 })
    : null;
  const app = createApp({ db, config, anthropic });
  let cookie = '';
  type Options = {
    method?: string;
    form?: Record<string, string>;
    json?: unknown;
    origin?: string | null;
    secret?: string | null;
    noCookie?: boolean;
  };
  const call = (path: string, options: Options = {}) => {
    const headers = new Headers();
    if (options.secret !== null) headers.set('x-studio-proxy-secret', options.secret ?? SECRET);
    if (cookie && !options.noCookie) headers.set('cookie', cookie);
    let body: BodyInit | undefined;
    if (options.form) {
      headers.set('content-type', 'application/x-www-form-urlencoded');
      body = new URLSearchParams(options.form).toString();
    }
    if (options.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(options.json);
    }
    const method = options.method ?? (body !== undefined ? 'POST' : 'GET');
    if (method !== 'GET' && options.origin !== null)
      headers.set('origin', options.origin ?? ORIGIN);
    const url = path.startsWith(BASE) || path === '/healthz' ? path : `${BASE}${path}`;
    return app.request(url, { method, headers, ...(body !== undefined ? { body } : {}) });
  };
  return {
    app,
    call,
    login: async () => {
      const token = await createSession(db, config, 'test', '127.0.0.1');
      cookie = `__Host-studio=${token}`;
      return token;
    },
    setCookie: (value: string) => {
      cookie = value;
    },
  };
}

export async function fixtures(db: Db) {
  const client = await one<{ id: string }>(
    db,
    `insert into clients (kind, name, contact_person, email, address, eik, notes)
     values ('legal_entity', 'Примерна Фирма ЕООД', 'Иван Примеров', 'client-secret@example.test', 'гр. София, ул. Примерна 1', '123456789', 'INTERNAL-NOTE-XYZ') returning id`,
  );
  const project = await one<{ id: string }>(
    db,
    `insert into projects (client_id, title, description, deliverables, exclusions, price)
     values ($1, 'Платформа за курсове', 'Онлайн обучение', '["Сайт","Админ панел"]', '["Мобилно приложение"]', 2500) returning id`,
    [client?.id],
  );
  const contract = await createContract(db, {
    clientId: client!.id,
    projectId: project!.id,
    templateKey: 'software-development',
    lang: 'bg',
  });
  return { clientId: client!.id, projectId: project!.id, contract };
}

export const completeTerms = {
  scope_summary: 'Изработка на платформа',
  deliverables: ['Сайт'],
  exclusions: ['Мобилно приложение'],
  acceptance_criteria: ['Работи'],
  start_date: '2026-12-01',
  delivery_date: '2027-03-01',
  price_amount: 2500,
  currency: 'EUR',
  price_basis: 'бруто',
  payment_schedule: [
    { label: 'Аванс', amount: 1000, due: 'при подписване' },
    { label: 'Финал', amount: 1500, due: 'при приемане' },
  ],
  payment_days: 10,
  acceptance_days: 7,
  revision_rounds: 2,
  warranty_days: 30,
  additional_work_rate: '40 EUR на час',
  notice_days: 14,
  liability_cap: 'размера на договореното възнаграждение',
  dispute_forum: 'компетентния български съд',
  support_terms: 'Не е включена',
  hosting_terms: 'За сметка на Възложителя',
  ip_terms: 'прехвърляне след пълно плащане',
};
