import type { Diagram } from '@/lib/diagram';

/**
 * Source: macmma322/J.A.R.V.I.S main @ c2ad733 (2026-08-28).
 * packages/core/src/brain/{runtime,router,provider-lane}.ts,
 * services/{agent,capability-claim,local-runtime,provider}.ts
 */
export const jarvisRequestPath: Diagram = {
  id: 'jarvis-request',
  title: {
    en: 'Request path: deterministic routing before any model',
    bg: 'Път на заявката: детерминирано маршрутизиране преди всеки модел',
  },
  caption: {
    en: 'A typed or spoken request is routed by compiled rules first. Only SMART and DEEP turns reach a model, and every model answer is checked against what the runtime actually executed before it is shown or spoken.',
    bg: 'Написаната или изговорената заявка първо минава през компилирани правила. Само репликите в режим SMART и DEEP стигат до модел, а всеки отговор на модела се сверява с това, което системата реално е изпълнила, преди да бъде показан или изговорен.',
  },
  cols: 5,
  rows: 5,
  nodes: [
    {
      id: 'input',
      label: { en: 'Typed or spoken input', bg: 'Текст или глас' },
      sub: { en: 'terminal, window,\npush-to-talk', bg: 'терминал, прозорец,\npush-to-talk' },
      kind: 'client',
      col: 0,
      row: 0,
    },
    {
      id: 'l1',
      label: { en: 'Working memory (L1)', bg: 'Работна памет (L1)' },
      sub: {
        en: 'subject as identifiers,\nno transcripts',
        bg: 'темата като ID,\nбез транскрипции',
      },
      kind: 'service',
      col: 1,
      row: 0,
    },
    {
      id: 'router',
      label: { en: 'Cognitive router', bg: 'Когнитивен маршрутизатор' },
      sub: {
        en: 'hazard scan first, 37 intents,\nEnglish / Bulgarian',
        bg: 'първо проверка за опасности, 37 намерения,\nанглийски / български',
      },
      kind: 'service',
      col: 2,
      row: 0,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'fast',
      label: { en: 'FAST lane', bg: 'Режим FAST' },
      sub: {
        en: 'compiled evidence,\n0 provider calls',
        bg: 'компилирани данни,\n0 заявки към доставчик',
      },
      kind: 'stage',
      col: 1,
      row: 1,
    },
    {
      id: 'smart',
      label: { en: 'SMART lane', bg: 'Режим SMART' },
      sub: {
        en: 'evidence packet,\n1 provider call',
        bg: 'пакет с данни,\n1 заявка към доставчик',
      },
      kind: 'stage',
      col: 2,
      row: 1,
    },
    {
      id: 'deep',
      label: { en: 'DEEP lane', bg: 'Режим DEEP' },
      sub: { en: 'bounded agent loop', bg: 'ограничен агентен цикъл' },
      kind: 'stage',
      col: 3,
      row: 1,
    },
    {
      id: 'tools',
      label: { en: 'Tool broker', bg: 'Брокер' },
      sub: {
        en: '21 read-only tools,\nrequested by id only',
        bg: '21 инструмента само за\nчетене, искани по ID',
      },
      kind: 'service',
      col: 4,
      row: 1,
    },
    {
      id: 'lane',
      label: { en: 'Provider lane', bg: 'Избор на доставчик' },
      sub: {
        en: 'who reasons: local or frontier',
        bg: 'кой разсъждава: локален или облачен модел',
      },
      kind: 'service',
      col: 2,
      row: 2,
      colSpan: 2,
    },
    {
      id: 'local',
      label: { en: 'Local Qwen3-8B', bg: 'Локален Qwen3-8B' },
      sub: {
        en: 'llama.cpp server on\nloopback, per-start token',
        bg: 'llama.cpp на loopback,\nнов токен при старт',
      },
      kind: 'model',
      col: 2,
      row: 3,
    },
    {
      id: 'frontier',
      label: { en: 'Frontier CLI adapters', bg: 'Облачни модели (CLI)' },
      sub: {
        en: 'Claude default, Codex,\nGemini; zero tools granted',
        bg: 'Claude (основен), Codex,\nGemini; без инструменти',
      },
      kind: 'external',
      col: 3,
      row: 3,
    },
    {
      id: 'claim',
      label: { en: 'Capability-claim check', bg: 'Проверка на твърденията за възможности' },
      sub: {
        en: 'answer vs. execution receipts',
        bg: 'сверява отговора с разписките за изпълнение',
      },
      kind: 'service',
      col: 2,
      row: 4,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'answer',
      label: { en: 'Answer', bg: 'Отговор' },
      sub: {
        en: 'exact text; speech routed\nby language or silence',
        bg: 'точен текст; глас според\nезика или мълчание',
      },
      kind: 'client',
      col: 1,
      row: 4,
    },
  ],
  edges: [
    { from: 'input', to: 'l1', flow: true },
    { from: 'l1', to: 'router', flow: true },
    { from: 'router', to: 'fast', fromSide: 'bottom', toSide: 'top' },
    { from: 'router', to: 'smart', fromSide: 'bottom', toSide: 'top' },
    { from: 'router', to: 'deep', fromSide: 'bottom', toSide: 'top', flow: true },
    { from: 'deep', to: 'tools', both: true },
    { from: 'smart', to: 'lane', fromSide: 'bottom', toSide: 'top' },
    { from: 'deep', to: 'lane', fromSide: 'bottom', toSide: 'top', flow: true },
    {
      from: 'lane',
      to: 'local',
      fromSide: 'bottom',
      toSide: 'top',
      label: { en: 'low-risk', bg: 'нисък риск' },
    },
    {
      from: 'lane',
      to: 'frontier',
      fromSide: 'bottom',
      toSide: 'top',
      label: { en: 'default', bg: 'иначе' },
      flow: true,
    },
    { from: 'local', to: 'claim', fromSide: 'bottom', toSide: 'top' },
    { from: 'frontier', to: 'claim', fromSide: 'bottom', toSide: 'top', flow: true },
    { from: 'claim', to: 'answer', fromSide: 'left', toSide: 'right', flow: true },
    {
      from: 'fast',
      to: 'answer',
      fromSide: 'bottom',
      toSide: 'top',
      label: { en: 'no model', bg: 'без модел' },
    },
  ],
  tiers: [
    { label: { en: 'Input and context', bg: 'Вход и контекст' }, nodes: ['input', 'l1', 'router'] },
    { label: { en: 'Lanes', bg: 'Режими' }, nodes: ['fast', 'smart', 'deep', 'tools'] },
    { label: { en: 'Who reasons', bg: 'Кой разсъждава' }, nodes: ['lane', 'local', 'frontier'] },
    {
      label: { en: 'Before anything is said', bg: 'Преди да се каже нещо' },
      nodes: ['claim', 'answer'],
    },
  ],
};

