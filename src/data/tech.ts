/**
 * Technology registry. `level` is about evidence, not self-rating:
 *   core     used in depth in shipped or long-running systems
 *   working  used for real in at least one project
 *   learning being built with right now
 *   planned  deliberate next step, no production use yet
 * `proof` lists project slugs where the repository shows the technology.
 * Names are never translated; `label` localizes the few that contain ordinary
 * words (read a display name through techName()).
 */
import type { L, Locale } from '@/i18n';

export type TechLevel = 'core' | 'working' | 'learning' | 'planned';

export type TechCategory =
  | 'frontend'
  | 'backend'
  | 'realtime'
  | 'ai'
  | 'embedded'
  | 'systems'
  | 'game'
  | 'infra'
  | 'product'
  | 'next';

export interface Tech {
  id: string;
  /** Language-neutral (English) name: monograms, keywords, sprite titles. */
  name: string;
  /** Display name per locale, only where the name has ordinary words. */
  label?: L;
  icon?: string;
  category: TechCategory;
  level: TechLevel;
  proof: string[];
  note?: L;
  /** Two or three letters shown when no brand icon exists. */
  mono?: string;
}

export const CATEGORY_LABEL: Record<TechCategory, { title: L; blurb: L }> = {
  frontend: {
    title: { en: 'Web', bg: 'Уеб' },
    blurb: {
      en: 'Interfaces that stay fast and accessible.',
      bg: 'Интерфейси, които остават бързи и достъпни.',
    },
  },
  backend: {
    title: { en: 'Backend and data', bg: 'Бекенд и данни' },
    blurb: {
      en: 'APIs, schemas, transactions, queues.',
      bg: 'API, схеми, транзакции, опашки.',
    },
  },
  realtime: {
    title: { en: 'Realtime', bg: 'Реално време' },
    blurb: {
      en: 'Presence, messaging, calls, live media.',
      bg: 'Присъствие, съобщения, разговори, медия на живо.',
    },
  },
  ai: {
    title: { en: 'AI', bg: 'AI' },
    blurb: {
      en: 'Local models, routing, voice, tool boundaries.',
      bg: 'Локални модели, маршрутизиране, глас, граници на инструментите.',
    },
  },
  embedded: {
    title: { en: 'Hardware', bg: 'Хардуер' },
    blurb: {
      en: 'Firmware, radio links, sensors, motors, printers.',
      bg: 'Фърмуер, радиовръзки, сензори, мотори, принтери.',
    },
  },
  systems: {
    title: { en: 'System software', bg: 'Системен софтуер' },
    blurb: {
      en: 'Rust, boot, kernels, desktop shells.',
      bg: 'Rust, зареждане, ядра, десктоп среди.',
    },
  },
  game: {
    title: { en: 'Game development', bg: 'Разработка на игри' },
    blurb: {
      en: 'Voxel worlds, deterministic simulation, saves.',
      bg: 'Воксел светове, детерминистична симулация, записи.',
    },
  },
  infra: {
    title: { en: 'Infrastructure', bg: 'Инфраструктура' },
    blurb: {
      en: 'Deploys, gateways, CI, observability.',
      bg: 'Внедряване, шлюзове, CI, наблюдаемост.',
    },
  },
  product: {
    title: { en: 'Payments and growth', bg: 'Плащания и растеж' },
    blurb: { en: 'Billing, SEO, measurement.', bg: 'Таксуване, SEO, измерване.' },
  },
  next: {
    title: { en: 'Expanding into', bg: 'Следваща стъпка' },
    blurb: {
      en: 'Deliberate next stack, not yet proven.',
      bg: 'Съзнателно избран следващ стек, още недоказан.',
    },
  },
};

export const LEVEL_LABEL: Record<TechLevel, L> = {
  core: { en: 'Core', bg: 'Основен стек' },
  working: { en: 'Working', bg: 'Работни познания' },
  learning: { en: 'Learning', bg: 'Усвоявам' },
  planned: { en: 'Planned', bg: 'Предстои' },
};

