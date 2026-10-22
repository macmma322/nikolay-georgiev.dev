import type { Diagram } from '@/lib/diagram';

/**
 * Sources: ussone-academy-backend@dev, ussone-academy-frontend@dev,
 * ussone-auth-service@dev, ussone-accounts-frontend@dev and the umbrella
 * repository (docs/operations/railway-production-topology.md, ADR-0011, ADR-0024).
 * Layout: column 3 stays open in the top two rows so the login and ticket
 * edges run straight and carry their labels.
 */
export const ussxPlatform: Diagram = {
  id: 'ussx-platform',
  title: { en: 'Production services', bg: 'Услуги в продукция' },
  caption: {
    en: 'Two Next.js frontends, an Express 5 API and a separate auth service, all deployed on Railway. PostgreSQL is the system of record with core, academy and stemini schemas; the auth service owns identity in the core schema. LiveKit carries only media: who may join, admission, locking and moderation are decided by the API. Email goes through a transactional outbox to Resend, and background loops run inside the API process.',
    bg: 'Два фронтенда на Next.js, API на Express 5 и отделна услуга за автентикация, всички внедрени в Railway. PostgreSQL е меродавната база данни със схемите core, academy и stemini; услугата за автентикация отговаря за идентичността в схемата core. LiveKit пренася само медията, а API решава кой може да влезе и отговаря за допускането, заключването и модерирането. Имейлите минават през транзакционен outbox към Resend, а фоновите цикли работят в процеса на API.',
  },
  cols: 5,
  rows: 3,
  nodes: [
    {
      id: 'livekit',
      label: { en: 'LiveKit', bg: 'LiveKit' },
      sub: {
        en: 'WebRTC media only;\njoin token from the API',
        bg: 'само WebRTC медия;\nтокен за влизане от API',
      },
      kind: 'external',
      col: 0,
      row: 0,
    },
    {
      id: 'fe',
      label: { en: 'Academy frontend', bg: 'Фронтенд на Academy' },
      sub: {
        en: 'Next.js 15, 72 routes,\nbg / en / ru',
        bg: 'Next.js 15, 72 маршрута,\nbg / en / ru',
      },
      kind: 'client',
      col: 1,
      row: 0,
      colSpan: 2,
    },
    {
      id: 'accounts',
      label: { en: 'Accounts app', bg: 'Акаунти' },
      sub: { en: 'hosted login,\naccount pages', bg: 'хостван вход,\nстраници на акаунта' },
      kind: 'client',
      col: 4,
      row: 0,
    },
    {
      id: 'api',
      label: { en: 'Academy API', bg: 'Academy API' },
      sub: {
        en: 'Express 5, ~250 routes, SSE realtime,\nLiveKit tokens, signed file URLs',
        bg: 'Express 5, ~250 маршрута, SSE в реално време,\nLiveKit токени, подписани URL за файлове',
      },
      kind: 'service',
      col: 1,
      row: 1,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'auth',
      label: { en: 'Auth and SSO service', bg: 'Автентикация и SSO' },
      sub: {
        en: 'Argon2id, master session,\nsingle-use tickets',
        bg: 'Argon2id, главна сесия,\nеднократни билети',
      },
      kind: 'service',
      col: 4,
      row: 1,
    },
    {
      id: 'volume',
      label: { en: 'File volume', bg: 'Файлов том' },
      sub: { en: 'HMAC-signed,\nshort-lived URLs', bg: 'краткотрайни URL,\nподписани с HMAC' },
      kind: 'store',
      col: 0,
      row: 2,
    },
    {
      id: 'pg',
      label: { en: 'PostgreSQL', bg: 'PostgreSQL' },
      sub: {
        en: 'core · academy · stemini,\n46 forward-only migrations',
        bg: 'core · academy · stemini,\n46 миграции само напред',
      },
      kind: 'store',
      col: 1,
      row: 2,
      colSpan: 2,
    },
    {
      id: 'redis',
      label: { en: 'Redis', bg: 'Redis' },
      sub: {
        en: 'sessions, SSE fan-out,\nclass chat, nonces',
        bg: 'сесии, SSE разпращане,\nчат на класа, nonce',
      },
      kind: 'store',
      col: 3,
      row: 2,
    },
    {
      id: 'stemini',
      label: { en: 'Stemini services', bg: 'Услуги на Stemini' },
      sub: { en: 'separate product,\nshared identity', bg: 'отделен продукт,\nобща идентичност' },
      kind: 'external',
      col: 4,
      row: 2,
      tag: { en: 'Other product', bg: 'Друг продукт' },
    },
  ],
  edges: [
    { from: 'fe', to: 'livekit', fromSide: 'left', toSide: 'right' },
    {
      from: 'fe',
      to: 'api',
      label: { en: 'REST + CSRF, SSE', bg: 'REST + CSRF, SSE' },
      flow: true,
    },
    {
      from: 'fe',
      to: 'accounts',
      fromSide: 'right',
      toSide: 'left',
      label: { en: 'login', bg: 'вход' },
    },
    { from: 'accounts', to: 'auth', label: { en: 'proxy', bg: 'прокси' } },
    {
      from: 'api',
      to: 'auth',
      fromSide: 'right',
      toSide: 'left',
      label: { en: 'redeem ticket', bg: 'размяна на билет' },
      both: true,
    },
    {
      from: 'auth',
      to: 'stemini',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: 40,
      toOffset: 40,
      dashed: true,
    },
    { from: 'api', to: 'pg', label: { en: 'SQL', bg: 'SQL' }, flow: true },
    {
      from: 'api',
      to: 'redis',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: 130,
      toOffset: -40,
    },
    {
      from: 'auth',
      to: 'redis',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: -40,
      toOffset: 40,
    },
    { from: 'api', to: 'volume', fromSide: 'bottom', toSide: 'top', fromOffset: -130 },
  ],
  tiers: [
    { label: { en: 'Clients', bg: 'Клиенти' }, nodes: ['fe', 'accounts', 'livekit'] },
    { label: { en: 'Services', bg: 'Услуги' }, nodes: ['api', 'auth', 'stemini'] },
    { label: { en: 'State', bg: 'Състояние' }, nodes: ['pg', 'redis', 'volume'] },
  ],
};

