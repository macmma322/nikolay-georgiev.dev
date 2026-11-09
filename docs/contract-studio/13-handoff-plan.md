# 13. Handoff plan: finishing Contract Studio

Written 2026-11-09 for an agent with no memory of the earlier work. Do the work packages (WP) in order. Stop at every **GATE** and ask the owner.

Bugs listed here were found by reading the code. They have **not been reproduced yet**. For each one, write a failing test first, then fix it.

## 1. Where things stand

| Item | Value |
| --- | --- |
| Worktree | `D:\Responsive-CV\.claude\worktrees\contract-studio` |
| Branch | `feat/private-ai-contract-studio`, local only, based on `origin/main` |
| Commit | `2392c09` (this plan file is uncommitted) |
| Application | `contract-studio/` |
| Docs | `docs/contract-studio/` |
| Tunnel scripts | `scripts/windows/railway-tunnel/` |
| Portfolio edits | `Caddyfile`, `.dockerignore`, `tsconfig.json` |

**Verified locally:** 84 `node --test` tests, a 20-step Chromium journey with a virtual passkey, DOCX opened in real Word, and the old and new `Caddyfile` compared on 17 public paths with no differences.

**Not done:** security review, Railway project, any real Claude API call, real tunnel run, lawyer review, push or merge.

The product is a private, single-user tool at `https://nikolay-georgiev.dev/workspace/contracts`. It manages Bulgarian freelance software contracts. Claude drafts and proposes; a human applies and approves. Approved versions never change.

## 2. Rules that must not be broken

**Facts that may look wrong but are correct. Do not "fix" them:**

- The date is November 2026. `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-haiku-5-5` and `claude-fable-5-1` are real model IDs, checked in Anthropic's docs. Keep `claude-sonnet-5-5` as the default.
- `.ts` files run directly on Node 24 with no build step. Use only erasable TypeScript: no `enum`, no constructor parameter properties. Import with the `.ts` extension. Use `import type` for types.
- The portfolio is Astro 7, not Next.js. Zod is v4, Hono v4, `@simplewebauthn/server` v14. Check `node_modules` types before changing an API call.
- Port 18787 is deliberate, because something else on this machine uses 8787.
- DataGrip uses 15433, because the Zone tunnel owns 15432.

**Safety:**

