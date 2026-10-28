import type { L } from '@/i18n';

/**
 * What the job-description matcher on /cv knows, besides tech.ts.
 *
 * - `aliases`: how job ads write a tech.ts technology (regular-expression
 *   sources, case-insensitive unless the entry says `cs`). The registry name
 *   itself always matches.
 * - `practices`: skills that are not one technology (REST APIs, auth,
 *   testing…), each with its evidence on the site.
 * - `gaps`: terms job ads often ask for that I have not used. `related` names
 *   the verified skill that is nearest, and `note` says how far it is.
 *
 * Status words: verified (used in a shipped or long-running project),
 * related (nearby experience, said as such), learning, missing (not
 * demonstrated). Nothing here may claim more than a case study shows.
 */

export type Status = 'verified' | 'related' | 'learning' | 'missing';

export interface Practice {
  id: string;
  name: L;
  match: string[];
  /** Match case-sensitively (acronyms that are also words). */
  cs?: boolean;
  status: Status;
  evidence: L;
  /** Case studies that show it (slugs). */
  projects?: string[];
}

export interface Gap {
  id: string;
  name: string;
  match: string[];
  cs?: boolean;
  /** A verified skill id this is close to; without it the term is not demonstrated. */
  related?: string;
  note?: L;
}

/** `only`: match these patterns alone, not the registry name (it is also an ordinary word). */
export const aliases: Record<
  string,
  { match: string[]; cs?: boolean; only?: boolean; status?: Status; note?: L }
> = {
  typescript: { match: ['TypeScript'] },
  javascript: { match: ['JavaScript', 'ECMAScript', 'ES20\\d\\d', 'ES6'] },
  // Not "React Native", a different platform (a gap below), and not the verb
  // "react": "React" alone counts only by name or where it names the library.
  react: {
    match: [
      'React(?:\\.js|JS)',
      // Capitalised mid-sentence: the library; at a sentence start it may be the verb.
      '(?<![.!?:]\\s|^)React(?!\\s+Native)',
      // At a sentence start only where it plainly names the library.
      'React(?=\\s?(?:[,/)&]|and\\b|or\\b|developers?\\b|engineers?\\b|apps?\\b|applications?\\b|components?\\b|hooks?\\b))',
    ],
    cs: true,
    only: true,
  },
  nextjs: { match: ['Next(?:\\.js|JS)', 'NextJS'] },
  tailwind: { match: ['Tailwind(?:\\s?CSS)?'] },
  css: { match: ['HTML5?', 'CSS3?'], cs: true },
  // "node" is an ordinary word in "graph node": only the capitalised or .js forms.
  nodejs: { match: ['Node(?:\\.js|JS)?', 'node\\.?js'], cs: true },
  // "Express your interest": the library only as Express.js or capitalised mid-sentence.
  express: {
    match: [
      'Express(?:\\.js|JS)',
      // Capitalised mid-sentence: the library; at a sentence start it may be the verb.
      '(?<![.!?:]\\s|^)Express',
      'Express(?=\\s?(?:[,/)&]|and\\b|or\\b))',
    ],
    cs: true,
    only: true,
  },
  // "Resend the form": the email service only capitalised mid-sentence.
  resend: {
    match: [
      'Resend(?:\\.js|JS)',
      // Capitalised mid-sentence: the library; at a sentence start it may be the verb.
      '(?<![.!?:]\\s|^)Resend',
    ],
    cs: true,
    only: true,
  },
  postgresql: { match: ['Postgre(?:SQL|s)', 'Postgres'] },
  openapi: { match: ['OpenAPI', 'Swagger'] },
  socketio: { match: ['Socket\\.IO', 'socket\\.io'] },
  sse: { match: ['Server-Sent Events', 'SSE'], cs: true },
  llamacpp: { match: ['llama\\.cpp'] },
  qwen: { match: ['Qwen\\d?'] },
  claude: { match: ['Claude', 'Anthropic'] },
  openai: { match: ['OpenAI(?:\\s+API)?'] },
  // "MCP" alone is also a Microsoft certification.
  mcp: {
    match: ['Model Context Protocol', 'MCP(?=\\s+(?:servers?|tools?|protocol|integrations?))'],
    cs: true,
    only: true,
  },
  whisper: { match: ['(?:faster-)?Whisper'] },
  piper: { match: ['Piper(?:\\s+TTS)?'] },
  r3f: { match: ['React Three Fiber', 'R3F', 'Three\\.js'] },
  cpp: { match: ['(?<![\\w+])C\\+\\+'] },
  csharp: { match: ['(?<!\\w)C#'] },
  dotnet: {
    match: ['(?<![\\w.])\\.NET(?:\\s+Core)?', 'ASP\\.NET(?:\\s+Core)?'],
    status: 'related',
    note: {
      en: 'C# and .NET inside Unity (Caelora); no .NET server or web work.',
      bg: 'C# и .NET в Unity (Caelora); без сървърна или уеб работа с .NET.',
    },
  },
  rust: { match: ['Rust'], cs: true },
  githubactions: { match: ['GitHub Actions'] },
  linux: { match: ['Linux', 'Ubuntu'] },
  windows: { match: ['Windows'], cs: true },
  caddy: { match: ['Caddy'] },
  seo: { match: ['SEO'], cs: true },
  ga4: { match: ['GA4', 'Google Analytics'] },
  gtm: { match: ['Google Tag Manager', 'GTM'] },
  consent: { match: ['Consent Mode'] },
  unity: { match: ['Unity(?:3D)?'], cs: true },
  git: { match: ['Git(?!Hub|Lab)'], cs: true },
  angular: { match: ['Angular(?:JS)?'], cs: true },
  java: { match: ['Java(?!Script)'], cs: true },
  springboot: { match: ['Spring (?:Boot|Framework|MVC)'], cs: true },
};