/** What each level claims, shown in the legend of the full evidence matrix. */
export const LEVEL_NOTE: Record<TechLevel, L> = {
  core: {
    en: 'Used in depth in shipped or long-running systems.',
    bg: 'Използвани задълбочено в пуснати или дългосрочни системи.',
  },
  working: {
    en: 'Used for real in at least one project.',
    bg: 'Използвани реално в поне един проект.',
  },
  learning: { en: 'Being built with right now.', bg: 'С тях изграждам нещо в момента.' },
  planned: {
    en: 'A deliberate next step, no production use yet.',
    bg: 'Съзнателна следваща стъпка, все още без реална употреба.',
  },
};

export const tech: Tech[] = [
  // Frontend
  {
    id: 'typescript',
    name: 'TypeScript',
    icon: 'typescript',
    category: 'frontend',
    level: 'core',
    proof: ['jarvis', 'uss-x-academy', 'zone-32-19'],
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: 'javascript',
    category: 'frontend',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'react',
    name: 'React',
    icon: 'react',
    category: 'frontend',
    level: 'core',
    proof: ['zone-32-19', 'uss-x-academy', 'jarvis'],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    icon: 'nextdotjs',
    category: 'frontend',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'astro',
    name: 'Astro',
    icon: 'astro',
    category: 'frontend',
    level: 'working',
    proof: [],
    note: { en: 'This site', bg: 'Този сайт' },
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    icon: 'tailwindcss',
    category: 'frontend',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'css',
    name: 'HTML and CSS',
    label: { en: 'HTML and CSS', bg: 'HTML и CSS' },
    icon: 'css',
    category: 'frontend',
    level: 'core',
    proof: [],
  },
  {
    id: 'gsap',
    name: 'GSAP',
    icon: 'greensock',
    category: 'frontend',
    level: 'working',
    proof: ['zone-32-19'],
  },
  {
    id: 'r3f',
    name: 'React Three Fiber',
    icon: 'threedotjs',
    category: 'frontend',
    level: 'working',
    proof: ['jarvis'],
  },

  // Backend
  {
    id: 'nodejs',
    name: 'Node.js',
    icon: 'nodedotjs',
    category: 'backend',
    level: 'core',
    proof: ['zone-32-19', 'uss-x-academy', 'jarvis'],
  },
  {
    id: 'express',
    name: 'Express',
    icon: 'express',
    category: 'backend',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    icon: 'postgresql',
    category: 'backend',
    level: 'core',
    proof: ['zone-32-19', 'uss-x-academy'],
  },
  {
    id: 'redis',
    name: 'Redis',
    icon: 'redis',
    category: 'backend',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    icon: 'sqlite',
    category: 'backend',
    level: 'working',
    proof: ['jarvis'],
  },
  {
    id: 'nestjs',
    name: 'NestJS',
    icon: 'nestjs',
    category: 'backend',
    level: 'working',
    proof: ['stemini'],
  },
  {
    id: 'bullmq',
    name: 'BullMQ',
    mono: 'MQ',
    category: 'backend',
    level: 'working',
    proof: ['zone-32-19'],
  },
  {
    id: 'openapi',
    name: 'OpenAPI',
    icon: 'openapiinitiative',
    category: 'backend',
    level: 'working',
    proof: ['uss-x-academy'],
  },
  {
    id: 'resend',
    name: 'Resend',
    icon: 'resend',
    category: 'backend',
    level: 'working',
    proof: ['uss-x-academy', 'zone-32-19'],
  },
  { id: 'zod', name: 'Zod', icon: 'zod', category: 'backend', level: 'working', proof: ['jarvis'] },

  // Realtime
  {
    id: 'socketio',
    name: 'Socket.IO',
    icon: 'socketdotio',
    category: 'realtime',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'livekit',
    name: 'LiveKit',
    icon: 'livekit',
    category: 'realtime',
    level: 'working',
    proof: ['uss-x-academy'],
  },
  {
    id: 'sse',
    name: 'Server-Sent Events',
    mono: 'SSE',
    category: 'realtime',
    level: 'working',
    proof: ['uss-x-academy'],
  },
  {
    id: 'webrtc',
    name: 'WebRTC',
    icon: 'webrtc',
    category: 'realtime',
    level: 'working',
    proof: ['zone-32-19'],
  },

  // AI
  {
    id: 'llamacpp',
    name: 'llama.cpp',
    mono: 'LL',
    category: 'ai',
    level: 'working',
    proof: ['jarvis'],
  },
  { id: 'qwen', name: 'Qwen3', icon: 'qwen', category: 'ai', level: 'working', proof: ['jarvis'] },
  {
    id: 'claude',
    name: 'Claude',
    icon: 'anthropic',
    category: 'ai',
    level: 'core',
    proof: ['jarvis'],
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    mono: 'OAI',
    category: 'ai',
    level: 'working',
    proof: ['zone-32-19', 'stemini'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: 'googlegemini',
    category: 'ai',
    level: 'working',
    proof: ['jarvis', 'stemini'],
  },
  {
    id: 'meshy',
    name: 'Meshy 3D API',
    mono: '3D',
    category: 'ai',
    level: 'working',
    proof: ['stemini'],
  },
  {
    id: 'mcp',
    name: 'Model Context Protocol',
    icon: 'modelcontextprotocol',
    category: 'ai',
    level: 'working',
    proof: ['jarvis'],
  },
  {
    id: 'whisper',
    name: 'faster-whisper',
    mono: 'STT',
    category: 'ai',
    level: 'working',
    proof: ['jarvis'],
  },
  {
    id: 'piper',
    name: 'Piper TTS',
    mono: 'TTS',
    category: 'ai',
    level: 'working',
    proof: ['jarvis'],
  },
  {
    id: 'python',
    name: 'Python',
    icon: 'python',
    category: 'ai',
    level: 'working',
    proof: ['jarvis'],
  },

  // Embedded
  {
    id: 'orcaslicer',
    name: 'OrcaSlicer CLI',
    mono: 'SL',
    category: 'embedded',
    level: 'working',
    proof: ['stemini'],
  },
  {
    id: 'cpp',
    name: 'C++',
    icon: 'cplusplus',
    category: 'embedded',
    level: 'working',
    proof: ['kobait'],
  },
  {
    id: 'arduino',
    name: 'Arduino',
    icon: 'arduino',
    category: 'embedded',
    level: 'working',
    proof: ['kobait'],
  },

  // Systems
  {
    id: 'rust',
    name: 'Rust',
    icon: 'rust',
    category: 'systems',
    level: 'learning',
    proof: ['malrynth', 'jarvis'],
  },
  {
    id: 'uefi',
    name: 'UEFI',
    mono: 'EFI',
    category: 'systems',
    level: 'learning',
    proof: ['malrynth'],
  },
  {
    id: 'x86',
    name: 'x86-64',
    mono: 'x64',
    category: 'systems',
    level: 'learning',
    proof: ['malrynth'],
  },
  {
    id: 'qemu',
    name: 'QEMU and OVMF',
    label: { en: 'QEMU and OVMF', bg: 'QEMU и OVMF' },
    icon: 'qemu',
    category: 'systems',
    level: 'learning',
    proof: ['malrynth'],
  },
  {
    id: 'tauri',
    name: 'Tauri',
    icon: 'tauri',
    category: 'systems',
    level: 'working',
    proof: ['jarvis'],
  },

  // Infrastructure
  {
    id: 'docker',
    name: 'Docker',
    icon: 'docker',
    category: 'infra',
    level: 'working',
    proof: ['zone-32-19'],
  },
  {
    id: 'railway',
    name: 'Railway',
    icon: 'railway',
    category: 'infra',
    level: 'core',
    proof: ['zone-32-19'],
  },
  {
    id: 'caddy',
    name: 'Caddy + Coraza WAF',
    icon: 'caddy',
    category: 'infra',
    level: 'working',
    proof: ['zone-32-19'],
  },
  {
    id: 'githubactions',
    name: 'GitHub Actions',
    icon: 'githubactions',
    category: 'infra',
    level: 'working',
    proof: ['jarvis', 'zone-32-19'],
  },
  { id: 'git', name: 'Git', icon: 'git', category: 'infra', level: 'core', proof: [] },
  {
    id: 'linux',
    name: 'Linux',
    icon: 'linux',
    category: 'infra',
    level: 'working',
    proof: ['jarvis'],
  },
  {
    id: 'windows',
    name: 'Windows',
    mono: 'WIN',
    category: 'infra',
    level: 'working',
    proof: ['jarvis'],
  },
  {
    id: 'vitest',
    name: 'Vitest',
    icon: 'vitest',
    category: 'infra',
    level: 'working',
    proof: ['jarvis', 'uss-x-academy'],
  },
  {
    id: 'sentry',
    name: 'Sentry',
    icon: 'sentry',
    category: 'infra',
    level: 'working',
    proof: ['zone-32-19'],
  },

  // Product
  {
    id: 'stripe',
    name: 'Stripe',
    icon: 'stripe',
    category: 'product',
    level: 'working',
    proof: ['zone-32-19'],
  },
  {
    id: 'seo',
    name: 'Technical SEO',
    label: { en: 'Technical SEO', bg: 'Техническо SEO' },
    mono: 'SEO',
    category: 'product',
    level: 'working',
    proof: ['uss-x-academy'],
    note: { en: 'JSON-LD, sitemaps, hreflang', bg: 'JSON-LD, карти на сайта, hreflang' },
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    icon: 'googleanalytics',
    category: 'product',
    level: 'working',
    proof: ['uss-x-academy'],
  },
  {
    id: 'googleads',
    name: 'Google Ads',
    icon: 'googleads',
    category: 'product',
    level: 'working',
    proof: ['uss-x-academy'],
    note: {
      en: 'Technical setup and conversion tracking',
      bg: 'Техническа настройка и проследяване на конверсии',
    },
  },
  {
    id: 'gtm',
    name: 'Google Tag Manager',
    icon: 'googletagmanager',
    category: 'product',
    level: 'working',
    proof: ['uss-x-academy'],
  },
  {
    id: 'consent',
    name: 'Consent Mode v2',
    mono: 'CM',
    category: 'product',
    level: 'working',
    proof: ['uss-x-academy'],
  },

  // Game development
  {
    id: 'unity',
    name: 'Unity',
    icon: 'unity',
    category: 'game',
    level: 'working',
    proof: ['caelora'],
  },
  { id: 'csharp', name: 'C#', mono: 'C#', category: 'game', level: 'working', proof: ['caelora'] },
  {
    id: 'dotnet',
    name: '.NET',
    icon: 'dotnet',
    category: 'game',
    level: 'working',
    proof: ['caelora'],
  },

  // Next
  { id: 'java', name: 'Java', icon: 'openjdk', category: 'next', level: 'planned', proof: [] },
  {
    id: 'springboot',
    name: 'Spring Boot',
    icon: 'springboot',
    category: 'next',
    level: 'planned',
    proof: [],
  },
  {
    id: 'angular',
    name: 'Angular',
    icon: 'angular',
    category: 'next',
    level: 'learning',
    proof: ['caelora'],
  },
];

const byId = new Map(tech.map((t) => [t.id, t]));

export function getTech(id: string): Tech {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown technology id "${id}"`);
  return t;
}

/** The name to show in this locale. */
export function techName(t: Tech, locale: Locale): string {
  return t.label?.[locale] ?? t.name;
}
