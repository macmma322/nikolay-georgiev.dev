import type { Diagram } from '@/lib/diagram';

/**
 * Sources: Zone-32-19-Backend (develop @ 2026-09-29), Zone-32-19-Frontend
 * (develop), Zone-32-19-Database-and-Docs, Zone-32-19-WAF-Gateway and the
 * root monorepo docs (RAILWAY_ENVIRONMENTS_SETUP, BFF_VS_WAF_DECISION).
 * Layout: the live path runs straight down the middle (browser, BFF, API);
 * sockets and shared state on the left, the unused WAF and the external
 * services on the right.
 */
export const zonePlatform: Diagram = {
  id: 'zone-platform',
  title: { en: 'Platform topology on Railway', bg: 'Топология на платформата в Railway' },
  caption: {
    en: 'Live path: browser to the Next.js BFF, then to the Express API over Railway private networking. Sockets authenticate with the same HttpOnly session cookie. Redis is the shared state that lets web replicas scale horizontally. The Caddy + Coraza WAF is built and deployable but not yet in the live path. Google OAuth, OpenAI (screening of activity posts), Cloudinary, Resend and Sentry are called from the API and omitted here for clarity.',
    bg: 'Реалният път на трафика: от браузъра към Next.js BFF, после към Express API през частната мрежа на Railway. Сокетите се удостоверяват със същата HttpOnly бисквитка за сесия. Redis е споделеното състояние, благодарение на което уеб репликите се мащабират хоризонтално. WAF с Caddy и Coraza е изграден и готов за внедряване, но още не е в реалния път на трафика. Google OAuth, OpenAI (проверка на публикациите за активности), Cloudinary, Resend и Sentry се извикват от API и за яснота не са показани.',
  },
  cols: 5,
  rows: 5,
  nodes: [
    {
      id: 'browser',
      label: { en: 'Browser', bg: 'Браузър' },
      sub: {
        en: 'Next.js 16 app, Socket.IO\nclient, WebRTC peer media',
        bg: 'Next.js 16 приложение, Socket.IO\nклиент, WebRTC медия между участниците',
      },
      kind: 'client',
      col: 1,
      row: 0,
      colSpan: 2,
    },
    {
      id: 'socket',
      label: { en: 'Socket.IO server', bg: 'Socket.IO сървър' },
      sub: {
        en: 'presence, typing,\nnotifications, call signals',
        bg: 'присъствие, писане,\nизвестия, сигнализация',
      },
      kind: 'service',
      col: 0,
      row: 1,
    },
    {
      id: 'bff',
      label: { en: 'Next.js BFF', bg: 'Next.js BFF' },
      sub: {
        en: '/api/proxy on the same origin;\nforwards cookies and XFF chain',
        bg: '/api/proxy на същия произход;\nпредава бисквитките и XFF веригата',
      },
      kind: 'gateway',
      col: 1,
      row: 1,
      colSpan: 2,
    },
    {
      id: 'waf',
      label: { en: 'WAF gateway', bg: 'WAF шлюз' },
      sub: { en: 'Caddy, Coraza,\nOWASP CRS', bg: 'Caddy, Coraza,\nOWASP CRS' },
      kind: 'gateway',
      col: 3,
      row: 1,
      planned: true,
      tag: { en: 'Built, not live', bg: 'Готов, неактивен' },
    },
    {
      id: 'stripe',
      label: { en: 'Stripe', bg: 'Stripe' },
      sub: { en: 'payments, subscriptions', bg: 'плащания, абонаменти' },
      kind: 'external',
      col: 4,
      row: 1,
    },
    {
      id: 'api',
      label: { en: 'Express API', bg: 'Express API' },
      sub: {
        en: '39 domain modules behind one pipeline:\nrate limits, CSRF, mutation audit',
        bg: '39 модула по домейни зад един конвейер:\nлимити на заявките, CSRF, одит на промените',
      },
      kind: 'service',
      col: 1,
      row: 2,
      colSpan: 3,
      emphasis: true,
    },
    {
      id: 'redis',
      label: { en: 'Redis', bg: 'Redis' },
      sub: {
        en: 'adapter, presence,\nrate limits, nonces',
        bg: 'адаптер, присъствие,\nлимити на заявки, nonce',
      },
      kind: 'store',
      col: 0,
      row: 3,
    },
    {
      id: 'postgres',
      label: { en: 'PostgreSQL', bg: 'PostgreSQL' },
      sub: {
        en: 'public + employee_portal,\n122 SQL migrations',
        bg: 'public + employee_portal,\n122 SQL миграции',
      },
      kind: 'store',
      col: 2,
      row: 3,
    },
    {
      id: 'worker',
      label: { en: 'Scheduled jobs', bg: 'Задачи по график' },
      sub: {
        en: 'node-cron in process,\nCRON_ENABLED gate',
        bg: 'node-cron в процеса,\nфлаг CRON_ENABLED',
      },
      kind: 'worker',
      tag: { en: 'Inside the API', bg: 'Вътре в API' },
      col: 3,
      row: 3,
    },
    {
      id: 'bullmq',
      label: { en: 'BullMQ finance jobs', bg: 'Финанси в BullMQ' },
      sub: {
        en: 'manual syncs, payout\nwebhooks; retries',
        bg: 'ръчни синхр., уебхукове\nза изплащане; повторения',
      },
      kind: 'queue',
      col: 0,
      row: 4,
    },
    {
      id: 'banks',
      label: { en: 'Revolut, Yapily', bg: 'Revolut, Yapily' },
      sub: { en: 'bank data ingestion', bg: 'импорт на банкови данни' },
      kind: 'external',
      col: 4,
      row: 4,
    },
  ],
  edges: [
    { from: 'browser', to: 'bff', label: { en: 'HTTPS', bg: 'HTTPS' }, flow: true },
    {
      from: 'browser',
      to: 'socket',
      fromSide: 'left',
      toSide: 'top',
      label: { en: 'WebSocket', bg: 'WebSocket' },
      flow: true,
    },
    { from: 'browser', to: 'waf', fromSide: 'right', toSide: 'top', dashed: true },
    { from: 'waf', to: 'api', fromSide: 'bottom', toSide: 'top', toOffset: 200, dashed: true },
    {
      from: 'bff',
      to: 'api',
      fromSide: 'bottom',
      toSide: 'top',
      toOffset: -100,
      label: { en: 'private network', bg: 'частна мрежа' },
      flow: true,
    },
    {
      from: 'stripe',
      to: 'api',
      fromSide: 'bottom',
      toSide: 'right',
      label: { en: 'signed webhooks', bg: 'подписани уебхукове' },
    },
    { from: 'api', to: 'postgres', fromSide: 'bottom', toSide: 'top', flow: true },
    { from: 'api', to: 'redis', fromSide: 'left', toSide: 'top', toOffset: 50 },
    {
      from: 'socket',
      to: 'redis',
      fromSide: 'bottom',
      toSide: 'top',
      fromOffset: -40,
      toOffset: -40,
      label: { en: 'pub/sub', bg: 'pub/sub' },
    },
    {
      from: 'bullmq',
      to: 'redis',
      fromSide: 'top',
      toSide: 'bottom',
      label: { en: 'queue state', bg: 'състояние на опашката' },
    },
    { from: 'bullmq', to: 'banks', label: { en: 'jobs', bg: 'задачи' } },
    {
      from: 'worker',
      to: 'banks',
      fromSide: 'bottom',
      toSide: 'top',
      label: { en: 'scheduled sync', bg: 'синхронизация' },
    },
  ],
  tiers: [
    { label: { en: 'Edge', bg: 'Входен слой' }, nodes: ['browser', 'bff', 'waf'] },
    { label: { en: 'Application', bg: 'Приложение' }, nodes: ['api', 'socket', 'worker'] },
    { label: { en: 'State', bg: 'Състояние' }, nodes: ['postgres', 'redis', 'bullmq'] },
    { label: { en: 'External', bg: 'Външни услуги' }, nodes: ['stripe', 'banks'] },
  ],
};

