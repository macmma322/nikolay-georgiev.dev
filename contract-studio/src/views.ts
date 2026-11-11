// Server-rendered pages. `html` escapes every interpolated value; only trees it
// produced itself, and the renderer's own escaped document HTML, pass through.
import { html, raw } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import { BASE } from './config.ts';
import {
  TRANSITIONS,
  isEditable,
  type ContractRow,
  type DocumentRow,
  type Status,
  type VersionRow,
} from './contracts.ts';
import { buildDocument, fieldLabel } from './render.ts';
import type { ContractContent, ContractProposal, SettingsData, TemplateFile } from './schema.ts';

export type Body = HtmlEscapedString | Promise<HtmlEscapedString>;
// `home` is the public portfolio (config.portfolioUrl), never a request value.
type Chrome = { notice?: string | undefined; error?: string | undefined; home?: string };
type Row = Record<string, any>;

const NAV = [
  ['dashboard', 'Dashboard', ''],
  ['clients', 'Clients', '/clients'],
  ['projects', 'Projects', '/projects'],
  ['documents', 'Contracts', '/documents'],
  ['assistant', 'AI Assistant', '/assistant'],
  ['templates', 'Templates', '/templates'],
  ['settings', 'Settings', '/settings'],
] as const;

// tokens.css is the portfolio's src/styles/tokens.css, byte for byte (a test checks).
const head = (title: string) =>
  html`<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, noarchive, nofollow" />
    <meta name="color-scheme" content="dark" />
    <title>${title} · Contract Studio</title>
    <link rel="stylesheet" href="${BASE}/assets/tokens.css" />
    <link rel="stylesheet" href="${BASE}/assets/studio.css" />
  </head>`;

// The portfolio's monogram (components/ui/Mark.astro), with its one signal square.
const mark =
  raw(`<svg class="mark" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false">
  <path class="mark-frame" d="M1 1h17.5L23 5.5V23H1z"></path>
  <path class="mark-glyph" d="M5 16.5v-9l5.5 9v-9M19 7.5h-5.2v9H19v-4.2h-2.6"></path>
  <rect class="mark-signal" x="19.6" y="19.6" width="1.8" height="1.8"></rect>
</svg>`);
const arrowBack = raw(
  '<svg class="nudge-back" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M13 8H3.5M7.5 4 3.5 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
);

const brand = (href: string) =>
  html`<a class="brand" href="${href}">
    ${mark}
    <span class="brand-text">
      <span class="brand-name">Nikolay Georgiev</span>
      <span class="brand-role">Contract Studio</span>
    </span>
  </a>`;

// Navigation only: the session stays signed in.
const backLink = (home: string, className = 'back-link') =>
  html`<a class="${className}" href="${home}" data-testid="back-to-portfolio"
    >${arrowBack}<span><span class="visually-hidden">Back to </span>Portfolio</span></a
  >`;

const logoutForm = (className: string) =>
  html`<form method="post" action="${BASE}/logout" class="logout">
    <button class="${className}">Log out</button>
  </form>`;

const banners = ({ notice, error }: Chrome) => html`
  ${notice ? html`<p class="banner ok" role="status">${notice}</p>` : ''}
  ${error ? html`<p class="banner bad" role="alert">${error}</p>` : ''}
`;

const index = (i: number) => String(i + 1).padStart(2, '0');

export const page = (
  title: string,
  active: string,
  body: Body,
  chrome: Chrome = {},
  wide = false,
) => {
  const home = chrome.home ?? '/';
  const section = NAV.findIndex(([key]) => key === active);
  return html`<!doctype html>
    <html lang="en">
      ${head(title)}
      <body>
        <div class="atmosphere" aria-hidden="true"></div>
        <a class="skip-link" href="#main">Skip to content</a>
        <header class="site-header">
          <div class="bar container">
            ${brand(BASE)}
            <nav class="nav-desktop" aria-label="Workspace">
              <ul role="list">
                ${NAV.map(
                  ([key, label, path]) =>
                    html`<li>
                      <a href="${BASE}${path}" ${key === active ? raw('aria-current="page"') : ''}
                        >${label}</a
                      >
                    </li>`,
                )}
              </ul>
            </nav>
            <div class="header-actions">
              ${backLink(home)} ${logoutForm('cv-link')}
              <button
                class="menu-button"
                type="button"
                popovertarget="studio-menu"
                aria-haspopup="dialog"
              >
                <span class="menu-lines" aria-hidden="true"><span></span><span></span></span>
                <span class="menu-label">Menu</span>
              </button>
            </div>
          </div>
          <div
            id="studio-menu"
            class="mobile-menu"
            popover
            role="dialog"
            aria-modal="true"
            aria-label="Workspace menu"
          >
            <div class="mobile-top container">
              <span class="label">Contract Studio</span>
              <button
                class="mobile-close"
                type="button"
                popovertarget="studio-menu"
                popovertargetaction="hide"
              >
                Close
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="m3.5 3.5 9 9m0-9-9 9"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                  ></path>
                </svg>
              </button>
            </div>
            <nav class="mobile-nav container" aria-label="Workspace, mobile">
              <ol role="list" class="mobile-list">
                ${NAV.map(
                  ([key, label, path], i) =>
                    html`<li>
                      <a href="${BASE}${path}" ${key === active ? raw('aria-current="page"') : ''}>
                        <span class="mobile-index">${index(i)}</span>
                        <span class="mobile-word">${label}</span>
                      </a>
                    </li>`,
                )}
              </ol>
              <div class="mobile-meta">
                ${backLink(home, 'mobile-back')} ${logoutForm('btn-secondary')}
              </div>
            </nav>
          </div>
        </header>
        <main id="main" class="container${wide ? ' wide' : ''}">
          ${
            section >= 0
              ? html`<p class="label eyebrow">
                  <span class="eyebrow-index">${index(section)}</span>
                  ${
                    NAV[section]![1] === title
                      ? NAV[section]![1]
                      : html`<a href="${BASE}${NAV[section]![2]}">${NAV[section]![1]}</a>`
                  }
                </p>`
              : ''
          }
          ${banners(chrome)}${body}
        </main>
        <script type="module" src="${BASE}/assets/studio.js"></script>
      </body>
    </html>`;
};