export const practices: Practice[] = [
  {
    id: 'rest',
    name: { en: 'REST APIs', bg: 'REST API' },
    match: [
      'REST(?:ful)?',
      'web APIs?',
      'HTTP APIs?',
      'API design',
      'API development',
      'уеб API',
      'проектиране на API',
    ],
    status: 'verified',
    evidence: {
      en: 'USS X Academy: an OpenAPI 3.1 contract with 216 operations; Zone 32-19: an Express API with 39 domain modules.',
      bg: 'USS X Academy: договор OpenAPI 3.1 с 216 операции; Zone 32-19: API на Express с 39 домейн модула.',
    },
    projects: ['uss-x-academy', 'zone-32-19'],
  },
  {
    id: 'auth',
    name: { en: 'Authentication', bg: 'Автентикация' },
    match: [
      'authenticat\\w*',
      'authori[sz]ation',
      'OAuth\\s?2?(?:\\.0)?',
      'JWT',
      'SSO',
      'single sign-on',
      '2FA',
      'MFA',
      'TOTP',
      'автентикация(?:та)?',
      'оторизация(?:та)?',
    ],
    status: 'verified',
    evidence: {
      en: 'Zone 32-19: revocable JWT sessions in HttpOnly cookies, TOTP and Google sign-in; USS X Academy: single sign-on across two domains.',
      bg: 'Zone 32-19: JWT сесии в HttpOnly бисквитки, които могат да се отнемат, TOTP и вход с Google; USS X Academy: единен вход между два домейна.',
    },
    projects: ['zone-32-19', 'uss-x-academy'],
  },
  {
    id: 'sql',
    name: { en: 'SQL', bg: 'SQL' },
    match: ['SQL'],
    cs: true,
    status: 'verified',
    evidence: {
      en: 'Raw parameterised SQL on PostgreSQL with versioned migrations (Zone 32-19, USS X Academy).',
      bg: 'Чист параметризиран SQL върху PostgreSQL с версионирани миграции (Zone 32-19, USS X Academy).',
    },
    projects: ['zone-32-19', 'uss-x-academy'],
  },
  {
    id: 'a11y',
    name: { en: 'Accessibility', bg: 'Достъпност' },
    match: ['accessib(?:le|ility)', 'a11y', 'WCAG', 'ARIA', 'screen readers?', 'достъпност(?:та)?'],
    status: 'verified',
    evidence: {
      en: 'USS X Academy: a keyboard-operable map of 28 regions; this site: axe accessibility tests in CI.',
      bg: 'USS X Academy: карта на 28-те области, управлявана с клавиатура; този сайт: тестове за достъпност с axe в CI.',
    },
    projects: ['uss-x-academy'],
  },
  {
    id: 'responsive',
    name: { en: 'Responsive design', bg: 'Адаптивен дизайн' },
    match: [
      'responsive (?:design|web|layouts?|UI|interfaces?|websites?)',
      'mobile-first',
      'cross-browser',
      'адаптивен дизайн',
    ],
    status: 'verified',
    evidence: {
      en: 'This site: tested from 320 to 1920 px in Chromium, Firefox and WebKit, on phones and tablets.',
      bg: 'Този сайт: тестван от 320 до 1920 px в Chromium, Firefox и WebKit, на телефони и таблети.',
    },
  },
  {
    id: 'testing',
    name: { en: 'Automated testing', bg: 'Автоматизирани тестове' },
    match: [
      'unit[- ]test\\w*',
      'integration tests?',
      'end-to-end (?:tests?|testing)',
      'e2e',
      'automated tests?',
      'test automation',
      'Playwright',
      'автоматизирани тестове',
      'тестване',
    ],
    status: 'verified',
    evidence: {
      en: 'Vitest (USS X Academy, J.A.R.V.I.S.); Playwright end-to-end tests in three browser engines (this site).',
      bg: 'Vitest (USS X Academy, J.A.R.V.I.S.); тестове от край до край с Playwright в три браузърни енджина (този сайт).',
    },
    projects: ['uss-x-academy', 'jarvis'],
  },
  {
    id: 'cicd',
    name: { en: 'CI/CD', bg: 'CI/CD' },
    match: ['CI/CD', 'CI', 'continuous integration', 'continuous (?:delivery|deployment)'],
    status: 'verified',
    evidence: {
      en: 'GitHub Actions for J.A.R.V.I.S., Zone 32-19 and this site; deployments on Railway.',
      bg: 'GitHub Actions за J.A.R.V.I.S., Zone 32-19 и този сайт; внедряване в Railway.',
    },
    projects: ['jarvis', 'zone-32-19'],
  },
  {
    id: 'debugging',
    name: { en: 'Debugging', bg: 'Отстраняване на грешки' },
    match: [
      'debug\\w*',
      'troubleshoot\\w*',
      'root[- ]cause',
      'отстраняване на грешки',
      'дебъгване',
    ],
    status: 'verified',
    evidence: {
      en: 'DXC Technology: tracing defects through a large legacy codebase to their root cause.',
      bg: 'DXC Technology: проследяване на дефекти в голяма наследена кодова база до първопричината.',
    },
  },
  {
    id: 'realtime',
    name: { en: 'Realtime and WebSockets', bg: 'Реално време и WebSockets' },
    match: ['real[- ]time', 'WebSockets?', 'реално време'],
    status: 'verified',
    evidence: {
      en: 'Socket.IO with a Redis adapter and WebRTC calls (Zone 32-19); LiveKit classrooms and SSE (USS X Academy).',
      bg: 'Socket.IO с Redis адаптер и WebRTC разговори (Zone 32-19); класни стаи с LiveKit и SSE (USS X Academy).',
    },
    projects: ['zone-32-19', 'uss-x-academy'],
  },
  {
    id: 'payments',
    name: { en: 'Payments', bg: 'Плащания' },
    match: ['payments?', 'billing', 'checkout', 'плащания(?:та)?'],
    status: 'verified',
    evidence: {
      en: 'Zone 32-19: Stripe payments and subscriptions with idempotent webhooks.',
      bg: 'Zone 32-19: плащания и абонаменти със Stripe и идемпотентни уебхукове.',
    },
    projects: ['zone-32-19'],
  },
  {
    id: 'security',
    name: { en: 'Web application security', bg: 'Сигурност на уеб приложения' },
    match: [
      '(?:web|application|app|API) security',
      'secure coding',
      'OWASP',
      'rate limit\\w*',
      'CSRF',
      'сигурност(?:та)? на (?:уеб )?приложения',
    ],
    status: 'verified',
    evidence: {
      en: 'Zone 32-19: CSRF protection, Redis rate limits, an audit log and a WAF built for the edge; this site: a hashed Content Security Policy.',
      bg: 'Zone 32-19: защита от CSRF, ограничения на заявките в Redis, одитен журнал и WAF за входния слой; този сайт: Content Security Policy с хешове.',
    },
    projects: ['zone-32-19'],
  },
  {
    id: 'architecture',
    name: { en: 'Software architecture', bg: 'Софтуерна архитектура' },
    match: [
      'software architecture',
      'system design',
      '(?:frontend|front-end|backend|back-end|application|API|system) architecture',
      'софтуерна архитектура',
    ],
    status: 'verified',
    evidence: {
      en: 'Every case study documents its architecture and decisions; I designed each system on my own.',
      bg: 'Всяко описание на проект документира архитектурата и решенията; проектирал съм всяка система сам.',
    },
    projects: ['uss-x-academy', 'zone-32-19', 'jarvis'],
  },
  {
    id: 'llm',
    name: { en: 'LLM application development', bg: 'Приложения с LLM' },
    match: [
      'LLMs?',
      'large language models?',
      'AI agents?',
      'agentic',
      'tool (?:use|calling|orchestration)',
      'AI integration',
      'generative AI',
      'GenAI',
    ],
    status: 'verified',
    evidence: {
      en: 'J.A.R.V.I.S.: a local Qwen model on llama.cpp and frontier CLIs behind compiled authority tiers.',
      bg: 'J.A.R.V.I.S.: локален модел Qwen на llama.cpp и външни CLI модели зад компилирани нива на правомощия.',
    },
    projects: ['jarvis'],
  },
  {
    id: 'speech',
    name: { en: 'Speech recognition and synthesis', bg: 'Разпознаване и синтез на реч' },
    match: [
      'speech recognition',
      'speech-to-text',
      'text-to-speech',
      'STT',
      'TTS',
      'voice assistants?',
    ],
    status: 'verified',
    evidence: {
      en: 'J.A.R.V.I.S.: local voice with faster-whisper and Piper.',
      bg: 'J.A.R.V.I.S.: локален глас с faster-whisper и Piper.',
    },
    projects: ['jarvis'],
  },
  {
    id: 'english',
    name: { en: 'English', bg: 'Английски' },
    match: ['English', 'английски'],
    cs: true,
    status: 'verified',
    evidence: {
      en: 'Fluent; the daily working language at DXC Technology.',
      bg: 'Свободно; ежедневен работен език в DXC Technology.',
    },
  },
  {
    id: 'bulgarian',
    name: { en: 'Bulgarian', bg: 'Български' },
    match: ['Bulgarian', 'български'],
    cs: true,
    status: 'verified',
    evidence: { en: 'Native.', bg: 'Майчин език.' },
  },
  {
    id: 'german',
    name: { en: 'German', bg: 'Немски' },
    match: ['German', 'немски'],
    cs: true,
    status: 'related',
    evidence: { en: 'A2 level.', bg: 'Ниво A2.' },
  },
  {
    id: 'performance',
    name: { en: 'Performance optimisation', bg: 'Оптимизация на производителността' },
    match: ['performance (?:optimi[sz]ation|tuning)', 'web performance', 'Core Web Vitals'],
    status: 'related',
    evidence: {
      en: 'Caelora: meshing in background jobs; this site: lazy 3D, adaptive resolution and on-demand rendering. No measured production results to cite.',
      bg: 'Caelora: изграждане на мешовете във фонови задачи; този сайт: отложено 3D, адаптивна резолюция и рендиране при нужда. Без измерени резултати от реална употреба.',
    },
    projects: ['caelora'],
  },
  {
    id: 'microservices',
    name: { en: 'Microservices', bg: 'Микроуслуги' },
    match: ['micro-?services?', 'микроуслуги(?:те)?'],
    status: 'related',
    evidence: {
      en: 'USS X Academy runs several Next.js and Express services; Zone 32-19 is a modular monolith. No microservice platform at scale.',
      bg: 'USS X Academy работи като няколко услуги на Next.js и Express; Zone 32-19 е модулен монолит. Без мащабна платформа от микроуслуги.',
    },
    projects: ['uss-x-academy', 'zone-32-19'],
  },
];

