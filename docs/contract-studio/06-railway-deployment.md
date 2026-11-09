# 06. Railway deployment

Status of this runbook on 2026-11-09: **not yet executed**. The `personal-contract-studio` project does not exist. Commands were checked against Railway CLI 5.30.4 help, but this sequence has not been run end to end.

Do not touch other Railway projects. Run these from `contract-studio/`.

## 1. Project and database

```bash
railway init --name personal-contract-studio
```

```bash
railway add --database postgres --json
```

```bash
railway add --service contract-studio --json
```

Pick an EU region for both services, in the dashboard under Settings → Regions. Confirm the Postgres service has **no TCP proxy** under Settings → Networking.

## 2. Volume and backups

Attach a volume to `contract-studio`, mounted at `/data`:

```bash
railway volume add --service contract-studio --mount-path /data --json
```

Then, on **both** the `Postgres` and `contract-studio` volumes: in the Railway dashboard, open the volume or service → Backups → enable daily, weekly and monthly.

## 3. Application role and migrations

The application role `studio_app` is created and maintained automatically by `src/migrate.ts` during Railway's pre-deploy step whenever `APP_DB_PASSWORD` is set. Because pre-deploy runs inside Railway's private network using `MIGRATION_DATABASE_URL` (the owner connection), it works on the first deploy and is idempotent on every release. No separate manual CLI command against Postgres is needed.

## 4. Variables on `contract-studio`

See [08-environment-variables.md](08-environment-variables.md).

Key database variables:

| Variable                 | Value                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `MIGRATION_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (owner connection for pre-deploy)                                                 |
| `APP_DB_PASSWORD`        | 32 random alphanumeric bytes                                                                                   |
| `DATABASE_URL`           | `postgresql://studio_app:<APP_DB_PASSWORD>@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` |

Set `ANTHROPIC_API_KEY` yourself so it never passes through a chat or a file. Set `PROXY_SHARED_SECRET`, `APP_ORIGIN=https://nikolay-georgiev.dev`, `RP_ID=nikolay-georgiev.dev`, `NODE_ENV=production`.

## 5. Deploy

From `contract-studio/`:

```bash
railway up --service contract-studio --detach
```

Or from the worktree root:

```bash
railway up contract-studio --path-as-root --service contract-studio --detach
```

`railway.json` runs `node src/migrate.ts` before each release (applying migrations, seeding templates, and configuring `studio_app`) and health-checks `/healthz`. Confirm with `railway deployment list --json` that the deployment reached `SUCCESS`.

## 6. Connect the portfolio

Give `contract-studio` a Railway domain (Networking → Generate Domain). On the portfolio service `Nikolay-Georgiev`, set:

```
STUDIO_UPSTREAM=https://<generated>.up.railway.app
STUDIO_PROXY_SECRET=<same value as PROXY_SHARED_SECRET>
```

Then deploy the `Caddyfile` change the usual way. Until the two variables are set, `/workspace` returns 502 and the rest of the site is unaffected.

## 7. Enrol your passkey

Set `SETUP_TOKEN`, open `https://nikolay-georgiev.dev/workspace/contracts/setup`, create the passkey, then delete the variable.

## 8. Verify

- [ ] `https://<generated>.up.railway.app/workspace/contracts` returns 404 (no secret).
- [ ] `https://nikolay-georgiev.dev/workspace/contracts` redirects to login.
- [ ] Sign in, create a test client, export a PDF, delete the test data.
- [ ] A short chat message streams.
- [ ] `railway logs` shows no secrets.
- [ ] The Postgres service has no public proxy.
- [ ] A backup exists for each volume.
- [ ] The public site still serves normally.

## Recovering from a failed deployment

Pre-deploy or health-check failures leave the previous deployment running. Read `railway logs --service contract-studio --build --lines 200`. To go back: dashboard → Deployments → previous → Redeploy. Migrations are forward only; if one has already applied, the older code must tolerate it, or restore a backup ([09](09-backups-and-recovery.md)).

## Environments

Production only for now. For staging, create a Railway environment with its own database, `APP_ORIGIN` and `RP_ID`. Passkeys are bound to the domain and do not carry across.