export const authPage = (title: string, body: Body, home?: string, script = true) =>
  html`<!doctype html>
    <html lang="en">
      ${head(title)}
      <body class="auth">
        <div class="atmosphere" aria-hidden="true"></div>
        <header class="site-header">
          <div class="bar container">${brand(home ?? BASE)} ${home ? backLink(home) : ''}</div>
        </header>
        <main id="main" class="auth-panel">
          <p class="label">Private workspace</p>
          <h1>${title}</h1>
          ${body}
          <p id="auth-message" class="banner bad" role="alert" hidden></p>
        </main>
        ${script ? html`<script type="module" src="${BASE}/assets/auth.js"></script>` : ''}
      </body>
    </html>`;

export const loginView = (home: string, expired = false) =>
  authPage(
    'Sign in',
    html`${
        expired
          ? html`<p class="banner warn" role="status">
              Your session has ended. Sign in again to continue.
            </p>`
          : ''
      }
      <p class="lede">Contracts, clients and drafts. Sign in with the passkey on this device.</p>
      <button id="login" class="primary">Sign in with passkey</button>`,
    home,
  );

export const setupView = (home: string) =>
  authPage(
    'Add a passkey',
    html`<form id="setup" class="form">
      <label
        >One-time setup token <input name="token" type="password" autocomplete="off" required
      /></label>
      <label>Name this passkey <input name="label" value="Windows Hello" maxlength="80" /></label>
      <button class="primary">Create passkey</button>
    </form>`,
    home,
  );

export const logoutFailedView = (home: string) =>
  authPage(
    'Log out did not finish',
    html`<p class="banner bad" role="alert">
        The server could not close your session, so it may still be active. Nothing was signed out.
      </p>
      <div class="actions">
        <form method="post" action="${BASE}/logout">
          <button class="primary">Try again</button>
        </form>
        <a class="button" href="${BASE}">Back to the workspace</a>
      </div>`,
    home,
    false,
  );

const value = (data: Row | undefined, name: string) => (data?.[name] ?? '') as string;
const input = (label: string, name: string, data?: Row, attrs = 'type="text"') =>
  html`<label>${label}<input name="${name}" value="${value(data, name)}" ${raw(attrs)} /></label>`;
const area = (label: string, name: string, data?: Row, rows = 3) =>
  html`<label
    >${label}<textarea name="${name}" rows="${rows}">${value(data, name)}</textarea>
  </label>`;
const select = (
  label: string,
  name: string,
  options: [string, string][],
  current?: string,
  attrs = '',
) =>
  html`<label
    >${label}
    <select name="${name}" ${raw(attrs)}>
      ${options.map(([v, text]) => html`<option value="${v}" ${v === current ? raw('selected') : ''}>${text}</option>`)}
    </select></label
  >`;
// The portfolio's status vocabulary (components/ui/StatusBadge.astro): shape
// plus label, drawn as SVG so it survives forced colours.
const SHAPES: Record<string, 'solid' | 'half' | 'dashed' | 'paused'> = {
  approved: 'solid',
  signed: 'solid',
  active: 'solid',
  completed: 'solid',
  delivered: 'solid',
  lawyer_reviewed: 'solid',
  covered: 'solid',
  ready_for_review: 'half',
  exported: 'half',
  sent: 'half',
  needs_information: 'dashed',
  unreviewed: 'dashed',
  ambiguous: 'dashed',
  planned: 'dashed',
  on_hold: 'paused',
  terminated: 'paused',
  archived: 'paused',
  cancelled: 'paused',
  declined: 'paused',
  excluded: 'paused',
};
const badge = (text: string) => {
  const shape = SHAPES[text] ?? 'hollow';
  return html`<span class="badge shape-${shape} s-${text}"
    ><svg
      class="glyph"
      viewBox="0 0 10 10"
      width="10"
      height="10"
      aria-hidden="true"
      focusable="false"
    >
      <rect class="frame" x="0.75" y="0.75" width="8.5" height="8.5" pathLength="24"></rect>
      ${shape === 'half' ? raw('<rect class="fill" x="0.75" y="0.75" width="4.25" height="8.5"></rect>') : ''}
      ${shape === 'paused' ? raw('<path class="stroke" d="M2.5 7.5 7.5 2.5"></path>') : ''}</svg
    ><span class="badge-text">${text.replace(/_/g, ' ')}</span></span
  >`;
};
const date = (value?: Date | string | null) => {
  if (!value) return '—';
  const day = typeof value === 'string' ? value : value.toISOString().slice(0, 10);
  return html`<time datetime="${day}">${day}</time>`;
};
const empty = (text: string) => html`<p class="empty">${text}</p>`;
const table = (headers: string[], rows: Body[]) =>
  html`<div class="table">
    <table>
      <thead>
        <tr>
          ${headers.map((h) => html`<th scope="col">${h}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>`;

export const dashboardView = (s: Row, recent: Row[], deadlines: Row[]) => html`
  <h1>Dashboard</h1>
  <div class="stats">
    ${[
      ['Clients', s['clients']],
      ['Drafts', s['drafts']],
      ['Awaiting review', s['review']],
      ['Awaiting signature', s['signature']],
      ['Active agreements', s['active']],
    ].map(([label, count]) => html`<div class="stat"><b>${count}</b><span>${label}</span></div>`)}
  </div>
  <div class="columns">
    <section>
      <h2>Recently edited</h2>
      ${
        recent.length
          ? table(
              ['Contract', 'Client', 'Status', 'Edited'],
              recent.map(
                (r) =>
                  html`<tr>
                    <td>
                      <a href="${BASE}/documents/${r['id']}">${r['title']}</a><br /><small
                        >${r['reference']}</small
                      >
                    </td>
                    <td>${r['client_name']}</td>
                    <td>${badge(r['status'])}</td>
                    <td>${date(r['updated_at'])}</td>
                  </tr>`,
              ),
            )
          : empty('No contracts yet.')
      }
    </section>
    <section>
      <h2>Upcoming deadlines</h2>
      ${
        deadlines.length
          ? table(
              ['Project', 'Client', 'Due'],
              deadlines.map(
                (d) =>
                  html`<tr>
                    <td><a href="${BASE}/projects/${d['id']}">${d['title']}</a></td>
                    <td>${d['client_name']}</td>
                    <td>${date(d['target_date'])}</td>
                  </tr>`,
              ),
            )
          : empty('Nothing due.')
      }
    </section>
  </div>