const near = (en: string, bg: string): L => ({ en, bg });

export const gaps: Gap[] = [
  {
    id: 'vue',
    name: 'Vue',
    match: ['Vue(?:\\.js|JS)?', 'Nuxt'],
    cs: true,
    related: 'react',
    note: near(
      'Component-based UI in React; Vue itself not used.',
      'Компонентен UI с React; самият Vue не е използван.',
    ),
  },
  {
    id: 'svelte',
    name: 'Svelte',
    match: ['Svelte(?:Kit)?'],
    related: 'react',
    note: near(
      'Component-based UI in React; Svelte not used.',
      'Компонентен UI с React; Svelte не е използван.',
    ),
  },
  { id: 'reactnative', name: 'React Native', match: ['React Native'] },
  { id: 'redux', name: 'Redux', match: ['Redux'] },
  { id: 'graphql', name: 'GraphQL', match: ['GraphQL', 'Apollo'] },
  {
    id: 'sass',
    name: 'Sass',
    match: ['Sass', 'SCSS'],
    related: 'css',
    note: near('CSS and Tailwind CSS; Sass not used.', 'CSS и Tailwind CSS; Sass не е използван.'),
  },
  {
    id: 'vite',
    name: 'Vite',
    match: ['Vite'],
    cs: true,
    related: 'astro',
    note: near(
      'Astro builds on Vite (this site); no direct Vite configuration work to cite.',
      'Astro стъпва на Vite (този сайт); без отделна работа по конфигурация на Vite.',
    ),
  },
  { id: 'webpack', name: 'Webpack', match: ['Webpack'] },
  { id: 'jquery', name: 'jQuery', match: ['jQuery'] },
  { id: 'mongodb', name: 'MongoDB', match: ['Mongo(?:DB)?', 'Mongoose'] },
  {
    id: 'mysql',
    name: 'MySQL',
    match: ['MySQL', 'MariaDB'],
    related: 'postgresql',
    note: near(
      'Relational SQL on PostgreSQL; MySQL itself not used.',
      'Релационен SQL с PostgreSQL; самият MySQL не е използван.',
    ),
  },
  {
    id: 'mssql',
    name: 'SQL Server',
    match: ['SQL Server', 'MSSQL', 'T-SQL'],
    related: 'postgresql',
    note: near(
      'Relational SQL on PostgreSQL; SQL Server not used.',
      'Релационен SQL с PostgreSQL; SQL Server не е използван.',
    ),
  },
  { id: 'elasticsearch', name: 'Elasticsearch', match: ['Elasticsearch', 'OpenSearch'] },
  {
    id: 'jest',
    name: 'Jest',
    match: ['Jest'],
    cs: true,
    related: 'vitest',
    note: near(
      'Vitest, which shares the Jest API; Jest itself not used.',
      'Vitest, който има същия API като Jest; самият Jest не е използван.',
    ),
  },
  {
    id: 'cypress',
    name: 'Cypress',
    match: ['Cypress'],
    related: 'testing',
    note: near(
      'End-to-end tests with Playwright; Cypress not used.',
      'Тестове от край до край с Playwright; Cypress не е използван.',
    ),
  },
  { id: 'tdd', name: 'TDD', match: ['TDD', 'test-driven'] },
  {
    id: 'queues',
    name: 'Kafka / RabbitMQ',
    match: ['Kafka', 'RabbitMQ', 'message (?:queues?|brokers?)'],
    related: 'bullmq',
    note: near(
      'Job queues with BullMQ on Redis; no Kafka or RabbitMQ.',
      'Опашки от задачи с BullMQ върху Redis; без Kafka или RabbitMQ.',
    ),
  },
  {
    id: 'nginx',
    name: 'Nginx',
    match: ['Nginx'],
    related: 'caddy',
    note: near(
      'Caddy as the web server and edge; Nginx not used.',
      'Caddy като уеб сървър и входна точка; Nginx не е използван.',
    ),
  },
  { id: 'kubernetes', name: 'Kubernetes', match: ['Kubernetes', 'K8s', 'Helm'] },
  {
    id: 'aws',
    name: 'AWS',
    match: ['AWS', 'Amazon Web Services', 'Lambda', 'S3', 'EC2'],
    cs: true,
    note: near(
      'Two AWS Partner AI trainings, but no AWS cloud work to cite.',
      'Две обучения на AWS за партньори в областта на AI, но без работа с облака на AWS.',
    ),
  },
  { id: 'azure', name: 'Azure', match: ['Azure'] },
  { id: 'gcp', name: 'Google Cloud', match: ['GCP', 'Google Cloud'] },
  { id: 'terraform', name: 'Terraform', match: ['Terraform', 'infrastructure as code', 'IaC'] },
  {
    id: 'go',
    name: 'Go',
    match: [
      'Golang',
      '(?<=(?:[,(/]|in|with|and|or)\\s?)Go(?![-\\w])',
      'Go(?=\\s?(?:[,)/]|developers?|engineers?|services?))',
    ],
    cs: true,
  },
  { id: 'php', name: 'PHP', match: ['PHP', 'Laravel', 'Symfony'] },
  { id: 'ruby', name: 'Ruby', match: ['Ruby', 'Rails'], cs: true },
  {
    id: 'pyweb',
    name: 'Django / Flask / FastAPI',
    match: ['Django', 'Flask', 'FastAPI'],
    related: 'python',
    note: near(
      'Python for local AI services; no Python web framework.',
      'Python за локални AI услуги; без уеб рамка на Python.',
    ),
  },
  { id: 'kotlin', name: 'Kotlin / Swift', match: ['Kotlin', 'Swift(?:UI)?'], cs: true },
  {
    id: 'ml',
    name: 'Model training',
    match: [
      'PyTorch',
      'TensorFlow',
      'model training',
      'fine-tun\\w*',
      'machine learning',
      'ML engineer',
    ],
  },
  {
    id: 'rag',
    name: 'RAG / vector databases',
    match: ['RAG', 'retrieval-augmented', 'vector (?:databases?|search|stores?)', 'embeddings'],
  },
  { id: 'agile', name: 'Agile / Scrum', match: ['Agile', 'Scrum', 'Kanban', 'Jira'] },
  { id: 'figma', name: 'Figma', match: ['Figma'] },
];