- Never push to `origin`. It is a **public** repository. See WP6.
- Never touch the Railway projects `zone-32-19`, `ussxacademy-stemini`, or any service in `portfolio-resume`, except as stated in WP8.
- Never modify the scheduled task `Zone DB tunnel (Railway dev)` or `C:\Users\nikol\.zone\`.
- Never edit `D:\Responsive-CV` (the main checkout, which has 22 line-ending-only "modified" files). Stay in the worktree.
- Never print, log or commit secrets. Pipe generated values straight into `railway variable set`.
- The owner sets `ANTHROPIC_API_KEY` personally. Never ask for it in chat.
- Billable resources need explicit owner approval. It has **not** been given yet.

**Product rules:**

- Parties come only from client records and Settings. Claude's tool schemas must keep having no field for parties, status or approval.
- Do not edit statute citations or legal clause text unless a task says so. Do not mark any template as lawyer-reviewed, and do not write that a document is enforceable or compliant.
- No tax calculations.
- Never edit `migrations/0001_init.sql`. Add new numbered files. The runner refuses edited migrations.
- Keep it small. No new frameworks, ORM, microservices or client bundles.

## 3. How to work

Always use absolute paths or set the directory explicitly in each command. A stray `cd ..` earlier sent a build to the wrong checkout, because npm walks up to the nearest `package.json`.

From `contract-studio/`:

```bash
npx tsc --noEmit
```

```bash
npm test
```

```bash
npm run test:e2e
```

From the worktree root, to check the public site:

```bash
npm run typecheck
```

```bash
npm run build
```

Notes:

- Tests start their own throwaway PostgreSQL, so Docker is not needed.
- On this Windows machine `npm run format:check` reports hundreds of files because of CRLF. Ignore that. For new files use `npx prettier --write --end-of-line lf <paths>`.
- The trailing "SYNCHRONOUS TERMINATION NOTICE" from the test runner is harmless.
- Commit after each WP on this branch only, ending the message with `Co-Authored-By` for the model actually used.

**WP0: baseline.** Run the three commands above. All must pass before you change anything. If they do not, stop and report.

## 4. Known bugs (WP1)

### 1.1 Draft-marked file served after approval (P0)

`exportVersion` in `src/contracts.ts` returns any existing row for the version and format. In the normal flow a version is exported as a draft and then approved. The later download returns the file with the "ЧЕРНОВА" footer, and the status never advances to `exported`, because the update sits only on the new-file path.

Fix:

1. Add `migrations/0002_document_finality.sql`: add `draft boolean not null default false` to `generated_documents`, drop the unique constraint on `(contract_version_id, format)`, add unique `(contract_version_id, format, draft)`.
2. In `exportVersion`, compute `draft = version.approval_state !== 'approved'` and look up by all three columns.
3. Store as `<version-id>.draft.<ext>` or `<version-id>.<ext>`.
4. Draft filename ends in `-v4-draft.pdf`. Add a parameter to `safeFilename`. Update the regex at E2E steps 13 and 14.
5. Insert with `on conflict do nothing`, then re-select, so two simultaneous exports cannot cause a 500.
6. Move the `approved → exported` status update so it runs on both paths.

Tests: export draft, approve, export again. The second file has no "ЧЕРНОВА", has a different sha256, and the status is `exported`.

### 1.2 Four of the six document types cannot be completed (P0)

`POST /documents` passes no `parent`, `change` or `settlement`. `parseEdit` in `src/app.ts` only keeps those when the base content already has them. So a payment settlement's fields are silently dropped on save. Parent references can only ever come from the change-request path. Check which templates use them:

```bash
grep -l "parent\.\|change\.\|settlement\." contract-studio/templates/*.bg.json
```

Fix:

1. In `newDocumentView`, add an optional select "Parent contract" listing existing contracts.
2. In `createContract`, accept `parentId`. Load the parent and its approved (or current) version, and build `parent` the same way `prepareAdditionalAgreement` does (extract a helper). Reject with 422 if the parent belongs to another client.
3. Scan the template definition for `change.` and `settlement.` placeholders or lists, and initialise `change: { deliverables: [] }` or `settlement: { instalments: [] }` when they are used.
4. In `editForm` (`src/views.ts`), decide which sections to show from `content.change` / `content.settlement`, not from the template key.
5. `acceptance-protocol` reuses `change.description` for reservations. Check whether that clause is optional. If it is required, the label must make sense to the user. Remove the `acceptance-protocol` exclusion in `documents.test.ts` if possible.

Test: for each of the 6 templates, over HTTP: create with a parent, fill, move to ready for review, approve, export PDF.

### 1.3 Session rotation can log the user out (P1)

In `src/auth.ts` `loadSession`:

- The asset route for `studio.js` in `src/app.ts` calls it and can rotate the token without sending the new cookie. Add an option such as `{ rotate: false }` and use it there.
- Two parallel requests can both rotate. Make the update conditional (`where id = $1 and token_hash = $old`) and treat zero rows as not rotated.
- Remove the redundant `app.use(BASE, ...)` session block if `${BASE}/*` already covers the bare path. The first security test must still return 303 for the empty path.

### 1.4 Deleting a draft leaves files on disk (P1)

`deleteContract` removes rows, but `/data/documents/<contract-id>/` stays, which keeps personal data. `rm` that directory after the transaction commits. It needs `config`, so add the parameter. Test it.

### 1.5 Cover the production cookie (P1)

The test "session cookie attributes on login start" asserts nothing real. Replace it: force a rotation over HTTP with the `https` config and assert that `Set-Cookie` contains `__Host-studio`, `HttpOnly`, `Secure`, `SameSite=Strict` and `Path=/`.

### 1.6 Unbound proposal draft is not atomic (P2)

`POST /proposals/:id/draft` creates a project, then the contract. An unknown client gives a 500 and can leave a stray project. Validate the client first, or do both in one transaction.

### 1.7 Smaller items (P2)

- `/workspace` alone returns 404 from the app. Add a redirect to `BASE`, after the proxy-secret middleware.
- Tool schemas from `z.toJSONSchema` include `$schema`. Strip it in `TOOLS` (`src/ai.ts`) so the real API cannot object.
- Party line wording in `src/render.ts` says `наричан по-долу „ВЪЗЛОЖИТЕЛ“`, but clauses use `Възложителят` / `Изпълнителят`. Add separate label values `Възложител` / `Изпълнител` (`Client` / `Contractor`) for the party line. Keep the uppercase signature labels.
- Add a test that migration failure against an unreachable database exits non-zero and prints no connection string.

**Done when:** all tests pass, including the new ones, and each P0 and P1 item has a test.

## 5. Security review (WP2)

The independent review never ran. If possible use a different model or a fresh session from the one that wrote the fixes. Read every path end to end, and report only concrete, exploitable problems with the exact request.

Check:

- Hono middleware order, and whether any route answers before the session check.
- Encoded-slash or path tricks against `${BASE}/*`, and HEAD or OPTIONS behaviour.
- WebAuthn verification parameters, challenge reuse, and setup-token replay.
- Proxy secret handling and trust in `X-Studio-Client-Ip`.
- GET routes with side effects: the contract page creates a conversation, and export records an audit event and may change status. Decide whether `SameSite=Strict` is enough or whether export should move to POST.
- Every `raw()`, the `rendered_html` path, the client markdown renderer, and each `innerHTML` / `insertAdjacentHTML`.
- Every SQL string built by concatenation, including `create-app-role.ts`.
- Path handling in assets and document storage.
- What a hostile client string or a hostile tool call can do, including proposals applied to the wrong contract and clause edits.
- Ways around version immutability. Note that `studio_app` can run `set local studio.allow_purge = 'on'`. Consider moving purge to an owner-only function.
- Budget race, error and log leakage, and the Docker privilege drop.

Fix findings with tests. Record what was checked in `docs/contract-studio/03-authentication-security.md`.

## 6. Polish and verification (WP3)

1. Render an exported PDF to images and look at it: margins, headings, page breaks, signature block not orphaned, page numbers. The app's PDF was 5 pages where Word laid the DOCX out in 4, which is expected to differ. To render it, use `pdfjs-dist/legacy/build` in a page, because the standard build needs a newer Chromium than Playwright 1.56 ships.
2. Look at the workspace at 1440 px and 390 px. The phone header was changed after the last screenshots.
3. Run `axe` over login, dashboard and the contract page if it is cheap. Fix serious issues.
4. Confirm `docker build` works in `contract-studio/` if Docker Desktop is running. If its engine is down, the known fix on this machine is to rename `%LOCALAPPDATA%\Docker\run`. Never factory-reset it. If Docker stays down, the first Railway build will be the test; say so.

## 7. Deployment fixes before provisioning (WP4)

**The role step in `06-railway-deployment.md` is wrong.** `railway run` on a laptop gets the private database URL, which is unreachable from there, and there is deliberately no public proxy.

Fix: in `src/migrate.ts`, after migrations and seeding, call `createAppRole(db, process.env.APP_DB_PASSWORD)` when that variable is set. Pre-deploy runs inside Railway's private network, so this works on first deploy and is repeatable. Rewrite step 3 of doc 06. Add a test if cheap.

Target variables on the `contract-studio` service:

| Variable | Value |
| --- | --- |
| `MIGRATION_DATABASE_URL` | Owner, `${{Postgres.DATABASE_URL}}` |
| `APP_DB_PASSWORD` | Random, 32 bytes |
| `DATABASE_URL` | `postgresql://studio_app:<password>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` |

Check these against current Railway CLI help before writing them into the doc (`railway up --help`, `railway volume --help`, `railway add --help`). In particular:

- How to upload only a subfolder. Expect `railway up contract-studio --path-as-root --service contract-studio --detach` from the worktree root. If the CLI resolves differently, `railway.json` in the repo root (the portfolio's) must not be the one picked up.
- Whether `preDeployCommand` as an array is still accepted.

## 8. Decision on the public repository (WP5, GATE)

Ask the owner. Pushing this branch publishes the workspace's code and path. Recommended:

1. Owner creates a **private** GitHub repository, for example `contract-studio`.
2. Copy `contract-studio/`, `docs/contract-studio/` (as `docs/`) and `scripts/windows/railway-tunnel/` into it, with a fresh git history. Adjust doc paths.
3. In the portfolio, keep only the `Caddyfile` change. Revert the `tsconfig.json` and `.dockerignore` lines, since the folder no longer lives there.
4. Add CI to the private repo: Node 24, `npm ci`, `npx tsc --noEmit`, `npm test`. `embedded-postgres` needs its postinstall on Linux, so allow it or use a Postgres service container.

The Caddy change reveals only the path `/workspace`. The owner should accept that knowingly.

## 9. Railway (WP6 to WP8, GATE)

**GATE: get explicit approval for cost.** Estimate: about $4 to $5 per month of Railway usage on the existing Pro plan, plus Claude usage capped at $25 per month by default.

**WP6, provision.** Follow `06-railway-deployment.md`. Project name `personal-contract-studio`. Services `Postgres` and `contract-studio`. EU region. Volume at `/data`. No TCP proxy on Postgres. Pass explicit project and service flags instead of `railway link` in this repository. Enable daily, weekly and monthly backups on both volumes. If the CLI cannot do this, give the owner the exact dashboard steps.

Generate `PROXY_SHARED_SECRET`, `SETUP_TOKEN` and `APP_DB_PASSWORD` without displaying them. Set `APP_ORIGIN=https://nikolay-georgiev.dev`, `RP_ID=nikolay-georgiev.dev`, `NODE_ENV=production`.

Owner sets `ANTHROPIC_API_KEY`. Never report a deployment as successful until `railway deployment list --json` shows `SUCCESS` for that deployment.

**WP7, connect the portfolio. GATE: this changes the live site.** Set `STUDIO_UPSTREAM` and `STUDIO_PROXY_SECRET` on service `Nikolay-Georgiev`, then ship the `Caddyfile` through the portfolio's normal route. Read the review on any PR before merging. CI must pass. Do not enable auto-merge.

**WP8, owner enrols and verify.** The owner opens `/workspace/contracts/setup` and creates the passkey. Agents must not perform this step. Then delete `SETUP_TOKEN`.

Verify and record evidence:

- [ ] Railway domain `/workspace/contracts` returns 404.
- [ ] Real domain redirects to login with no session.
- [ ] `/workspaces` and all public pages still behave as before.
- [ ] Response headers carry the app's CSP, not Caddy's.
- [ ] A short real Claude message streams through Caddy, and Stop works. This is the first real API test. Confirm `adaptive` thinking and the tools are accepted.
- [ ] A proposal appears and applies. Estimated cost appears in Settings.
- [ ] Export PDF and DOCX with fictional data, then delete that data.
- [ ] `railway logs` shows no secrets.
- [ ] Postgres has no public proxy.
- [ ] A backup exists on each volume.

## 10. DataGrip tunnel (WP9, needs the Windows session)

After the project exists, from an interactive shell in `scripts/windows/railway-tunnel/`:

```powershell
.\Install-ContractStudioTunnelTask.ps1 -ProjectId <project-id> -Port 15433
```

Then start the task and run `.\Test-ContractStudioTunnel.ps1`. Registering a logon trigger may need an elevated shell.

Configure DataGrip following doc 07 with host `127.0.0.1` and port `15433`. Check that doc says 15433 throughout. The owner enters the password in DataGrip.

Verify: bound to loopback only, `select 1` works, no duplicate process on re-run, stop is clean, the task survives a log-off and log-on. Do not report Windows integration as working until it has run for real.

## 11. Finish (WP10)

- Update `10-testing-and-release.md` with actual counts and `12-known-limitations.md` with what remains.
- Keep every doc true to the code.
- Delete this file once the work is done.

Final report to the owner, classifying each component as IMPLEMENTED AND VERIFIED, IMPLEMENTED BUT NOT LIVE-VERIFIED, BLOCKED, or NOT IMPLEMENTED. Cover: summary, architecture, git changes, Railway, Claude, DataGrip, test commands with counts, security, legal limits, required owner actions. Never claim a deployment, connection or test without evidence.

**Stays with the owner regardless:**

- Railway and repository decisions at each GATE.
- `ANTHROPIC_API_KEY` and passkey enrolment.
- Lawyer review of all 12 templates, including the open questions in doc 05.
- Checking the DXC employment contract for IP, exclusivity and outside-work terms.
- Whether an EGN field is needed.

**Later, only if asked:** in-app template editing, payment tracking, electronic signatures.