/**
 * Source: apps/{desktop,host,cli,mcp}, packages/{security,vault,storage},
 * workers/voice, packages/core/src/operator on main @ c2ad733.
 * Layout: the host sits level with the core so the pipe is one straight run;
 * memory hangs under the core, the authority chain descends on the right.
 */
export const jarvisTopology: Diagram = {
  id: 'jarvis-topology',
  title: {
    en: 'Process and authority topology',
    bg: 'Топология на процесите и правомощията',
  },
  caption: {
    en: 'Three surfaces share one TypeScript core. The Rust shell is a thin gate that talks to a Node host over a parent-child pipe, so no local port is ever opened. Authority is a compiled registry: the only executable writes are five reversible file operations behind a single-use approval in the local UI. Stronger approval backends exist as interfaces that fail closed.',
    bg: 'Три интерфейса споделят едно TypeScript ядро. Обвивката на Rust е тънък филтър, който говори с Node хоста през канал между родителски и дъщерен процес, затова никога не се отваря локален порт. Правомощията са компилиран регистър: единствените записи, които могат да се изпълнят, са пет обратими файлови операции зад еднократно одобрение в локалния интерфейс. По-силните механизми за одобрение съществуват като интерфейси, които при неуспех отказват.',
  },
  cols: 5,
  rows: 4,
  groups: [
    {
      label: { en: 'Native desktop app', bg: 'Настолно приложение' },
      col: 0,
      row: 0,
      colSpan: 1,
      rowSpan: 4,
    },
  ],
  nodes: [
    {
      id: 'ui',
      label: { en: 'Living Core UI', bg: 'Living Core UI' },
      sub: {
        en: 'React 19, React Three\nFiber; derived state only',
        bg: 'React 19, React Three\nFiber; само изведени данни',
      },
      kind: 'client',
      col: 0,
      row: 0,
    },
    {
      id: 'tauri',
      label: { en: 'Tauri v2 shell', bg: 'Обвивка на Tauri v2' },
      sub: {
        en: 'Rust; one command,\ncompiled method gate',
        bg: 'Rust; една команда,\nкомпилиран филтър',
      },
      kind: 'gateway',
      col: 0,
      row: 1,
    },
    {
      id: 'host',
      label: { en: 'Node host process', bg: 'Node хост процес' },
      sub: {
        en: 'owns the Core, writer\nlock and microphone',
        bg: 'държи ядрото, микрофона\nи заключването за запис',
      },
      kind: 'service',
      col: 0,
      row: 2,
    },
    {
      id: 'voice',
      label: { en: 'Python voice worker', bg: 'Python гласов процес' },
      sub: {
        en: 'faster-whisper, Piper,\nopenWakeWord',
        bg: 'faster-whisper, Piper,\nopenWakeWord',
      },
      kind: 'worker',
      col: 0,
      row: 3,
    },
    {
      id: 'cli',
      label: { en: 'jarvis CLI', bg: 'jarvis CLI' },
      sub: { en: 'versioned --json envelopes', bg: 'версиониран --json изход' },
      kind: 'client',
      col: 1,
      row: 0,
    },
    {
      id: 'mcp',
      label: { en: 'MCP server', bg: 'MCP сървър' },
      sub: {
        en: 'stdio, 45 read-only-\nannotated tools',
        bg: 'stdio, 45 инструмента,\nозначени само за четене',
      },
      kind: 'client',
      col: 2,
      row: 0,
    },
    {
      id: 'core',
      label: { en: '@jarvis/core', bg: '@jarvis/core' },
      sub: {
        en: 'one composition root for\nevery surface',
        bg: 'един композиционен корен\nза всички интерфейси',
      },
      kind: 'service',
      col: 1,
      row: 1,
      colSpan: 2,
      emphasis: true,
    },
    {
      id: 'tasks',
      label: { en: 'Durable task queue', bg: 'Опашка със задачи' },
      sub: {
        en: 'crash-honest recovery,\nsingle writer',
        bg: 'трайна; честна след срив,\nедин записващ процес',
      },
      kind: 'queue',
      col: 3,
      row: 1,
    },
    {
      id: 'authority',
      label: { en: 'Authority registry', bg: 'Правомощия' },
      sub: {
        en: '100 compiled operations,\nexecutable ceiling: tier 2',
        bg: 'регистър: 100 операции,\nизпълнение до ниво 2',
      },
      kind: 'service',
      col: 3,
      row: 2,
      emphasis: true,
    },
    {
      id: 'vault',
      label: { en: 'Markdown vault', bg: 'Markdown хранилище' },
      sub: {
        en: 'sole authoritative memory;\nmodels may only propose',
        bg: 'меродавната памет;\nмоделите само предлагат',
      },
      kind: 'store',
      col: 1,
      row: 3,
    },
    {
      id: 'sqlite',
      label: { en: 'SQLite cache', bg: 'SQLite кеш' },
      sub: { en: '12 migrations,\nrebuildable', bg: '12 миграции,\nможе да се пресъздаде' },
      kind: 'store',
      col: 2,
      row: 3,
    },
    {
      id: 'operator',
      label: { en: 'Controlled operator', bg: 'Файлов оператор' },
      sub: {
        en: '5 reversible file ops,\nsingle-use approval',
        bg: '5 обратими операции,\nеднократно одобрение',
      },
      kind: 'service',
      col: 3,
      row: 3,
    },
    {
      id: 'hello',
      label: { en: 'Windows Hello / TOTP', bg: 'Windows Hello / TOTP' },
      sub: {
        en: 'interfaces only,\nreport not-implemented',
        bg: 'само интерфейси,\nвръщат „не е изградено“',
      },
      kind: 'service',
      col: 4,
      row: 2,
      planned: true,
    },
  ],
  edges: [
    { from: 'ui', to: 'tauri', label: { en: 'IPC', bg: 'IPC' } },
    {
      from: 'tauri',
      to: 'host',
      label: { en: 'stdin/stdout pipe', bg: 'stdin/stdout канал' },
      flow: true,
    },
    { from: 'host', to: 'voice', label: { en: 'line protocol', bg: 'протокол по редове' } },
    {
      from: 'host',
      to: 'core',
      fromSide: 'right',
      toSide: 'bottom',
      toOffset: -170,
      flow: true,
    },
    { from: 'cli', to: 'core', fromSide: 'bottom', toSide: 'top', toOffset: -100 },
    { from: 'mcp', to: 'core', fromSide: 'bottom', toSide: 'top', toOffset: 100 },
    { from: 'core', to: 'tasks', fromSide: 'right', toSide: 'left' },
    { from: 'core', to: 'vault', fromSide: 'bottom', toSide: 'top', fromOffset: -100 },
    { from: 'core', to: 'sqlite', fromSide: 'bottom', toSide: 'top', fromOffset: 100 },
    {
      from: 'tasks',
      to: 'authority',
      fromSide: 'bottom',
      toSide: 'top',
      label: { en: 'op id', bg: 'ID на операция' },
    },
    {
      from: 'operator',
      to: 'authority',
      fromSide: 'top',
      toSide: 'bottom',
      label: { en: 'authorize', bg: 'разрешение' },
    },
    { from: 'authority', to: 'hello', dashed: true },
  ],
  tiers: [
    {
      label: { en: 'Native desktop app', bg: 'Настолно приложение' },
      nodes: ['ui', 'tauri', 'host', 'voice'],
    },
    { label: { en: 'Other surfaces', bg: 'Други интерфейси' }, nodes: ['cli', 'mcp'] },
    {
      label: { en: 'Core and memory', bg: 'Ядро и памет' },
      nodes: ['core', 'tasks', 'vault', 'sqlite'],
    },
    { label: { en: 'Authority', bg: 'Правомощия' }, nodes: ['authority', 'operator', 'hello'] },
  ],
};