`;

export const clientsView = (clients: Row[], showArchived: boolean) => html`
  <div class="bar">
    <h1>Clients</h1>
    <a class="button primary" href="${BASE}/clients/new">New client</a>
  </div>
  ${
    clients.length
      ? table(
          ['Name', 'Type', 'Contact', 'Country'],
          clients.map(
            (c) =>
              html`<tr>
                <td>
                  <a href="${BASE}/clients/${c['id']}">${c['name']}</a>
                  ${c['archived_at'] ? badge('archived') : ''}
                </td>
                <td>${c['kind'] === 'individual' ? 'Individual' : 'Legal entity'}</td>
                <td>${c['email'] ?? c['phone'] ?? '—'}</td>
                <td>${c['country']}</td>
              </tr>`,
          ),
        )
      : empty('No clients yet.')
  }
  <p>
    <a href="${BASE}/clients?archived=${showArchived ? '0' : '1'}"
      >${showArchived ? 'Hide' : 'Show'} archived</a
    >
  </p>
`;

export const clientForm = (client?: Row) => html`
  <h1>${client ? 'Edit client' : 'New client'}</h1>
  <form method="post" class="form" action="${BASE}/clients${client ? `/${client['id']}` : ''}">
    ${select(
      'Type',
      'kind',
      [
        ['legal_entity', 'Legal entity'],
        ['individual', 'Individual'],
      ],
      client?.['kind'],
    )}
    ${input('Name or legal name', 'name', client, 'type="text" required maxlength="300"')}
    ${input('Contact person / representative', 'contact_person', client)}
    ${input('Email', 'email', client, 'type="email"')}
    ${input('Phone', 'phone', client, 'type="tel"')} ${area('Address', 'address', client, 2)}
    ${input('EIK / BULSTAT', 'eik', client, 'type="text" inputmode="numeric" pattern="[0-9]{9}([0-9]{4})?"')}
    ${input('VAT number', 'vat_id', client)}
    ${input('Country (2 letters)', 'country', client ?? { country: 'BG' }, 'type="text" maxlength="2" required')}
    ${area('Internal notes (never sent to Claude)', 'notes', client)}
    <button class="primary">Save client</button>
  </form>
`;

export const clientDetail = (c: Row, projects: Row[], contracts: Row[]) => html`
  <div class="bar">
    <h1>${c['name']}</h1>
    <div class="actions">
      <a class="button" href="${BASE}/clients/${c['id']}/edit">Edit</a>
      <a class="button primary" href="${BASE}/documents/new?client=${c['id']}">Start a contract</a>
      <form method="post" action="${BASE}/clients/${c['id']}/archive">
        <button>${c['archived_at'] ? 'Restore' : 'Archive'}</button>
      </form>
    </div>
  </div>
  <dl class="facts">
    <dt>Type</dt>
    <dd>${c['kind'] === 'individual' ? 'Individual' : 'Legal entity'}</dd>
    <dt>Contact</dt>
    <dd>${c['contact_person'] ?? '—'}</dd>
    <dt>Email</dt>
    <dd>${c['email'] ?? '—'}</dd>
    <dt>Phone</dt>
    <dd>${c['phone'] ?? '—'}</dd>
    <dt>Address</dt>
    <dd>${c['address'] ?? '—'}</dd>
    <dt>EIK / BULSTAT</dt>
    <dd>${c['eik'] ?? '—'}</dd>
    <dt>VAT</dt>
    <dd>${c['vat_id'] ?? '—'}</dd>
    <dt>Country</dt>
    <dd>${c['country']}</dd>
  </dl>
  <h2>Projects</h2>
  ${
    projects.length
      ? html`<ul>
          ${projects.map((p) => html`<li><a href="${BASE}/projects/${p['id']}">${p['title']}</a> ${badge(p['status'])}</li>`)}
        </ul>`
      : empty('No projects.')
  }
  <p><a href="${BASE}/projects/new?client=${c['id']}">Add a project</a></p>
  <h2>Contracts</h2>
  ${
    contracts.length
      ? html`<ul>
          ${contracts.map((d) => html`<li><a href="${BASE}/documents/${d['id']}">${d['title']}</a> ${badge(d['status'])}</li>`)}
        </ul>`
      : empty('No contracts.')
  }
`;

export const projectsView = (projects: Row[]) => html`
  <div class="bar">
    <h1>Projects</h1>
    <a class="button primary" href="${BASE}/projects/new">New project</a>
  </div>
  ${
    projects.length
      ? table(
          ['Project', 'Client', 'Status', 'Target', 'Price'],
          projects.map(
            (p) =>
              html`<tr>
                <td><a href="${BASE}/projects/${p['id']}">${p['title']}</a></td>
                <td>${p['client_name']}</td>
                <td>${badge(p['status'])}</td>
                <td>${date(p['target_date'])}</td>
                <td>${p['price'] ? `${p['price']} ${p['currency']}` : '—'}</td>
              </tr>`,
          ),
        )
      : empty('No projects yet.')
  }
