# 08. Environment variables

Required in production unless a default is given. The full list is in `contract-studio/src/config.ts`. Never commit values.

| Variable                     | Purpose                                                         | Default                        |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------ |
| `DATABASE_URL`               | Application connection: `studio_app` over Railway's private URL | required                       |
| `MIGRATION_DATABASE_URL`     | Owner connection for pre-deploy migrations                      | falls back to `DATABASE_URL`   |
| `APP_ORIGIN`                 | `https://nikolay-georgiev.dev`                                  | required                       |
| `RP_ID`                      | `nikolay-georgiev.dev` (passkeys are bound to it)               | required                       |
| `PROXY_SHARED_SECRET`        | Must match Caddy's `STUDIO_PROXY_SECRET`; 32+ random bytes      | required                       |
| `SETUP_TOKEN`                | One-time passkey enrolment; remove after use                    | none                           |
| `DOCUMENT_DIR`               | Generated files                                                 | `/data/documents` in the image |
| `ANTHROPIC_API_KEY`          | Claude. Without it, chat is off and everything else works       | none                           |
| `CLAUDE_MODEL`               | Default model                                                   | `claude-sonnet-5-5`            |
| `CLAUDE_MAX_OUTPUT_TOKENS`   | Per response                                                    | 8000                           |
| `CLAUDE_HISTORY_MESSAGES`    | Messages sent per turn                                          | 30                             |
| `CLAUDE_MONTHLY_BUDGET_USD`  | Estimated monthly stop                                          | 25                             |
| `CLAUDE_TIMEOUT_MS`          | Per request                                                     | 120000                         |
| `CLAUDE_REQUESTS_PER_MINUTE` | Throttle                                                        | 10                             |
| `CLAUDE_MAX_MESSAGE_CHARS`   | Per message                                                     | 20000                          |
| `SESSION_IDLE_MINUTES`       | Idle limit                                                      | 30                             |
| `SESSION_MAX_HOURS`          | Absolute limit                                                  | 12                             |
| `SESSION_ROTATE_MINUTES`     | Token rotation                                                  | 15                             |

| `APP_DB_PASSWORD` | Password for `studio_app` role; `src/migrate.ts` configures it | none |

On the portfolio service:

| Variable              | Purpose                              |
| --------------------- | ------------------------------------ |
| `STUDIO_UPSTREAM`     | `https://<generated>.up.railway.app` |
| `STUDIO_PROXY_SECRET` | Same value as `PROXY_SHARED_SECRET`  |

## Running locally

Needs Node 24 and a PostgreSQL you create for this. Do not point it at another project's database.

```bash
cd contract-studio
```

```bash
cp .env.example .env
```

```bash
npm install
```

```bash
node --env-file=.env src/migrate.ts
```

```bash
npm run dev
```

Open `http://localhost:18787/workspace/contracts/setup` with a `SETUP_TOKEN` set in `.env`.
