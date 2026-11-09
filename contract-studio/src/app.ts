import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Anthropic from '@anthropic-ai/sdk';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { stream as honoStream } from 'hono/streaming';
import { z, ZodError } from 'zod';
import { monthSpend, Refused, runTurn } from './ai.ts';
import {
  authenticationOptions,
  cookieName,
  createSession,
  finishAuthentication,
  finishRegistration,
  listCredentials,
  loadSession,
  RateLimiter,
  registrationOptions,
  revokeSession,
  safeEqual,
  setupAllowed,
  type Session,
} from './auth.ts';
import { ALLOWED_MODELS, BASE, type Config } from './config.ts';
import {
  applyManualEdit,
  applyProposal,
  approveCurrent,
  createContract,
  deleteContract,
  documentsFor,
  exportVersion,
  getContract,
  getSettings,
  getVersion,
  MIME,
  prepareAdditionalAgreement,
  Rejected,
  rejectProposal,
  saveManualVersion,
  STATUSES,
  transition,
} from './contracts.ts';
import { audit, many, one, type Db } from './db.ts';
import { buildDocument, toHtml } from './render.ts';
import {
  clientInput,
  projectInput,
  settingsData,
  terms as termsSchema,
  type ContractContent,
  type ContractProposal,
} from './schema.ts';
import * as v from './views.ts';

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const id = (name: string) => `:${name}{${UUID}}`;
const ASSETS = fileURLToPath(new URL('../assets', import.meta.url));
const require = createRequire(import.meta.url);
const fontPath = (pkg: string, file: string) =>
  join(dirname(require.resolve(`@fontsource-variable/${pkg}/package.json`)), 'files', file);
const FONTS: Record<string, [string, string]> = {
  'hubot.woff2': ['hubot-sans', 'hubot-sans-latin-standard-normal.woff2'],
  'mona.woff2': ['mona-sans', 'mona-sans-latin-wght-normal.woff2'],
  'martian.woff2': ['martian-mono', 'martian-mono-latin-wght-normal.woff2'],
  'cyrillic.woff2': ['tiktok-sans', 'tiktok-sans-cyrillic-wdth-normal.woff2'],
};
const serifPath = (weight: string) =>
  join(
    dirname(require.resolve('@expo-google-fonts/noto-serif/package.json')),
    weight,
    `NotoSerif_${weight}.ttf`,
  );
const SERIF: Record<string, string> = { 'serif.ttf': '400Regular', 'serif-bold.ttf': '700Bold' };
const PUBLIC_ASSETS = new Set([
  'studio.css',
  'auth.js',
  ...Object.keys(FONTS),
  ...Object.keys(SERIF),
]);
const PRIVATE_ASSETS = new Set(['studio.js']);
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

type Env = { Variables: { session: Session } };
export type Deps = { db: Db; config: Config; anthropic: Anthropic | null };

const form = async (c: Context) => (await c.req.parseBody()) as Record<string, string>;
const splitLines = (value: unknown) =>
  String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
const clientIp = (c: Context) => c.req.header('x-studio-client-ip')?.slice(0, 64) ?? null;
const flash = (c: Context) => ({ notice: c.req.query('notice'), error: c.req.query('error') });
const withNotice = (path: string, notice: string) => `${path}?notice=${encodeURIComponent(notice)}`;
const num = (value: unknown) => (value === '' || value === undefined ? undefined : Number(value));

function parseSchedule(text: unknown) {
  return splitLines(text).map((line) => {
    const [label = '', amount = '', due = ''] = line.split('|').map((part) => part.trim());
    return { label, amount: Number(amount.replace(/\s/g, '').replace(',', '.')), due };
  });
}

function parseEdit(body: Record<string, string>, base: ContractContent) {
  const terms = termsSchema.parse({
    scope_summary: body['scope_summary'],
    deliverables: splitLines(body['deliverables']),
    exclusions: splitLines(body['exclusions']),
    acceptance_criteria: splitLines(body['acceptance_criteria']),
    start_date: body['start_date'],
    delivery_date: body['delivery_date'],
    price_amount: body['price_amount'],
    currency: body['currency'] || 'EUR',
    price_basis: body['price_basis'],
    payment_schedule: parseSchedule(body['payment_schedule']),
    payment_days: body['payment_days'],
    acceptance_days: body['acceptance_days'],
    revision_rounds: body['revision_rounds'],
    warranty_days: body['warranty_days'],
    additional_work_rate: body['additional_work_rate'],
    notice_days: body['notice_days'],
    liability_cap: body['liability_cap'],
    dispute_forum: body['dispute_forum'],
    support_terms: body['support_terms'],
    hosting_terms: body['hosting_terms'],
    ip_terms: body['ip_terms'],
  });
  return {
    title: body['title'],
    contract_date:
      z.iso
        .date()
        .or(z.literal(''))
        .parse(body['contract_date'] ?? '') || undefined,
    place: body['place']?.trim() || undefined,
    project:
      'project_title' in body
        ? {
            title: body['project_title']?.trim() ?? '',
            ...(body['project_description']?.trim()
              ? { description: body['project_description'].trim() }
              : {}),
          }
        : undefined,
    terms,
    clauses: base.clauses.map((clause) => ({
      key: clause.key,
      text: body[`clause_text__${clause.key}`] ?? clause.text,
      enabled:
        `clause_text__${clause.key}` in body ? `clause_on__${clause.key}` in body : clause.enabled,
    })),
    change: base.change && {
      description: body['change_description']?.trim() || undefined,
      price: num(body['change_price']),
      delivery_date: body['change_delivery_date'] || undefined,
      deliverables: splitLines(body['change_deliverables']),
    },
    settlement: base.settlement && {
      amount: num(body['settlement_amount']),
      due_date: body['settlement_due_date'] || undefined,
      reason: body['settlement_reason']?.trim() || undefined,
      instalments: splitLines(body['settlement_instalments']),
    },
  };
}