`;

const linesOf = (v: unknown) => (Array.isArray(v) ? v.join('\n') : '');

export const projectForm = (clients: Row[], project?: Row, clientId?: string) => {
  const data = project
    ? {
        ...project,
        deliverables: linesOf(project['deliverables']),
        exclusions: linesOf(project['exclusions']),
      }
    : undefined;
  return html`
    <h1>${project ? 'Edit project' : 'New project'}</h1>
    <form method="post" class="form" action="${BASE}/projects${project ? `/${project['id']}` : ''}">
      ${select(
        'Client',
        'client_id',
        clients.map((c) => [c['id'], c['name']]),
        project?.['client_id'] ?? clientId,
        'required',
      )}
      ${input('Project title', 'title', data, 'type="text" required maxlength="300"')}
      ${area('Description', 'description', data)} ${area('Scope summary', 'scope_summary', data)}
      ${area('Deliverables (one per line)', 'deliverables', data, 4)}
      ${area('Exclusions (one per line)', 'exclusions', data, 3)}
      ${input('Start date', 'start_date', data, 'type="date"')}
      ${input('Target delivery date', 'target_date', data, 'type="date"')}
      ${input('Price', 'price', data, 'type="number" step="0.01" min="0"')}
      ${input('Currency', 'currency', data ?? { currency: 'EUR' }, 'type="text" maxlength="3"')}
      ${area('Payment structure', 'payment_structure', data, 2)}
      ${select(
        'Status',
        'status',
        ['planned', 'active', 'on_hold', 'delivered', 'closed', 'cancelled'].map((s) => [
          s,
          s.replace('_', ' '),
        ]),
        project?.['status'],
      )}
      ${area('Internal notes (never sent to Claude)', 'notes', data)}
      <button class="primary">Save project</button>
    </form>
  `;
};

export const projectDetail = (p: Row, contracts: Row[]) => html`
  <div class="bar">
    <h1>${p['title']}</h1>
    <div class="actions">
      <a class="button" href="${BASE}/projects/${p['id']}/edit">Edit</a>
      <a
        class="button primary"
        href="${BASE}/documents/new?client=${p['client_id']}&project=${p['id']}"
        >Start a contract</a
      >
    </div>
  </div>
  <dl class="facts">
    <dt>Client</dt>
    <dd><a href="${BASE}/clients/${p['client_id']}">${p['client_name']}</a></dd>
    <dt>Status</dt>
    <dd>${badge(p['status'])}</dd>
    <dt>Dates</dt>
    <dd>${date(p['start_date'])} → ${date(p['target_date'])}</dd>
    <dt>Price</dt>
    <dd>${p['price'] ? `${p['price']} ${p['currency']}` : '—'}</dd>
    <dt>Payment</dt>
    <dd>${p['payment_structure'] ?? '—'}</dd>
    <dt>Scope</dt>
    <dd>${p['scope_summary'] ?? '—'}</dd>
  </dl>
  <h2>Contracts</h2>
  ${
    contracts.length
      ? html`<ul>
          ${contracts.map((d) => html`<li><a href="${BASE}/documents/${d['id']}">${d['title']}</a> ${badge(d['status'])}</li>`)}
        </ul>`
      : empty('No contracts.')
  }
`;

export const documentsView = (rows: Row[]) => html`
  <div class="bar">
    <h1>Contracts</h1>
    <a class="button primary" href="${BASE}/documents/new">New contract</a>
  </div>
  ${
    rows.length
      ? table(
          ['Contract', 'Client', 'Status', 'Version', 'Edited'],
          rows.map(
            (r) =>
              html`<tr>
                <td>
                  <a href="${BASE}/documents/${r['id']}">${r['title']}</a><br /><small
                    >${r['reference']}</small
                  >
                </td>
                <td>${r['client_name']}</td>
                <td>${badge(r['status'])}</td>
                <td>v${r['current_version']}</td>
                <td>${date(r['updated_at'])}</td>
              </tr>`,
          ),
        )
      : empty('No contracts yet.')
  }