/** Source: ussone-auth-service src/modules/sso/ticket.service.ts; backend src/modules/sso/sso.routes.ts */
export const ussxSso: Diagram = {
  id: 'ussx-sso',
  title: {
    en: 'Cross-domain sign-in without shared cookies',
    bg: 'Вход между домейни без споделени бисквитки',
  },
  caption: {
    en: 'Products on different registrable domains cannot share a cookie, and no credential should cross between them. Login happens once on the accounts app; the product receives a short-lived, single-use signed ticket, redeems it server-to-server and mints its own first-party session.',
    bg: 'Продукти на различни регистрируеми домейни не могат да споделят бисквитка, а идентификационни данни не бива да преминават между тях. Входът става веднъж, в приложението за акаунти; продуктът получава краткотраен, еднократен подписан билет, разменя го директно между сървърите и създава собствена сесия на своя домейн.',
  },
  cols: 5,
  rows: 2,
  nodes: [
    {
      id: 'start',
      label: { en: '/auth/login', bg: '/auth/login' },
      sub: {
        en: 'redirect with an\nallow-listed return',
        bg: 'пренасочване с разрешен\nадрес за връщане',
      },
      kind: 'service',
      tag: { en: 'Academy', bg: 'Academy' },
      col: 0,
      row: 0,
    },
    {
      id: 'authorize',
      label: { en: 'Accounts authorize', bg: 'Оторизация' },
      sub: {
        en: 'hosted login,\n__Host- master cookie',
        bg: 'хостван вход в Акаунти,\nглавна __Host- бисквитка',
      },
      kind: 'client',
      col: 1,
      row: 0,
    },
    {
      id: 'ticket',
      label: { en: 'Signed ticket', bg: 'Подписан билет' },
      sub: {
        en: 'HMAC-SHA256, 60 s,\nbound to one app',
        bg: 'HMAC-SHA256, 60\u00a0с,\nза едно приложение',
      },
      kind: 'stage',
      col: 2,
      row: 0,
    },
    {
      id: 'callback',
      label: { en: '/sso/callback', bg: '/sso/callback' },
      sub: {
        en: 'redeem server-to-\nserver, service auth',
        bg: 'размяна между сървъри,\nавтентикация на услуга',
      },
      kind: 'service',
      tag: { en: 'Academy', bg: 'Academy' },
      col: 3,
      row: 0,
    },
    {
      id: 'session',
      label: { en: 'Academy session', bg: 'Сесия в Academy' },
      sub: {
        en: 'first-party HttpOnly\ncookie plus CSRF',
        bg: 'собствена HttpOnly\nбисквитка и CSRF',
      },
      kind: 'store',
      col: 4,
      row: 0,
      emphasis: true,
    },
    {
      id: 'nonce',
      label: { en: 'Redis nonce ledger', bg: 'Регистър на nonce' },
      sub: {
        en: 'burned atomically,\nreplay refused',
        bg: 'Redis, атомарно изгаряне;\nотхвърля повторения',
      },
      kind: 'store',
      col: 3,
      row: 1,
    },
  ],
  edges: [
    { from: 'start', to: 'authorize', flow: true },
    { from: 'authorize', to: 'ticket', flow: true },
    { from: 'ticket', to: 'callback', flow: true },
    { from: 'callback', to: 'session', flow: true },
    { from: 'callback', to: 'nonce', label: { en: 'burn', bg: 'изгаряне' } },
  ],
  tiers: [
    {
      label: { en: 'Sign in once', bg: 'Вход веднъж' },
      nodes: ['start', 'authorize', 'ticket'],
    },
    {
      label: { en: 'Redeem, then mint a session', bg: 'Размяна, после собствена сесия' },
      nodes: ['callback', 'nonce', 'session'],
    },
  ],
};