export function createApp({ db, config, anthropic }: Deps) {
  const app = new Hono<Env>();
  const authLimiter = new RateLimiter(10, 60_000);
  const authGlobal = new RateLimiter(60, 60_000);
  const aiLimiter = new RateLimiter(config.aiRequestsPerMinute, 60_000);
  const mutationLimiter = new RateLimiter(240, 60_000);

  app.use('*', async (c, next) => {
    await next();
    c.header('Content-Security-Policy', CSP);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    // Not no-referrer: that makes browsers send "Origin: null" on form posts,
    // which the origin check below would refuse.
    c.header('Referrer-Policy', 'same-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
    c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    c.header('X-Robots-Tag', 'noindex, noarchive, nofollow');
    if (!c.req.path.startsWith(`${BASE}/assets/`)) c.header('Cache-Control', 'no-store');
  });

  app.get('/healthz', async (c) => {
    try {
      await db.query('select 1');
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 503);
    }
  });

  // Without the secret only the portfolio's proxy can reach anything else.
  app.use('*', async (c, next) => {
    if (config.proxySecret) {
      const given = c.req.header('x-studio-proxy-secret') ?? '';
      if (!safeEqual(given, config.proxySecret)) return c.html(v.notFound(), 404);
    }
    await next();
  });

  app.get('/workspace', (c) => c.redirect(BASE, 301));
  app.get('/workspace/', (c) => c.redirect(BASE, 301));

  app.use(
    `${BASE}/*`,
    bodyLimit({ maxSize: 512 * 1024, onError: (c) => c.text('Request too large', 413) }),
  );

  app.use(`${BASE}/*`, async (c, next) => {
    if (!['GET', 'HEAD'].includes(c.req.method)) {
      if (c.req.header('origin') !== config.appOrigin) return c.text('Forbidden', 403);
      if (!mutationLimiter.allow('all')) return c.text('Too many requests', 429);
    }
    await next();
  });

  app.get(`${BASE}/assets/:file`, async (c) => {
    const file = c.req.param('file')!;
    const isPrivate = PRIVATE_ASSETS.has(file);
    if (!isPrivate && !PUBLIC_ASSETS.has(file)) return c.html(v.notFound(), 404);
    if (isPrivate) {
      const token = getCookie(c, cookieName(config));
      if (!token || !(await loadSession(db, config, token, { rotate: false })))
        return c.text('Unauthorized', 401);
    }
    const font = FONTS[file];
    const serif = SERIF[file];
    const data = font
      ? await readFile(fontPath(font[0], font[1]))
      : serif
        ? await readFile(serifPath(serif))
        : await readFile(join(ASSETS, file));
    const type = file.endsWith('.css')
      ? 'text/css; charset=utf-8'
      : file.endsWith('.js')
        ? 'text/javascript; charset=utf-8'
        : serif
          ? 'font/ttf'
          : 'font/woff2';
    c.header(
      'Cache-Control',
      font || serif ? 'public, max-age=31536000, immutable' : 'private, no-cache',
    );
    return c.body(data, 200, { 'Content-Type': type });
  });

  const startSession = async (c: Context) => {
    const token = await createSession(db, config, c.req.header('user-agent') ?? null, clientIp(c));
    setSessionCookie(c, token);
  };
  const setSessionCookie = (c: Context, token: string) =>
    setCookie(c, cookieName(config), token, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'Strict',
      path: '/',
      maxAge: config.sessionMaxHours * 3600,
    });
  const limitAuth = (c: Context) =>
    authLimiter.allow(clientIp(c) ?? 'local') && authGlobal.allow('all');
  const authFailed = (c: Context) => {
    void audit(db, 'auth.failed', null, null, {}, clientIp(c));
    return c.json({ error: 'That did not work.' }, 401);
  };

  // ---------------------------------- Login ----------------------------------
  app.get(`${BASE}/login`, (c) => c.html(v.loginView()));
  app.post(`${BASE}/auth/options`, async (c) => {
    if (!limitAuth(c)) return c.json({ error: 'Too many attempts' }, 429);
    return c.json(await authenticationOptions(db, config));
  });
  app.post(`${BASE}/auth/verify`, async (c) => {
    if (!limitAuth(c)) return c.json({ error: 'Too many attempts' }, 429);
    const body = await c.req.json().catch(() => null);
    try {
      if (
        !body?.challengeId ||
        !(await finishAuthentication(db, config, String(body.challengeId), body.response))
      ) {
        return authFailed(c);
      }
    } catch {
      return authFailed(c);
    }
    await startSession(c);
    await audit(db, 'auth.login', null, null, {}, clientIp(c));
    return c.json({ ok: true, next: BASE });
  });

  app.get(`${BASE}/setup`, (c) =>
    config.setupToken ? c.html(v.setupView()) : c.html(v.notFound(), 404),
  );
  app.post(`${BASE}/setup/options`, async (c) => {
    if (!limitAuth(c)) return c.json({ error: 'Too many attempts' }, 429);
    const body = await c.req.json().catch(() => ({}));
    if (!(await setupAllowed(db, config, String(body.token ?? '')))) return authFailed(c);
    return c.json(await registrationOptions(db, config));
  });
  app.post(`${BASE}/setup/verify`, async (c) => {
    if (!limitAuth(c)) return c.json({ error: 'Too many attempts' }, 429);
    const body = await c.req.json().catch(() => ({}));
    const token = String(body.token ?? '');
    if (!(await setupAllowed(db, config, token))) return authFailed(c);
    try {
      if (
        !(await finishRegistration(
          db,
          config,
          String(body.challengeId),
          body.response,
          String(body.label ?? '').slice(0, 80),
          token,
        ))
      ) {
        return authFailed(c);
      }
    } catch {
      return authFailed(c);
    }
    await startSession(c);
    return c.json({ ok: true, next: `${BASE}/settings` });
  });

  // ---------------------- Everything below needs a session ---------------------
  app.use(`${BASE}/*`, async (c, next) => {
    const token = getCookie(c, cookieName(config));
    const session = token ? await loadSession(db, config, token) : null;
    if (!session) {
      if (c.req.method === 'GET' && !c.req.path.includes('/export/'))
        return c.redirect(`${BASE}/login`, 303);
      return c.json({ error: 'Authentication required' }, 401);
    }
    c.set('session', session);
    if (session.rotated) setSessionCookie(c, session.token);
    await next();
  });

  app.post(`${BASE}/logout`, async (c) => {
    await revokeSession(db, c.get('session').id);
    deleteCookie(c, cookieName(config), { path: '/', secure: config.secureCookies });
    await audit(db, 'auth.logout', null, null, {}, clientIp(c));
    return c.redirect(`${BASE}/login`, 303);
  });

  // -------------------------------- Dashboard ---------------------------------
  app.get(BASE, async (c) => {
    const stats = await one(
      db,
      `select (select count(*) from clients where archived_at is null) as clients,
         count(*) filter (where status in ('draft', 'needs_information')) as drafts,
         count(*) filter (where status = 'ready_for_review') as review,
         count(*) filter (where status = 'sent') as signature,
         count(*) filter (where status = 'active') as active
       from contracts`,
    );
    const recent = await many(
      db,
      `select d.id, d.title, d.reference, d.status, d.updated_at, c.name as client_name
       from contracts d join clients c on c.id = d.client_id order by d.updated_at desc limit 8`,
    );
    const deadlines = await many(
      db,
      `select p.id, p.title, p.target_date, c.name as client_name from projects p
       join clients c on c.id = p.client_id
       where p.target_date >= current_date and p.status in ('planned', 'active', 'on_hold')
       order by p.target_date limit 8`,
    );
    return c.html(
      v.page('Dashboard', 'dashboard', v.dashboardView(stats ?? {}, recent, deadlines), flash(c)),
    );
  });

  // --------------------------------- Clients ----------------------------------
  const clientValues = (data: z.infer<typeof clientInput>) => [
    data.kind,
    data.name,
    data.contact_person ?? null,
    data.email ?? null,
    data.phone ?? null,
    data.address ?? null,
    data.eik ?? null,
    data.vat_id ?? null,
    data.country,
    data.notes ?? null,
  ];
  app.get(`${BASE}/clients`, async (c) => {
    const showArchived = c.req.query('archived') === '1';
    const rows = await many(
      db,
      `select * from clients ${showArchived ? '' : 'where archived_at is null'} order by lower(name)`,
    );
    return c.html(v.page('Clients', 'clients', v.clientsView(rows, showArchived), flash(c)));
  });
  app.get(`${BASE}/clients/new`, (c) =>
    c.html(v.page('New client', 'clients', v.clientForm(), flash(c))),
  );
  app.post(`${BASE}/clients`, async (c) => {
    const data = clientInput.parse(await form(c));
    const row = await one<{ id: string }>(
      db,
      `insert into clients (kind, name, contact_person, email, phone, address, eik, vat_id, country, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      clientValues(data),
    );
    await audit(db, 'client.created', 'client', row?.id ?? null, {}, clientIp(c));
    return c.redirect(withNotice(`${BASE}/clients/${row?.id}`, 'Client saved'), 303);
  });
  app.get(`${BASE}/clients/${id('id')}`, async (c) => {
    const client = await one(db, 'select * from clients where id = $1', [c.req.param('id')!]);
    if (!client) return c.notFound();
    const projects = await many(
      db,
      'select id, title, status from projects where client_id = $1 order by created_at desc',
      [client['id']],
    );
    const contracts = await many(
      db,
      'select id, title, status from contracts where client_id = $1 order by created_at desc',
      [client['id']],
    );
    return c.html(
      v.page(
        String(client['name']),
        'clients',
        v.clientDetail(client, projects, contracts),
        flash(c),
      ),
    );
  });
  app.get(`${BASE}/clients/${id('id')}/edit`, async (c) => {
    const client = await one(db, 'select * from clients where id = $1', [c.req.param('id')!]);
    return client
      ? c.html(v.page('Edit client', 'clients', v.clientForm(client), flash(c)))
      : c.notFound();
  });
  app.post(`${BASE}/clients/${id('id')}`, async (c) => {
    const data = clientInput.parse(await form(c));
    const row = await one<{ id: string }>(
      db,
      `update clients set kind = $1, name = $2, contact_person = $3, email = $4, phone = $5, address = $6,
         eik = $7, vat_id = $8, country = $9, notes = $10, updated_at = now() where id = $11 returning id`,
      [...clientValues(data), c.req.param('id')!],
    );
    if (!row) return c.notFound();
    await audit(db, 'client.updated', 'client', row.id, {}, clientIp(c));
    return c.redirect(withNotice(`${BASE}/clients/${row.id}`, 'Client saved'), 303);
  });
  app.post(`${BASE}/clients/${id('id')}/archive`, async (c) => {
    const row = await one<{ id: string }>(
      db,
      `update clients set archived_at = case when archived_at is null then now() end, updated_at = now() where id = $1 returning id`,
      [c.req.param('id')!],
    );
    if (!row) return c.notFound();
    await audit(db, 'client.archive_toggled', 'client', row.id, {}, clientIp(c));
    return c.redirect(`${BASE}/clients/${row.id}`, 303);
  });

  // --------------------------------- Projects ---------------------------------
  const activeClients = () =>
    many(db, 'select id, name from clients where archived_at is null order by lower(name)');
  const parseProject = async (c: Context) => {
    const body = await form(c);
    return projectInput.parse({
      ...body,
      deliverables: splitLines(body['deliverables']),
      exclusions: splitLines(body['exclusions']),
    });
  };
  const projectValues = (d: z.infer<typeof projectInput>) => [
    d.client_id,
    d.title,
    d.description ?? null,
    d.scope_summary ?? null,
    JSON.stringify(d.deliverables),
    JSON.stringify(d.exclusions),
    d.start_date ?? null,
    d.target_date ?? null,
    d.price ?? null,
    d.currency,
    d.payment_structure ?? null,
    d.status,
    d.notes ?? null,
  ];
  app.get(`${BASE}/projects`, async (c) => {
    const rows = await many(
      db,
      'select p.*, c.name as client_name from projects p join clients c on c.id = p.client_id order by p.created_at desc',
    );
    return c.html(v.page('Projects', 'projects', v.projectsView(rows), flash(c)));
  });
  app.get(`${BASE}/projects/new`, async (c) =>
    c.html(
      v.page(
        'New project',
        'projects',
        v.projectForm(await activeClients(), undefined, c.req.query('client')),
        flash(c),
      ),
    ),
  );
  app.post(`${BASE}/projects`, async (c) => {
    const row = await one<{ id: string }>(
      db,
      `insert into projects (client_id, title, description, scope_summary, deliverables, exclusions, start_date, target_date, price, currency, payment_structure, status, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning id`,
      projectValues(await parseProject(c)),
    );
    await audit(db, 'project.created', 'project', row?.id ?? null, {}, clientIp(c));
    return c.redirect(withNotice(`${BASE}/projects/${row?.id}`, 'Project saved'), 303);
  });
  app.get(`${BASE}/projects/${id('id')}`, async (c) => {
    const project = await one(
      db,
      'select p.*, c.name as client_name from projects p join clients c on c.id = p.client_id where p.id = $1',
      [c.req.param('id')!],
    );
    if (!project) return c.notFound();
    const contracts = await many(
      db,
      'select id, title, status from contracts where project_id = $1 order by created_at desc',
      [project['id']],
    );
    return c.html(
      v.page(String(project['title']), 'projects', v.projectDetail(project, contracts), flash(c)),
    );
  });
  app.get(`${BASE}/projects/${id('id')}/edit`, async (c) => {
    const project = await one(db, 'select * from projects where id = $1', [c.req.param('id')!]);
    return project
      ? c.html(
          v.page(
            'Edit project',
            'projects',
            v.projectForm(await activeClients(), project),
            flash(c),
          ),
        )
      : c.notFound();
  });
  app.post(`${BASE}/projects/${id('id')}`, async (c) => {
    const row = await one<{ id: string }>(
      db,
      `update projects set client_id = $1, title = $2, description = $3, scope_summary = $4, deliverables = $5, exclusions = $6,
         start_date = $7, target_date = $8, price = $9, currency = $10, payment_structure = $11, status = $12, notes = $13, updated_at = now()
       where id = $14 returning id`,
      [...projectValues(await parseProject(c)), c.req.param('id')!],
    );
    if (!row) return c.notFound();
    await audit(db, 'project.updated', 'project', row.id, {}, clientIp(c));
    return c.redirect(withNotice(`${BASE}/projects/${row.id}`, 'Project saved'), 303);
  });

  // -------------------------------- Contracts ---------------------------------
  const templateChoices = () =>
    many(
      db,
      `select distinct on (key, lang) id, key, lang, name, version, review_status from contract_templates order by key, lang, string_to_array(version, '.')::int[] desc`,
    );

  app.get(`${BASE}/documents`, async (c) => {
    const rows = await many(
      db,
      'select d.*, c.name as client_name from contracts d join clients c on c.id = d.client_id order by d.updated_at desc',
    );
    return c.html(v.page('Contracts', 'documents', v.documentsView(rows), flash(c)));
  });
  app.get(`${BASE}/documents/new`, async (c) => {
    const projects = await many(
      db,
      'select p.id, p.title, c.name as client_name from projects p join clients c on c.id = p.client_id order by p.created_at desc',
    );
    const contracts = await many(
      db,
      'select c.id, c.title, c.reference, cl.name as client_name from contracts c join clients cl on cl.id = c.client_id order by c.created_at desc',
    );
    const templates = (await templateChoices()).filter((t) => t['lang'] === 'bg');
    return c.html(
      v.page(
        'New contract',
        'documents',
        v.newDocumentView(
          await activeClients(),
          projects,
          templates,
          await getSettings(db),
          contracts,
          c.req.query('client'),
          c.req.query('project'),
          c.req.query('parent'),
        ),
        flash(c),
      ),
    );
  });
  app.post(`${BASE}/documents`, async (c) => {
    const body = await form(c);
    const data = z
      .object({
        client_id: z.uuid(),
        project_id: z.union([z.uuid(), z.literal('')]).optional(),
        parent_id: z.union([z.uuid(), z.literal('')]).optional(),
        template_key: z.string().regex(/^[a-z-]+$/),
        lang: z.enum(['bg', 'en']),
      })
      .parse(body);
    const contract = await createContract(
      db,
      {
        clientId: data.client_id,
        projectId: data.project_id || undefined,
        parentId: data.parent_id || undefined,
        templateKey: data.template_key,
        lang: data.lang,
      },
      clientIp(c),
    );
    return c.redirect(`${BASE}/documents/${contract.id}`, 303);
  });

  async function conversationFor(contractId: string, title: string) {
    const found = await one<{ id: string }>(
      db,
      'select id from ai_conversations where contract_id = $1 order by created_at limit 1',
      [contractId],
    );
    if (found) return found.id;
    return (
      await one<{ id: string }>(
        db,
        'insert into ai_conversations (contract_id, title) values ($1, $2) returning id',
        [contractId, title.slice(0, 200)],
      )
    )?.id as string;
  }

  app.get(`${BASE}/documents/${id('id')}`, async (c) => {
    const contract = await getContract(db, c.req.param('id')!);
    if (!contract) return c.notFound();
    const current = await getVersion(db, contract.id, contract.current_version);
    const wanted = Number(c.req.query('v') ?? contract.current_version);
    const shown = Number.isInteger(wanted) ? await getVersion(db, contract.id, wanted) : undefined;
    if (!current || !shown) return c.notFound();
    const conversationId = await conversationFor(contract.id, contract.title);
    const [versions, documents, messages, proposals, changeRequests, template, parent] =
      await Promise.all([
        many(db, 'select * from contract_versions where contract_id = $1 order by version desc', [
          contract.id,
        ]),
        documentsFor(db, contract.id),
        many(
          db,
          'select role, content, state from ai_messages where conversation_id = $1 order by created_at',
          [conversationId],
        ),
        many(
          db,
          "select * from ai_proposals where contract_id = $1 and status = 'pending' order by created_at",
          [contract.id],
        ),
        many(db, 'select * from change_requests where contract_id = $1 order by created_at desc', [
          contract.id,
        ]),
        one<{ review_status: string }>(
          db,
          'select review_status from contract_templates where id = $1',
          [contract.template_id],
        ),
        contract.parent_contract_id ? getContract(db, contract.parent_contract_id) : undefined,
      ]);
    return c.html(
      v.page(
        contract.title,
        'documents',
        v.workspaceView({
          contract,
          shown,
          current,
          versions: versions as never,
          documents,
          conversationId,
          messages,
          proposals,
          changeRequests,
          parent,
          reviewStatus: template?.review_status ?? 'unreviewed',
        }),
        flash(c),
        true,
      ),
    );
  });

  app.post(`${BASE}/documents/${id('id')}/preview`, async (c) => {
    const contract = await getContract(db, c.req.param('id')!);
    const current = contract && (await getVersion(db, contract.id, contract.current_version));
    if (!current) return c.notFound();
    const next = applyManualEdit(current.content, parseEdit(await form(c), current.content));
    return c.html(toHtml(buildDocument(next)));
  });

  app.post(`${BASE}/documents/${id('id')}/save`, async (c) => {
    const contractId = c.req.param('id')!;
    const contract = await getContract(db, contractId);
    const current = contract && (await getVersion(db, contract.id, contract.current_version));
    if (!current) return c.notFound();
    const version = await saveManualVersion(
      db,
      contractId,
      parseEdit(await form(c), current.content),
      clientIp(c),
    );
    return c.redirect(
      withNotice(`${BASE}/documents/${contractId}`, `Saved as v${version.version}`),
      303,
    );
  });

  app.post(`${BASE}/documents/${id('id')}/status`, async (c) => {
    const to = z.enum(STATUSES).parse((await form(c))['to']);
    await transition(db, c.req.param('id')!, to, clientIp(c));
    return c.redirect(`${BASE}/documents/${c.req.param('id')!}`, 303);
  });

  app.post(`${BASE}/documents/${id('id')}/approve`, async (c) => {
    await approveCurrent(db, c.req.param('id')!, (await form(c))['note'], clientIp(c));
    return c.redirect(
      withNotice(`${BASE}/documents/${c.req.param('id')!}`, 'Version approved and frozen'),
      303,
    );
  });

  app.post(`${BASE}/documents/${id('id')}/delete`, async (c) => {
    await deleteContract(db, config, c.req.param('id')!, clientIp(c));
    return c.redirect(withNotice(`${BASE}/documents`, 'Draft deleted'), 303);
  });

  app.get(`${BASE}/documents/${id('id')}/export/:version{[0-9]+}/:format{pdf|docx}`, async (c) => {
    const format = c.req.param('format') as 'pdf' | 'docx';
    const { row, bytes } = await exportVersion(
      db,
      config,
      c.req.param('id')!,
      Number(c.req.param('version')!),
      format,
      clientIp(c),
    );
    return c.body(bytes as Uint8Array<ArrayBuffer>, 200, {
      'Content-Type': MIME[format],
      'Content-Disposition': `attachment; filename="${row.filename}"`,
      'X-Content-SHA256': row.sha256,
    });
  });

  app.post(`${BASE}/proposals/${id('id')}/apply`, async (c) => {
    const proposal = await one<{ contract_id: string | null }>(
      db,
      'select contract_id from ai_proposals where id = $1',
      [c.req.param('id')!],
    );
    if (!proposal?.contract_id) return c.notFound();
    const result = await applyProposal(db, c.req.param('id')!, clientIp(c));
    const path = `${BASE}/documents/${proposal.contract_id}`;
    return result.stale
      ? c.redirect(
          `${path}?error=${encodeURIComponent('The contract changed since this proposal; ask Claude again.')}`,
          303,
        )
      : c.redirect(withNotice(path, `Applied as draft v${result.version}`), 303);
  });
  app.post(`${BASE}/proposals/${id('id')}/reject`, async (c) => {
    const proposal = await one<{ contract_id: string | null; conversation_id: string }>(
      db,
      'select contract_id, conversation_id from ai_proposals where id = $1',
      [c.req.param('id')!],
    );
    if (!proposal) return c.notFound();
    await rejectProposal(db, c.req.param('id')!, clientIp(c));
    return c.redirect(
      proposal.contract_id
        ? `${BASE}/documents/${proposal.contract_id}`
        : `${BASE}/assistant/${proposal.conversation_id}`,
      303,
    );
  });

  app.get(`${BASE}/proposals/${id('id')}/draft`, async (c) => {
    const proposal = await one(
      db,
      'select * from ai_proposals where id = $1 and contract_id is null',
      [c.req.param('id')!],
    );
    if (!proposal) return c.notFound();
    return c.html(
      v.page(
        'Create a draft',
        'assistant',
        v.draftFromProposalView(
          proposal,
          await activeClients(),
          (await templateChoices()).filter((t) => t['lang'] === 'bg'),
        ),
        flash(c),
      ),
    );
  });
  app.post(`${BASE}/proposals/${id('id')}/draft`, async (c) => {
    const proposal = await one<{
      id: string;
      conversation_id: string;
      status: string;
      payload: ContractProposal;
    }>(db, 'select * from ai_proposals where id = $1 and contract_id is null', [
      c.req.param('id')!,
    ]);
    if (!proposal) return c.notFound();
    if (proposal.status !== 'pending') throw new Rejected('This proposal was already decided.');
    const data = z
      .object({
        client_id: z.uuid(),
        project_title: z.string().trim().min(1).max(300),
        template_key: z.string().regex(/^[a-z-]+$/),
        lang: z.enum(['bg', 'en']),
      })
      .parse(await form(c));
    const client = await one(db, 'select 1 from clients where id = $1', [data.client_id]);
    if (!client) throw new Rejected('Unknown client', 422);
    const project = await one<{ id: string }>(
      db,
      'insert into projects (client_id, title) values ($1, $2) returning id',
      [data.client_id, data.project_title],
    );
    const contract = await createContract(
      db,
      {
        clientId: data.client_id,
        projectId: project?.id,
        templateKey: data.template_key,
        lang: data.lang,
      },
      clientIp(c),
    );
    await db.query('update ai_conversations set contract_id = $1 where id = $2', [
      contract.id,
      proposal.conversation_id,
    ]);
    await db.query(
      'update ai_proposals set contract_id = $1, base_version = 1 where conversation_id = $2',
      [contract.id, proposal.conversation_id],
    );
    await applyProposal(db, proposal.id, clientIp(c));
    return c.redirect(
      withNotice(`${BASE}/documents/${contract.id}`, 'Draft created from your review'),
      303,
    );
  });

  app.post(`${BASE}/change-requests/${id('id')}/agreement`, async (c) => {
    const data = z
      .object({
        price: z.preprocess(
          (value) => (value === '' ? undefined : value),
          z.coerce.number().min(0).optional(),
        ),
        delivery_date: z.iso.date().or(z.literal('')).optional(),
      })
      .parse(await form(c));
    const additional = await prepareAdditionalAgreement(
      db,
      c.req.param('id')!,
      { price: data.price, delivery_date: data.delivery_date || undefined },
      clientIp(c),
    );
    return c.redirect(
      withNotice(
        `${BASE}/documents/${additional.id}`,
        'Additional agreement prepared. The original contract was not changed.',
      ),
      303,
    );
  });
  app.post(`${BASE}/change-requests/${id('id')}/decline`, async (c) => {
    const row = await one<{ contract_id: string }>(
      db,
      "update change_requests set status = 'declined', updated_at = now() where id = $1 and status = 'open' returning contract_id",
      [c.req.param('id')!],
    );
    if (!row) return c.notFound();
    await audit(db, 'change_request.declined', 'contract', row.contract_id, {}, clientIp(c));
    return c.redirect(`${BASE}/documents/${row.contract_id}`, 303);
  });

  // ------------------------------- AI Assistant --------------------------------
  app.get(`${BASE}/assistant`, async (c) => {
    const rows = await many(
      db,
      'select a.*, d.reference from ai_conversations a left join contracts d on d.id = a.contract_id order by a.updated_at desc limit 100',
    );
    return c.html(v.page('AI Assistant', 'assistant', v.assistantView(rows), flash(c)));
  });
  app.post(`${BASE}/assistant`, async (c) => {
    const row = await one<{ id: string }>(
      db,
      "insert into ai_conversations (title) values ('New engagement') returning id",
    );
    return c.redirect(`${BASE}/assistant/${row?.id}`, 303);
  });
  app.get(`${BASE}/assistant/${id('id')}`, async (c) => {
    const conversation = await one<{ id: string; contract_id: string | null }>(
      db,
      'select id, contract_id from ai_conversations where id = $1',
      [c.req.param('id')!],
    );
    if (!conversation) return c.notFound();
    if (conversation.contract_id)
      return c.redirect(`${BASE}/documents/${conversation.contract_id}`, 303);
    const messages = await many(
      db,
      'select role, content, state from ai_messages where conversation_id = $1 order by created_at',
      [conversation.id],
    );
    const proposals = await many(
      db,
      "select * from ai_proposals where conversation_id = $1 and status = 'pending' order by created_at",
      [conversation.id],
    );
    return c.html(
      v.page(
        'AI Assistant',
        'assistant',
        v.conversationView(conversation.id, messages, proposals),
        flash(c),
      ),
    );
  });
  app.post(`${BASE}/assistant/${id('id')}/delete`, async (c) => {
    await db.query('delete from ai_conversations where id = $1', [c.req.param('id')!]);
    await audit(db, 'conversation.deleted', 'conversation', c.req.param('id')!, {}, clientIp(c));
    return c.redirect(withNotice(`${BASE}/assistant`, 'Conversation deleted'), 303);
  });

  app.post(`${BASE}/chat/${id('id')}`, async (c) => {
    const conversation = await one<{ id: string; contract_id: string | null }>(
      db,
      'select id, contract_id from ai_conversations where id = $1',
      [c.req.param('id')!],
    );
    if (!conversation) return c.json({ error: 'Not found' }, 404);
    const body = z
      .object({ message: z.string().trim().min(1).max(config.maxMessageChars) })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'Invalid message' }, 422);
    if (!aiLimiter.allow('all')) return c.json({ error: 'Too many requests. Wait a moment.' }, 429);
    if (!anthropic)
      return c.json(
        {
          error:
            'Claude is not configured: ANTHROPIC_API_KEY is missing. Everything else still works.',
        },
        503,
      );
    if ((await monthSpend(db)) >= config.monthlyBudgetUsd)
      return c.json(
        { error: `This month's estimated spend reached the $${config.monthlyBudgetUsd} limit.` },
        402,
      );

    const signal = c.req.raw.signal;
    c.header('Content-Type', 'application/x-ndjson; charset=utf-8');
    c.header('X-Accel-Buffering', 'no');
    return honoStream(c, async (out) => {
      const controller = new AbortController();
      out.onAbort(() => controller.abort());
      signal.addEventListener('abort', () => controller.abort(), { once: true });
      try {
        await runTurn(
          { db, config, anthropic },
          conversation,
          body.data.message,
          controller.signal,
          async (event) => {
            if (!controller.signal.aborted) await out.writeln(JSON.stringify(event));
          },
          clientIp(c),
        );
      } catch (error) {
        const message =
          error instanceof Refused ? error.message : 'Claude could not complete that request.';
        await out.writeln(JSON.stringify({ t: 'error', message })).catch(() => {});
      }
    });
  });

  // -------------------------------- Templates ---------------------------------
  app.get(`${BASE}/templates`, async (c) =>
    c.html(v.page('Templates', 'templates', v.templatesView(await templateChoices()), flash(c))),
  );
  app.get(`${BASE}/templates/${id('id')}`, async (c) => {
    const row = await one(db, 'select * from contract_templates where id = $1', [
      c.req.param('id')!,
    ]);
    return row
      ? c.html(v.page(String(row['name']), 'templates', v.templateDetail(row), flash(c)))
      : c.notFound();
  });
  app.post(`${BASE}/templates/${id('id')}/review`, async (c) => {
    const data = z
      .object({ reviewer: z.string().trim().min(1).max(200), confirm: z.literal('on') })
      .parse(await form(c));
    const row = await one<{ id: string }>(
      db,
      "update contract_templates set review_status = 'lawyer_reviewed', reviewed_by = $1, reviewed_at = now(), updated_at = now() where id = $2 and review_status = 'unreviewed' returning id",
      [data.reviewer, c.req.param('id')!],
    );
    if (!row) return c.notFound();
    await audit(
      db,
      'template.reviewed',
      'template',
      row.id,
      { reviewer: data.reviewer },
      clientIp(c),
    );
    return c.redirect(withNotice(`${BASE}/templates/${row.id}`, 'Review recorded'), 303);
  });

  // --------------------------------- Settings ---------------------------------
  app.get(`${BASE}/settings`, async (c) => {
    const [settings, sessions, passkeys, usage, spend, templates] = await Promise.all([
      getSettings(db),
      many(
        db,
        'select id, created_at, last_seen_at, ip, user_agent from sessions where revoked_at is null and expires_at > now() order by last_seen_at desc',
      ),
      listCredentials(db),
      many(db, 'select * from ai_usage_monthly order by month desc, model limit 24'),
      monthSpend(db),
      templateChoices(),
    ]);
    return c.html(
      v.page(
        'Settings',
        'settings',
        v.settingsView(
          settings,
          ALLOWED_MODELS,
          sessions,
          c.get('session').id,
          passkeys as never,
          usage,
          config.monthlyBudgetUsd,
          spend,
          templates.filter((t) => t['lang'] === 'bg'),
        ),
        flash(c),
      ),
    );
  });
  app.post(`${BASE}/settings`, async (c) => {
    const body = await form(c);
    const data = settingsData.parse({
      profile: {
        legal_name: body['legal_name'],
        email: body['email'],
        address: body['address'],
        status: body['status'],
        company_name: body['company_name'],
        eik: body['eik'],
        vat_id: body['vat_id'],
      },
      currency: body['currency'],
      language: body['language'],
      default_template: body['default_template'],
      model: ALLOWED_MODELS.includes(body['model'] ?? '') ? body['model'] : '',
      retention_days: body['retention_days'],
      page_numbers: 'page_numbers' in body,
    });
    await db.query(
      'insert into settings (id, data) values (true, $1) on conflict (id) do update set data = excluded.data, updated_at = now()',
      [data],
    );
    await audit(db, 'settings.changed', null, null, {}, clientIp(c));
    return c.redirect(withNotice(`${BASE}/settings`, 'Settings saved'), 303);
  });
  app.post(`${BASE}/settings/sessions/${id('id')}/revoke`, async (c) => {
    await revokeSession(db, c.req.param('id')!);
    await audit(db, 'auth.session_revoked', 'session', c.req.param('id')!, {}, clientIp(c));
    return c.redirect(`${BASE}/settings`, 303);
  });
  app.post(`${BASE}/settings/passkeys/options`, async (c) =>
    c.json(await registrationOptions(db, config)),
  );
  app.post(`${BASE}/settings/passkeys/verify`, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    try {
      if (
        !(await finishRegistration(
          db,
          config,
          String(body.challengeId),
          body.response,
          String(body.label ?? 'Passkey').slice(0, 80),
        ))
      )
        return c.json({ error: 'That did not work.' }, 400);
    } catch {
      return c.json({ error: 'That did not work.' }, 400);
    }
    return c.json({ ok: true, next: `${BASE}/settings` });
  });
  app.post(`${BASE}/settings/passkeys/:credential/delete`, async (c) => {
    if ((await listCredentials(db)).length < 2) throw new Rejected('Keep at least one passkey.');
    await db.query('delete from admin_credentials where id = $1', [c.req.param('credential')!]);
    await audit(
      db,
      'auth.passkey_removed',
      'credential',
      c.req.param('credential')!,
      {},
      clientIp(c),
    );
    return c.redirect(`${BASE}/settings`, 303);
  });

  app.notFound((c) => c.html(v.notFound(), 404));

  app.onError((error, c) => {
    const expected = error instanceof Rejected || error instanceof ZodError;
    if (expected) {
      const message =
        error instanceof ZodError ? (error.issues[0]?.message ?? 'Invalid input') : error.message;
      const status = error instanceof Rejected ? error.status : 422;
      const referer = c.req.header('referer');
      if (
        referer &&
        status !== 404 &&
        c.req.method === 'POST' &&
        !c.req.path.includes('/preview')
      ) {
        try {
          const path = new URL(referer).pathname;
          if (path.startsWith(BASE))
            return c.redirect(`${path}?error=${encodeURIComponent(message)}`, 303);
        } catch {
          /* falls through to the plain response */
        }
      }
      return c.text(message, status as 404);
    }
    if ((error as { name?: string }).name === 'HTTPException') throw error;
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: 'error',
        ref,
        method: c.req.method,
        name: error.name,
        code: (error as { code?: string }).code,
        message: error.message.replace(/postgres\S+/g, '[url]').slice(0, 200),
      }),
    );
    return c.text(`Something went wrong (ref ${ref}).`, 500);
  });

  return app;
}