`;

export const newDocumentView = (
  clients: Row[],
  projects: Row[],
  templates: Row[],
  settings: SettingsData,
  contracts: Row[] = [],
  clientId?: string,
  projectId?: string,
  parentId?: string,
) =>
  clients.length
    ? html`
        <h1>New contract</h1>
        <form method="post" class="form" action="${BASE}/documents">
          ${select(
            'Client',
            'client_id',
            clients.map((c) => [c['id'], c['name']]),
            clientId,
            'required',
          )}
          ${select('Project (optional)', 'project_id', [['', 'None'], ...projects.map((p): [string, string] => [p['id'], `${p['title']} — ${p['client_name']}`])], projectId)}
          ${select('Parent contract (optional)', 'parent_id', [['', 'None'], ...contracts.map((c): [string, string] => [c['id'], `${c['title']} (${c['reference']}) — ${c['client_name']}`])], parentId)}
          ${select('Document', 'template_key', [...new Map(templates.map((t) => [t['key'], t['name']])).entries()] as [string, string][], settings.default_template)}
          ${select(
            'Language',
            'lang',
            [
              ['bg', 'Bulgarian'],
              ['en', 'English'],
            ],
            settings.language,
          )}
          <button class="primary">Create draft</button>
        </form>
      `
    : html`<h1>New contract</h1>
        <p>A contract needs a client first. <a href="${BASE}/clients/new">Create a client</a>.</p>`;

const scheduleText = (terms: ContractContent['terms']) =>
  terms.payment_schedule.map((m) => [m.label, m.amount, m.due].join(' | ')).join('\n');

const editForm = (contract: ContractRow, content: ContractContent) => {
  const t = content.terms as Row;
  const data = {
    ...t,
    deliverables: linesOf(t['deliverables']),
    exclusions: linesOf(t['exclusions']),
    acceptance_criteria: linesOf(t['acceptance_criteria']),
    payment_schedule: scheduleText(content.terms),
    contract_date: content.contract_date ?? '',
    place: content.place ?? '',
    title: content.title,
    project_title: content.project.title,
    project_description: content.project.description ?? '',
    change_description: content.change?.description ?? '',
    change_price: content.change?.price ?? '',
    change_delivery_date: content.change?.delivery_date ?? '',
    change_deliverables: linesOf(content.change?.deliverables),
    settlement_amount: content.settlement?.amount ?? '',
    settlement_due_date: content.settlement?.due_date ?? '',
    settlement_reason: content.settlement?.reason ?? '',
    settlement_instalments: linesOf(content.settlement?.instalments),
  };
  const key = content.template_key;
  return html`<form
    id="edit-form"
    method="post"
    action="${BASE}/documents/${contract.id}/save"
    data-preview="${BASE}/documents/${contract.id}/preview"
  >
    <fieldset ${isEditable(contract.status) ? '' : raw('disabled')}>
      <div class="grid">
        ${input('Title', 'title', data, 'type="text" required')}
        ${input('Contract date', 'contract_date', data, 'type="date"')}
        ${input('Place', 'place', data)}
      </div>
      ${
        content.change !== undefined
          ? html`<h3>${key === 'acceptance-protocol' ? 'Reservations' : 'Change'}</h3>
              ${area(key === 'acceptance-protocol' ? 'Reservations' : 'Description of the change', 'change_description', data)}
              ${key === 'acceptance-protocol' ? '' : area('New deliverables (one per line)', 'change_deliverables', data)}
              ${
                key === 'acceptance-protocol'
                  ? ''
                  : html`<div class="grid">
                      ${input('Price of the change', 'change_price', data, 'type="number" step="0.01" min="0"')}
                      ${input('Delivery date', 'change_delivery_date', data, 'type="date"')}
                    </div>`
              }`
          : ''
      }
      ${
        content.settlement !== undefined
          ? html`<h3>Settlement</h3>
              ${area('Reason', 'settlement_reason', data, 2)}
              ${area('Instalments (one per line)', 'settlement_instalments', data)}
              <div class="grid">
                ${input('Amount', 'settlement_amount', data, 'type="number" step="0.01" min="0"')}
                ${input('Due date', 'settlement_due_date', data, 'type="date"')}
              </div>`
          : ''
      }
      <h3>Scope</h3>
      ${input('Project title', 'project_title', data)}
      ${area('Project description', 'project_description', data, 2)}
      ${area('Scope summary', 'scope_summary', data)}
      ${area('Deliverables (one per line)', 'deliverables', data, 4)}
      ${area('Exclusions (one per line)', 'exclusions', data, 3)}
      ${area('Acceptance criteria (one per line)', 'acceptance_criteria', data, 3)}
      <h3>Money and time</h3>
      <div class="grid">
        ${input('Price', 'price_amount', data, 'type="number" step="0.01" min="0"')}
        ${input('Currency', 'currency', data, 'type="text" maxlength="3"')}
        ${input('Gross/net wording', 'price_basis', data)}
        ${input('Start date', 'start_date', data, 'type="date"')}
        ${input('Delivery date', 'delivery_date', data, 'type="date"')}
        ${input('Payment term (days)', 'payment_days', data, 'type="number" min="0"')}
        ${input('Acceptance period (days)', 'acceptance_days', data, 'type="number" min="0"')}
        ${input('Revision rounds', 'revision_rounds', data, 'type="number" min="0"')}
        ${input('Warranty (days)', 'warranty_days', data, 'type="number" min="0"')}
        ${input('Notice (days)', 'notice_days', data, 'type="number" min="0"')}
      </div>
      ${area('Payment milestones (label | amount | due, one per line)', 'payment_schedule', data, 3)}
      <h3>Other terms</h3>
      ${input('Additional work rate', 'additional_work_rate', data)}
      ${input('Liability cap', 'liability_cap', data)}
      ${input('Dispute forum', 'dispute_forum', data)} ${area('IP terms', 'ip_terms', data, 2)}
      ${area('Support', 'support_terms', data, 2)}
      ${area('Hosting and external services', 'hosting_terms', data, 2)}
      <details>
        <summary>Clauses (${content.clauses.length})</summary>
        ${content.clauses.map(
          (clause) =>
            html`<div class="clause">
              <label class="check"
                ><input
                  type="checkbox"
                  name="clause_on__${clause.key}"
                  ${clause.enabled ? raw('checked') : ''}
                />
                ${clause.section_title}
                <small
                  >${clause.key} · ${clause.origin} ·
                  ${clause.review_status}${clause.material ? ' · material' : ''}</small
                ></label
              >
              <textarea
                aria-label="Clause ${clause.key}"
                name="clause_text__${clause.key}"
                rows="3"
              >
${clause.text}</textarea>
            </div>`,
        )}
      </details>
      <button class="primary" id="save-version">Save as new version</button>
    </fieldset>
  </form>`;
};

const proposalCard = (p: Row, content: ContractContent | undefined) => {
  const payload = p['payload'] as ContractProposal;
  const before = (content?.terms ?? {}) as Row;
  const unbound = !p['contract_id'];
  return html`<article class="card proposal" data-testid="proposal">
    <h3>Proposed by Claude</h3>
    <p>${payload.summary}</p>
    ${
      Object.keys(payload.set_terms).length
        ? html`<table class="diff">
            ${Object.entries(payload.set_terms).map(
              ([name, next]) =>
                html`<tr>
                  <th scope="row">${name}</th>
                  <td class="old">${JSON.stringify(before[name] ?? null)}</td>
                  <td class="new">${JSON.stringify(next)}</td>
                </tr>`,
            )}
          </table>`
        : ''
    }
    ${payload.clause_edits.map(
      (edit) =>
        html`<p class="edit">
          <b>${edit.op} ${edit.key}</b>: ${edit.new_text ?? ''}<br /><small>${edit.reason}</small>
        </p>`,
    )}
    ${
      payload.missing_information.length
        ? html`<p><b>Missing:</b> ${payload.missing_information.join('; ')}</p>`
        : ''
    }
    ${payload.questions.length ? html`<p><b>Questions:</b> ${payload.questions.join(' ')}</p>` : ''}
    ${
      payload.legal_uncertainties.length
        ? html`<p><b>Legal uncertainty:</b> ${payload.legal_uncertainties.join(' ')}</p>`
        : ''
    }
    ${
      unbound
        ? html`<a class="button primary" href="${BASE}/proposals/${p['id']}/draft"
            >Create a draft from this</a
          >`
        : html`<div class="actions">
            <form method="post" action="${BASE}/proposals/${p['id']}/apply">
              <button class="primary">Apply as new draft version</button>
            </form>
            <form method="post" action="${BASE}/proposals/${p['id']}/reject">
              <button>Dismiss</button>
            </form>
          </div>`
    }
  </article>`;
};

const chatPanel = (conversationId: string, messages: Row[], pending: Body[]) =>
  html`<section class="chat" aria-label="Claude">
    <div id="log" class="log" aria-live="polite">
      ${messages.length ? '' : html`<p class="muted">Tell Claude about the project or the change the client asked for.</p>`}
      ${messages.map(
        (m) =>
          html`<div class="msg ${m['role']}">
            <span class="who">${m['role'] === 'user' ? 'You' : 'Claude'}</span>
            <div class="md">${m['content']}</div>
            ${m['state'] === 'partial' ? html`<small>Stopped early</small>` : ''}
            ${m['state'] === 'error' ? html`<small class="bad">Failed</small>` : ''}
          </div>`,
      )}
    </div>
    <div id="proposals">${pending}</div>
    <form id="chat" data-url="${BASE}/chat/${conversationId}">
      <label class="sr" for="message">Message to Claude</label>
      <textarea
        id="message"
        name="message"
        rows="3"
        required
        maxlength="20000"
        placeholder="Message Claude"
      ></textarea>
      <div class="actions">
        <button class="primary" id="send">Send</button>
        <button type="button" id="stop" hidden>Stop</button>
        <span id="chat-status" class="muted" role="status"></span>
      </div>
    </form>
  </section>`;

const changeRequestCard = (cr: Row) =>
  html`<article class="card" data-testid="change-request">
    <h3>${cr['title']} ${badge(cr['classification'])} ${badge(cr['status'])}</h3>
    <p>${cr['description']}</p>
    <p><b>Reasoning:</b> ${cr['reasoning']}</p>
    ${(cr['questions'] as string[]).length ? html`<p><b>Open questions:</b> ${(cr['questions'] as string[]).join(' ')}</p>` : ''}
    ${
      (cr['proposed_deliverables'] as string[]).length
        ? html`<ul>
            ${(cr['proposed_deliverables'] as string[]).map((d) => html`<li>${d}</li>`)}
          </ul>`
        : ''
    }
    ${
      cr['status'] === 'open'
        ? html`<form
              method="post"
              class="grid"
              action="${BASE}/change-requests/${cr['id']}/agreement"
            >
              <label
                >Price of this change (yours to set)<input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
              /></label>
              <label>Delivery date<input name="delivery_date" type="date" /></label>
              <button class="primary">Prepare additional agreement</button>
            </form>
            <form method="post" action="${BASE}/change-requests/${cr['id']}/decline">
              <button>Decline</button>
            </form>`
        : ''
    }
    ${cr['additional_contract_id'] ? html`<a href="${BASE}/documents/${cr['additional_contract_id']}">Open the additional agreement</a>` : ''}
  </article>`;

type Workspace = {
  contract: ContractRow;
  shown: VersionRow;
  current: VersionRow;
  versions: VersionRow[];
  documents: (DocumentRow & { version: number })[];
  conversationId: string;
  messages: Row[];
  proposals: Row[];
  changeRequests: Row[];
  parent?: Row | undefined;
  reviewStatus: string;
};

export const workspaceView = (w: Workspace) => {
  const { contract, shown, current } = w;
  const model = buildDocument(shown.content);
  const unreviewed = shown.content.clauses.filter(
    (c) => c.enabled && c.review_status === 'unreviewed',
  ).length;
  const viewingOld = shown.version !== current.version;
  return html`
    <div class="bar">
      <div>
        <p class="label">${contract.reference} · v${current.version}</p>
        <h1>${contract.title}</h1>
      </div>
      <div class="actions">
        ${badge(contract.status)}
        ${TRANSITIONS[contract.status].map(
          (to: Status) =>
            html`<form method="post" action="${BASE}/documents/${contract.id}/status">
              <input type="hidden" name="to" value="${to}" /><button>
                Mark as ${to.replace(/_/g, ' ')}
              </button>
            </form>`,
        )}
        ${
          contract.status === 'ready_for_review' && !viewingOld
            ? html`<form method="post" action="${BASE}/documents/${contract.id}/approve">
                <button class="primary">Approve v${current.version}</button>
              </form>`
            : ''
        }
      </div>
    </div>
    ${w.parent ? html`<p>Amends <a href="${BASE}/documents/${w.parent['id']}">${w.parent['title']} (${w.parent['reference']})</a></p>` : ''}
    ${
      unreviewed
        ? html`<p class="banner warn">
            ${unreviewed} clause${unreviewed === 1 ? '' : 's'} not reviewed by a lawyer. Printing or
            exporting is not signing, and this text carries no guarantee of enforceability.
          </p>`
        : ''
    }
    ${
      model.missing.length
        ? html`<p class="banner warn" data-testid="missing">
            Still missing: ${model.missing.map((m) => fieldLabel(m, 'en')).join(', ')}
          </p>`
        : ''
    }
    <div class="studio">
      ${chatPanel(w.conversationId, w.messages, [
        ...w.proposals.map((p) => proposalCard(p, current.content)),
        ...w.changeRequests.map(changeRequestCard),
      ])}
      <section class="paper-col" aria-label="Document">
        <div class="actions">
          <a class="button" href="${BASE}/documents/${contract.id}/export/${shown.version}/pdf"
            >Download PDF</a
          >
          <a class="button" href="${BASE}/documents/${contract.id}/export/${shown.version}/docx"
            >Download DOCX</a
          >
          <button type="button" id="print">Print</button>
          ${viewingOld ? html`<a class="button" href="${BASE}/documents/${contract.id}">Back to current</a>` : ''}
          <span class="muted"
            >Viewing v${shown.version} · ${shown.approval_state} · sha
            ${shown.content_sha256.slice(0, 10)}</span
          >
        </div>
        <div id="preview" class="paper">${raw(shown.rendered_html)}</div>
        ${
          viewingOld
            ? ''
            : html`<details open>
                <summary>Edit fields</summary>
                ${editForm(contract, shown.content)}
              </details>`
        }
        <details id="history">
          <summary>Version history (${w.versions.length})</summary>
          ${table(
            ['Version', 'State', 'Source', 'Created', 'Files'],
            w.versions.map(
              (v) =>
                html`<tr>
                  <td>
                    <a href="${BASE}/documents/${contract.id}?v=${v.version}">v${v.version}</a>
                  </td>
                  <td>${badge(v.approval_state)}</td>
                  <td>${v.source.replace('_', ' ')}</td>
                  <td>${date(v.created_at)}</td>
                  <td>
                    ${w.documents.filter((d) => d.version === v.version).map((d) => html`<a href="${BASE}/documents/${contract.id}/export/${v.version}/${d.format}" title="sha256 ${d.sha256}">${d.format}</a> `)}
                  </td>
                </tr>`,
            ),
          )}
        </details>
        ${
          ['draft', 'needs_information'].includes(contract.status) &&
          contract.approved_version === null
            ? html`<form
                method="post"
                action="${BASE}/documents/${contract.id}/delete"
                class="danger"
              >
                <button>Delete this draft</button>
              </form>`
            : ''
        }
      </section>
    </div>
  `;
};

export const assistantView = (conversations: Row[]) => html`
  <div class="bar">
    <h1>AI Assistant</h1>
    <form method="post" action="${BASE}/assistant">
      <button class="primary">New conversation</button>
    </form>
  </div>
  <p class="muted">
    Start here when no contract exists yet. Claude extracts what you tell it and lists what is
    missing. Conversations about one contract live on that contract.
  </p>
  ${
    conversations.length
      ? table(
          ['Conversation', 'Contract', 'Updated', ''],
          conversations.map(
            (c) =>
              html`<tr>
                <td>
                  <a
                    href="${c['contract_id'] ? `${BASE}/documents/${c['contract_id']}` : `${BASE}/assistant/${c['id']}`}"
                    >${c['title']}</a
                  >
                </td>
                <td>${c['reference'] ?? '—'}</td>
                <td>${date(c['updated_at'])}</td>
                <td>
                  <form method="post" action="${BASE}/assistant/${c['id']}/delete">
                    <button class="ghost">Delete</button>
                  </form>
                </td>
              </tr>`,
          ),
        )
      : empty('No conversations yet.')
  }