/** Source: src/modules/finance/controllers/stripeWebhookController.js, ledger/services/ledgerPostingService.js */
export const zonePayments: Diagram = {
  id: 'zone-payments',
  title: {
    en: 'Payment correctness: one webhook, one effect',
    bg: 'Коректни плащания: един уебхук, един ефект',
  },
  caption: {
    en: 'Signature verification runs on the raw body. The event id is inserted under a UNIQUE constraint inside the same transaction as the side effects, so Stripe retries and concurrent replicas resolve to exactly one effect, including a single double-entry journal entry per successful payment.',
    bg: 'Подписът се проверява върху суровото тяло на заявката. Идентификаторът на събитието се вмъква с ограничение UNIQUE в същата транзакция като страничните ефекти, така че повторните опити на Stripe и паралелните реплики водят до точно един ефект, включително една-единствена счетоводна статия по двойното записване за всяко успешно плащане.',
  },
  cols: 5,
  rows: 2,
  groups: [
    {
      label: { en: 'One database transaction', bg: 'Една транзакция в базата данни' },
      col: 2,
      row: 0,
      colSpan: 3,
      rowSpan: 2,
    },
  ],
  nodes: [
    {
      id: 'event',
      label: { en: 'Stripe event', bg: 'Събитие от Stripe' },
      sub: { en: 'retried until acknowledged', bg: 'изпраща се отново\nдо потвърждение' },
      kind: 'external',
      col: 0,
      row: 0,
    },
    {
      id: 'verify',
      label: { en: 'Signature check', bg: 'Проверка на подписа' },
      sub: {
        en: 'raw body, reject\nunsigned or altered',
        bg: 'сурово тяло; отхвърля\nнеподписани, променени',
      },
      kind: 'service',
      col: 1,
      row: 0,
    },
    {
      id: 'dedup',
      label: { en: 'Dedup insert', bg: 'Вмъкване без дубли' },
      sub: {
        en: 'UNIQUE event id, ON\nCONFLICT DO NOTHING',
        bg: 'UNIQUE ID на събитие, ON\nCONFLICT DO NOTHING',
      },
      kind: 'store',
      col: 2,
      row: 0,
    },
    {
      id: 'effects',
      label: { en: 'Side effects', bg: 'Странични ефекти' },
      sub: {
        en: 'orders, subscriptions,\nintent upserts',
        bg: 'поръчки, абонаменти,\nupsert на payment intents',
      },
      kind: 'service',
      col: 4,
      row: 0,
    },
    {
      id: 'journal',
      label: { en: 'Journal posting', bg: 'Осчетоводяване' },
      sub: {
        en: 'double-entry lines,\nonce per payment',
        bg: 'двойно записване,\nпо веднъж на плащане',
      },
      kind: 'service',
      col: 4,
      row: 1,
      emphasis: true,
    },
    {
      id: 'skip',
      label: { en: 'Already seen', bg: 'Вече обработено' },
      sub: { en: 'no-op, acknowledged', bg: 'без ефект, потвърдено' },
      kind: 'stage',
      col: 2,
      row: 1,
    },
  ],
  edges: [
    { from: 'event', to: 'verify', flow: true },
    { from: 'verify', to: 'dedup', flow: true },
    { from: 'dedup', to: 'effects', label: { en: 'new', bg: 'ново' }, flow: true },
    { from: 'effects', to: 'journal', flow: true },
    { from: 'dedup', to: 'skip', label: { en: 'duplicate', bg: 'дубликат' } },
  ],
  tiers: [
    {
      label: { en: 'Before the transaction', bg: 'Преди транзакцията' },
      nodes: ['event', 'verify'],
    },
    {
      label: { en: 'One database transaction', bg: 'Една транзакция в базата данни' },
      nodes: ['dedup', 'effects', 'journal', 'skip'],
    },
  ],
};
