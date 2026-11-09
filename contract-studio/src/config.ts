// Everything environment-specific. Secrets stay in process.env and are never
// stored in PostgreSQL or logged.
export const BASE = '/workspace/contracts';
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
export const ALLOWED_MODELS = [
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-haiku-5-5',
  'claude-fable-5-1',
];

const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

export function loadConfig(env: Record<string, string | undefined> = process.env) {
  const production = env['NODE_ENV'] === 'production';
  const required = (name: string, devDefault: string) => {
    const value = env[name];
    if (value) return value;
    if (production) throw new Error(`${name} is required in production`);
    return devDefault;
  };
  const appOrigin = required('APP_ORIGIN', 'http://localhost:18787').replace(/\/$/, '');
  return {
    production,
    port: number(env['PORT'], 18787),
    databaseUrl: required('DATABASE_URL', 'postgres://postgres@127.0.0.1:5433/studio'),
    appOrigin,
    rpId: required('RP_ID', new URL(appOrigin).hostname),
    // Only the portfolio's Caddy knows this: a direct hit on the Railway domain gets a 404.
    proxySecret: required('PROXY_SHARED_SECRET', ''),
    setupToken: env['SETUP_TOKEN'] ?? '',
    documentDir: required('DOCUMENT_DIR', './.data/documents'),
    secureCookies: appOrigin.startsWith('https:'),
    sessionIdleMinutes: number(env['SESSION_IDLE_MINUTES'], 30),
    sessionMaxHours: number(env['SESSION_MAX_HOURS'], 12),
    sessionRotateMinutes: number(env['SESSION_ROTATE_MINUTES'], 15),
    anthropicApiKey: env['ANTHROPIC_API_KEY'] ?? '',
    anthropicBaseUrl: env['ANTHROPIC_BASE_URL'],
    model: env['CLAUDE_MODEL'] || DEFAULT_MODEL,
    maxOutputTokens: number(env['CLAUDE_MAX_OUTPUT_TOKENS'], 8000),
    historyMessages: number(env['CLAUDE_HISTORY_MESSAGES'], 30),
    requestTimeoutMs: number(env['CLAUDE_TIMEOUT_MS'], 120_000),
    aiRequestsPerMinute: number(env['CLAUDE_REQUESTS_PER_MINUTE'], 10),
    monthlyBudgetUsd: number(env['CLAUDE_MONTHLY_BUDGET_USD'], 25),
    maxMessageChars: number(env['CLAUDE_MAX_MESSAGE_CHARS'], 20_000),
  };
}

export type Config = ReturnType<typeof loadConfig>;