`;

export const conversationView = (conversationId: string, messages: Row[], proposals: Row[]) => html`
  <h1>New engagement</h1>
  <div class="narrow-chat">
    ${chatPanel(
      conversationId,
      messages,
      proposals.map((p) => proposalCard(p, undefined)),
    )}
  </div>
`;

export const draftFromProposalView = (proposal: Row, clients: Row[], templates: Row[]) => html`
  <h1>Create a draft</h1>
  <p>${(proposal['payload'] as ContractProposal).summary}</p>
  ${
    clients.length
      ? html`<form method="post" class="form" action="${BASE}/proposals/${proposal['id']}/draft">
          ${select(
            'Client',
            'client_id',
            clients.map((c) => [c['id'], c['name']]),
            undefined,
            'required',
          )}
          ${input('Project title', 'project_title', undefined, 'type="text" required maxlength="300"')}
          ${select('Document', 'template_key', [...new Map(templates.map((t) => [t['key'], t['name']])).entries()] as [string, string][])}
          ${select('Language', 'lang', [
            ['bg', 'Bulgarian'],
            ['en', 'English'],
          ])}
          <button class="primary">Create draft</button>
        </form>`
      : html`<p>
          Create the client first: Claude never invents party details.
          <a href="${BASE}/clients/new">New client</a>
        </p>`
  }
