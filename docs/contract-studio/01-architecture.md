# 01. Architecture

Verified against the repository and Railway on 2026-11-09.

## What already exists

- The portfolio is **Astro 7, fully static**. An older Next.js version was retired in September 2026 (see the legacy redirects in `Caddyfile`).
- It runs on Railway project `portfolio-resume`, service `Nikolay-Georgiev`. The image is Caddy serving `dist/`. There is no Node, database or authentication at runtime.
- The same project hosts `mail-agent`, a small Node service. That was the convention to follow: an isolated folder with its own Dockerfile and `node --test`.
- CI (`.github/workflows/ci.yml`) covers formatting, types, the mail agent's tests, build with `dist` audit, and Playwright.

## What was built

A static site cannot hold secrets or sessions, so Contract Studio is a **modular monolith in its own folder and its own Railway project**.

```
Browser  ──HTTPS──▶  nikolay-georgiev.dev (Caddy, public portfolio)
                        │  /workspace, /workspace/*  only
                        │  adds X-Studio-Proxy-Secret, X-Studio-Client-Ip
                        ▼  public HTTPS (Railway private networks do not span projects)
                     Contract Studio service (Railway project: personal-contract-studio)
                        ├─▶ PostgreSQL, private network only
                        ├─▶ /data volume, generated PDF and DOCX
                        └─▶ Anthropic Messages API

Windows 11 ── railway connect --tunnel-only ──▶ PostgreSQL ◀── DataGrip on 127.0.0.1
```

| Part                  | Location                         |
| --------------------- | -------------------------------- |
| Application           | `contract-studio/src`            |
| Schema                | `contract-studio/migrations`     |
| Contract templates    | `contract-studio/templates`      |
| Portfolio integration | one route in `Caddyfile`         |
| Windows tunnel        | `scripts/windows/railway-tunnel` |

## Boundaries

- **Nothing about the workspace enters the public build.** No navigation entry, sitemap line or bundle reference; `dist/` was searched to confirm. `robots.txt` is deliberately untouched, because a `Disallow` line would advertise the path. `X-Robots-Tag: noindex, noarchive, nofollow` is sent instead.
- **The URL is not the protection.** Every route except `/login`, setup and a few static assets requires a server-side session.
- **The Railway domain is not a way in.** Without the shared secret that only Caddy holds, the service answers 404 to everything except `/healthz`, which returns only `{"ok":true}`.
- The application never depends on the Windows tunnel.

## Technical decisions

| Decision                                                                    | Reason                                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Same origin at `/workspace/contracts`, proxied by Caddy                     | Your preferred URL. The public site is static with a hashed CSP, so sharing an origin with it adds little risk. |
| Dedicated Railway project                                                   | Client contracts stay isolated from Zone, Academy and the portfolio.                                            |
| Server-rendered HTML (Hono's escaping `html` template), small client script | No client bundle or duplicate API surface. The application code reaches the browser only after sign-in.         |
| TypeScript run directly by Node 24, no build step                           | One less moving part. Also why the `Dockerfile` is short.                                                       |
| `pg` with plain SQL migrations, no ORM                                      | The repository has none, the schema is small, and database constraints do the important work.                   |
| Passkeys only                                                               | No password to store, leak or phish. Hand-written password authentication was explicitly unwanted.              |
| Append-only versions, enforced by a database trigger                        | The guarantee holds even for a bug or a DataGrip session.                                                       |
| Structured content rendered deterministically                               | Claude's text is never the authoritative document.                                                              |
| Files on a Railway volume, metadata in PostgreSQL                           | As you asked: no large binaries in the database.                                                                |

## Main security assumptions

- Control of the Railway account is the root of trust: it can set `SETUP_TOKEN` and read every secret. Protect it with 2FA.
- Railway's edge replaces `X-Real-IP`. This was measured for the mail agent, and Caddy forwards that value.
- One replica. Rate limits are per process.

Costs: [11-operating-costs.md](11-operating-costs.md).
