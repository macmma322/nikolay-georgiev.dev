import type { L } from '@/i18n';

/**
 * Project plates (src/components/work): the HTML caption, bottom strip and
 * parts legend, plus the words drawn inside each SVG.
 *
 * In-art labels are uppercase mono at 13 units with 0.1em tracking, so every
 * character costs CH units in Latin and Cyrillic alike (Martian Mono). A
 * Bulgarian label has to fit the room its English one was drawn for. Labels
 * that stay English in both languages (system names, identifiers, units, and
 * the few terms whose Bulgarian cannot fit) are written in the plate itself,
 * not here.
 *
 * `parts` order is the legend order; keys are the plates' data-part ids.
 */
interface Plate {
  fig: L;
  strip: L;
  parts: Record<string, L>;
  art: Record<string, L>;
}

/** Advance of one in-art character in viewBox units. */
export const CH = 10.4;

/**
 * textLength for a label longer than the room its geometry leaves: the label
 * tightens its tracking instead of colliding. Undefined when it already fits.
 */
export const fit = (label: string, room: number): number | undefined =>
  label.length * CH - room > 0.5 ? room : undefined;

export const plates = {
  caelora: {
    fig: { en: 'One world, two layers', bg: 'Един свят, два слоя' },
    strip: {
      en: 'Unity 6 · own voxel pipeline · prototype v0.1.0',
      bg: 'Unity 6 · собствен воксел конвейер · прототип v0.1.0',
    },
    parts: {
      sections: {
        en: 'Sections meshed off the main thread',
        bg: 'Секции, изграждани извън основната нишка',
      },
      tree: { en: 'One skeleton per living tree', bg: 'Един скелет за всяко живо дърво' },
      authority: {
        en: 'Deterministic, engine-free rules',
        bg: 'Детерминирани правила, независими от енджина',
      },
      present: {
        en: 'Presentation reads, never writes',
        bg: 'Визуализацията само чете',
      },
      save: { en: 'One checksummed commit', bg: 'Един запис с контролна сума' },
      server: { en: 'Headless server, planned', bg: 'Headless сървър, планиран' },
    },
    art: {
      authority: { en: 'AUTHORITY', bg: 'ПРАВИЛА' },
      present: { en: 'PRESENTATION', bg: 'ВИЗУАЛИЗАЦИЯ' },
      commit: { en: 'COMMIT', bg: 'ЗАПИС' },
      server: { en: 'SERVER · PLANNED', bg: 'СЪРВЪР · ПЛАН' },
      skeleton: { en: 'ONE SKELETON', bg: 'ЕДИН СКЕЛЕТ' },
      sections: { en: 'SECTIONS', bg: 'СЕКЦИИ' },
      commands: { en: 'COMMANDS', bg: 'КОМАНДИ' },
    },
  },

  jarvis: {
    fig: { en: 'Routing and authority', bg: 'Маршрутизиране и правомощия' },
    strip: {
      en: 'Local-first · 100 ops · ceiling tier 2',
      bg: 'Локално · 100 операции · таван: ниво 2',
    },
    parts: {
      router: { en: 'Deterministic router', bg: 'Детерминиран маршрутизатор' },
      lanes: { en: 'FAST, SMART and DEEP lanes', bg: 'Режими FAST, SMART и DEEP' },
      models: {
        en: 'Local model or tool-less adviser',
        bg: 'Локален модел или съветник без инструменти',
      },
      claim: { en: 'Capability-claim check', bg: 'Проверка на твърденията за възможности' },
      tiers: { en: 'Executable ceiling at tier 2', bg: 'Таван за изпълнение на ниво 2' },
      approval: { en: 'Single-use local approval', bg: 'Еднократно локално одобрение' },
    },
    art: {
      router: { en: 'ROUTER', bg: 'МАРШРУТИЗАТОР' },
      intents: { en: '37 INTENTS', bg: '37 НАМЕРЕНИЯ' },
      calls0: { en: '0 CALLS', bg: '0 ЗАЯВКИ' },
      calls1: { en: '1 CALL', bg: '1 ЗАЯВКА' },
      bounded: { en: 'BOUNDED', bg: 'ОГРАНИЧЕН' },
      answer: { en: 'ANSWER', bg: 'ОТГОВОР' },
      local: { en: 'LOCAL', bg: 'ЛОКАЛЕН' },
      receipts: { en: 'RECEIPTS', bg: 'РАЗПИСКИ' },
      tier: { en: 'TIER', bg: 'НИВО' },
      ceiling: { en: 'EXECUTABLE CEILING', bg: 'ТАВАН ЗА ИЗПЪЛНЕНИЕ' },
      singleUse: { en: 'SINGLE-USE', bg: 'ЕДНОКРАТНО' },
      approval: { en: 'APPROVAL', bg: 'ОДОБРЕНИЕ' },
      localUi: { en: 'LOCAL UI', bg: 'ЛОКАЛЕН UI' },
    },
  },

  'zone-32-19': {
    fig: { en: 'Shared state', bg: 'Споделено състояние' },
    strip: {
      en: 'Modular monolith · 39 modules · 2 schemas',
      bg: 'Модулен монолит · 39 модула · 2 схеми',
    },
    parts: {
      bff: { en: 'Same-origin Next.js BFF', bg: 'Next.js BFF на същия произход' },
      api: {
        en: 'Express API, built for N replicas; 39 modules',
        bg: 'Express API за N реплики; 39 модула',
      },
      redis: { en: 'Redis as shared state', bg: 'Redis като споделено състояние' },
      schemas: { en: 'Two schemas behind a wall', bg: 'Две схеми, разделени от стена' },
      webhook: { en: 'Same event twice, one effect', bg: 'Едно събитие два пъти, един ефект' },
    },
    art: {
      browser: { en: 'BROWSER', bg: 'БРАУЗЪР' },
      modules: { en: '· 39 MODULES', bg: '· 39 МОДУЛА' },
      presence: { en: 'SOCKETS · PRESENCE', bg: 'СОКЕТИ · ПРИСЪСТВИЕ' },
      rateLimits: { en: 'RATE LIMITS', bg: 'ЛИМИТИ НА ЗАЯВКИ' },
      tables: { en: 'POSTGRESQL · ~438 TABLES', bg: 'POSTGRESQL · ~438 ТАБЛИЦИ' },
      effect: { en: '1 EFFECT', bg: '1 ЕФЕКТ' },
    },
  },

  'uss-x-academy': {
    fig: { en: 'Directory and courses', bg: 'Указател и курсове' },
    strip: {
      en: 'Cross-domain SSO · SSE · 46 migrations',
      bg: 'SSO между домейни · SSE · 46 миграции',
    },
    parts: {
      map: { en: 'Directory map, 28 regions', bg: 'Карта на указателя, 28 области' },
      focus: { en: 'Operable by keyboard', bg: 'Работи с клавиатура' },
      apply: { en: 'Intake to staff review', bg: 'От прием до преглед от екипа' },
      class: { en: 'Waiting room to attendance', bg: 'От чакалня до присъствие' },
      locales: {
        en: 'Bulgarian first, English, Russian',
        bg: 'Български по подразбиране, английски, руски',
      },
    },
    art: {
      regions: { en: '28 REGIONS · NUTS 3', bg: '28 ОБЛАСТИ · NUTS 3' },
      keyboard: { en: 'KEYBOARD-OPERABLE', bg: 'РАБОТИ С КЛАВИАТУРА' },
      intake: { en: 'INTAKE', bg: 'ПРИЕМ' },
      application: { en: 'APPLICATION', bg: 'ЗАЯВКА' },
      review: { en: 'STAFF REVIEW', bg: 'ПРЕГЛЕД ОТ ЕКИПА' },
      waiting: { en: 'WAITING ROOM', bg: 'ЧАКАЛНЯ' },
      classroom: { en: 'CLASSROOM', bg: 'КЛАСНА СТАЯ' },
      attendance: { en: 'ATTENDANCE', bg: 'ПРИСЪСТВИЕ' },
    },
  },

  kobait: {
    fig: { en: 'Link and failsafe', bg: 'Връзка и аварийно спиране' },
    strip: {
      en: 'Two boards · own radio protocol · bench-tested',
      bg: 'Две платки · собствен радиопротокол · изпитан на стенд',
    },
    parts: {
      remote: { en: 'Handheld remote', bg: 'Ръчно дистанционно' },
      link: { en: 'Radio link, own protocol', bg: 'Радиовръзка със собствен протокол' },
      auto: { en: 'AUTO waypoints, gated off', bg: 'AUTO по маршрутни точки, изключен' },
      failsafe: { en: 'Silence stops the boat', bg: 'Тишината в ефира спира лодката' },
    },
    art: {
      remote: { en: 'REMOTE', bg: 'ДИСТАНЦИОННО' },
      link: { en: 'RADIO LINK', bg: 'РАДИОВРЪЗКА' },
      auto: { en: 'AUTO · GATED OFF', bg: 'AUTO · ИЗКЛЮЧЕН' },
      silence: { en: 'SILENCE', bg: 'ТИШИНА' },
      stop: { en: 'STOP', bg: 'СТОП' },
    },
  },

  malrynth: {
    fig: { en: 'Canonicalisation', bg: 'Привеждане в канонична форма' },
    strip: {
      en: 'malboot · 42,496 bytes · byte-reproducible',
      bg: 'malboot · 42\u00a0496 байта · побайтово възпроизводим',
    },
    parts: {
      boot: { en: 'Boot path 00 to 04; 05 is next', bg: 'Път на зареждане 00–04; 05 предстои' },
      untrusted: { en: 'Firmware map, untrusted', bg: 'Карта от фърмуера, недоверена' },
      sort: { en: 'Sorted and merged', bg: 'Сортиране и сливане' },
      reserve: {
        en: 'Reservations win overlaps',
        bg: 'Резервациите имат предимство при припокриване',
      },
      owned: { en: 'Usable RAM, rounded inward', bg: 'Използваема RAM, закръглена навътре' },
      frames: {
        en: 'Frames compacted across holes',
        bg: 'Номерацията на рамките прескача дупките',
      },
      next: { en: 'Next: direct map of RAM only', bg: 'Предстои: директно картиране само на RAM' },
    },
    art: {
      firmware: { en: 'FIRMWARE', bg: 'ФЪРМУЕР' },
      kernel: { en: 'KERNEL', bg: 'ЯДРО' },
      memory: { en: 'PHYSICAL MEMORY', bg: 'ФИЗИЧЕСКА ПАМЕТ' },
      paging: { en: 'PAGING · NEXT', bg: 'СТРАНИРАНЕ' },
      untrusted: { en: 'UNTRUSTED', bg: 'НЕДОВЕРЕНА' },
      hole: { en: 'HOLE', bg: 'ДУПКА' },
      bitmaps: { en: '2 BITMAPS', bg: '2 БИТОВИ КАРТИ' },
      ramOnly: { en: 'RAM ONLY', bg: 'САМО RAM' },
    },
  },

  stemini: {
    fig: { en: 'Prompt to printer', bg: 'От промпт до принтер' },
    strip: {
      en: '5 services · 3 AI providers · 40 tables',
      bg: '5 услуги · 3 AI доставчика · 40 таблици',
    },
    parts: {
      prompt: { en: 'Prompt', bg: 'Промпт' },
      concept: { en: 'Up to 3 concept images', bg: 'До 3 концептуални изображения' },
      gate: { en: 'Human approval', bg: 'Одобрение от човек' },
      mesh: { en: 'Paid mesh step', bg: 'Платено генериране на 3D мрежа' },
      slice: { en: 'Sandboxed slicing', bg: 'Слайсване в изолирана среда' },
      bridge: {
        en: 'Outbound-only printer bridge',
        bg: 'Мост към принтера само с изходящи заявки',
      },
      ledger: { en: 'Tokens settled once', bg: 'Еднократно отчитане на токените' },
    },
    art: {
      prompt: { en: 'PROMPT', bg: 'ПРОМПТ' },
      concept: { en: 'CONCEPT', bg: 'КОНЦЕПЦИЯ' },
      upTo3: { en: 'UP TO 3', bg: 'ДО 3' },
      approval: { en: 'HUMAN APPROVAL', bg: 'РЪЧНО ОДОБРЕНИЕ' },
      regenerate: { en: 'REGENERATE', bg: 'НОВ ОПИТ' },
      mesh: { en: 'MESH', bg: '3D МРЕЖА' },
      paid: { en: 'PAID STEP', bg: 'ПЛАТЕНА' },
      slice: { en: 'SLICE', bg: 'СЛАЙСВАНЕ' },
      outbound: { en: 'OUTBOUND', bg: 'САМО' },
      only: { en: 'ONLY', bg: 'ИЗХОДЯЩИ' },
      bridge: { en: 'BRIDGE', bg: 'МОСТ' },
      adapters: { en: '5 ADAPTERS', bg: '5 АДАПТЕРА' },
      printer: { en: 'PRINTER', bg: 'ПРИНТЕР' },
      reserve: { en: 'RESERVE', bg: 'РЕЗЕРВИРАНЕ' },
      settle: { en: 'CHARGE OR RELEASE', bg: 'СПИСВАНЕ/ВРЪЩАНЕ' },
      once: { en: 'EXACTLY ONCE', bg: 'ТОЧНО ВЕДНЪЖ' },
      tokens: { en: 'TOKENS', bg: 'ТОКЕНИ' },
    },
  },
} as const satisfies Record<string, Plate>;

export type PlateSlug = keyof typeof plates;