`;

export const templatesView = (rows: Row[]) => html`
  <h1>Templates</h1>
  <p class="banner warn">
    Unreviewed templates are working drafts. Have a qualified Bulgarian lawyer review them before
    relying on them.
  </p>
  ${table(
    ['Template', 'Language', 'Version', 'Review'],
    rows.map(
      (t) =>
        html`<tr>
          <td><a href="${BASE}/templates/${t['id']}">${t['name']}</a></td>
          <td>${t['lang']}</td>
          <td>${t['version']}</td>
          <td>${badge(t['review_status'])}</td>
        </tr>`,
    ),
  )}
`;

export const templateDetail = (row: Row) => {
  const d = row['definition'] as TemplateFile;
  return html`
    <div class="bar">
      <h1>${d.name}</h1>
      ${badge(row['review_status'])}
    </div>
    ${row['reviewed_by'] ? html`<p>Reviewed by ${row['reviewed_by']} on ${date(row['reviewed_at'])}.</p>` : ''}
    ${d.sections.map(
      (s) =>
        html`<h2>${s.title}</h2>
          ${s.clauses.map(
            (c) =>
              html`<div class="clause">
                <p>${c.text}</p>
                <small
                  >${c.key}${c.material ? ' · material' : ''}${c.optional ? ' · optional' : ''}${c.sourceRefs.length ? ` · ${c.sourceRefs.join(', ')}` : ''}${c.note ? ` · ${c.note}` : ''}</small
                >
              </div>`,
          )}`,
    )}
    <h2>Sources</h2>
    <ul>
      ${d.sources.map((s) => html`<li><a href="${s.url}" rel="noreferrer">${s.label}</a> (checked ${s.checkedAt})${s.note ? ` — ${s.note}` : ''}</li>`)}
    </ul>
    ${
      row['review_status'] === 'unreviewed'
        ? html`<h2>Record a lawyer's review</h2>
            <form method="post" class="form" action="${BASE}/templates/${row['id']}/review">
              ${input('Reviewer name', 'reviewer', undefined, 'type="text" required maxlength="200"')}
              <label class="check"
                ><input type="checkbox" name="confirm" required /> A qualified Bulgarian lawyer
                reviewed exactly this version.</label
              >
              <button>Mark as reviewed</button>
            </form>`
        : ''
    }
  `;
};

export const settingsView = (
  s: SettingsData,
  models: string[],
  sessions: Row[],
  currentSession: string,
  passkeys: Row[],
  usage: Row[],
  budget: number,
  spend: number,
  templates: Row[],
) => {
  const p = s.profile as Row;
  return html`
    <h1>Settings</h1>
    <form method="post" class="form" action="${BASE}/settings">
      <h2>Developer profile</h2>
      ${input('Legal name', 'legal_name', p)} ${input('Contact email', 'email', p, 'type="email"')}
      ${area('Address', 'address', p, 2)}
      ${select(
        'Contractor status',
        'status',
        [
          ['individual', 'Individual (natural person)'],
          ['registered_freelancer', 'Registered freelancer'],
          ['eood', 'EOOD'],
        ],
        p['status'],
      )}
      ${input('Company name (EOOD only)', 'company_name', p)} ${input('EIK (EOOD only)', 'eik', p)}
      ${input('VAT number (only if registered)', 'vat_id', p)}
      <p class="muted">
        Changing this affects new contracts only. Existing versions keep their own copy.
      </p>
      <h2>Application</h2>
      ${input('Currency', 'currency', s as Row, 'type="text" maxlength="3"')}
      ${select(
        'Preferred language',
        'language',
        [
          ['bg', 'Bulgarian'],
          ['en', 'English'],
        ],
        s.language,
      )}
      ${select('Default template', 'default_template', [...new Map(templates.map((t) => [t['key'], t['name']])).entries()] as [string, string][], s.default_template)}
      ${select('Claude model', 'model', [['', 'Use CLAUDE_MODEL'], ...models.map((m): [string, string] => [m, m])], s.model)}
      ${input('Delete AI messages after (days, 0 keeps them)', 'retention_days', s as Row, 'type="number" min="0" max="3650"')}
      <label class="check"
        ><input type="checkbox" name="page_numbers" ${s.page_numbers ? raw('checked') : ''} /> Page
        numbers on exports</label
      >
      <button class="primary">Save settings</button>
    </form>
    <h2>Claude usage</h2>
    <p>
      Estimated this month: <b>$${spend.toFixed(4)}</b> of the $${budget} limit. These are
      estimates, not an invoice.
    </p>
    ${
      usage.length
        ? table(
            ['Month', 'Model', 'Requests', 'Tokens in/out', 'Est. USD'],
            usage.map(
              (u) =>
                html`<tr>
                  <td>${date(u['month'])}</td>
                  <td>${u['model']}</td>
                  <td>${u['requests']}</td>
                  <td>${u['input_tokens']} / ${u['output_tokens']}</td>
                  <td>${Number(u['estimated_cost_usd']).toFixed(4)}</td>
                </tr>`,
            ),
          )
        : ''
    }
    <h2>Passkeys</h2>
    <ul>
      ${passkeys.map(
        (k) =>
          html`<li>
            ${k['label']}
            <small>added ${date(k['created_at'])}, last used ${date(k['last_used_at'])}</small>
            ${passkeys.length > 1 ? html`<form class="inline" method="post" action="${BASE}/settings/passkeys/${k['id']}/delete"><button class="ghost">Remove</button></form>` : ''}
          </li>`,
      )}
    </ul>
    <button id="add-passkey">Add another passkey</button>
    <p id="auth-message" class="banner bad" role="alert" hidden></p>
    <h2>Active sessions</h2>
    ${table(
      ['Started', 'Last seen', 'IP', 'Browser', ''],
      sessions.map(
        (x) =>
          html`<tr>
            <td>${date(x['created_at'])}</td>
            <td>${date(x['last_seen_at'])}</td>
            <td>${x['ip'] ?? '—'}</td>
            <td><small>${x['user_agent'] ?? '—'}</small></td>
            <td>
              ${x['id'] === currentSession ? 'This one' : html`<form method="post" action="${BASE}/settings/sessions/${x['id']}/revoke"><button class="ghost">Revoke</button></form>`}
            </td>
          </tr>`,
      ),
    )}
  `;
};

export const notFound = () =>
  html`<!doctype html>
    <html lang="en">
      ${head('Not found')}
      <body class="auth">
        <div class="atmosphere" aria-hidden="true"></div>
        <main id="main" class="auth-panel">
          <p class="label">404</p>
          <h1>Not found</h1>
        </main>
      </body>
    </html>`;
