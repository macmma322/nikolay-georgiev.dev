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

Attach a volume to `contract-studio`, mounted at `/data`. Then, on **both** the `Postgres` and `contract-studio` volumes: service → Backups → enable daily, weekly and monthly.

## 3. Application role

Generate a password, then run with the owner connection:

```bash
railway run --service Postgres -- node src/create-app-role.ts
```

This needs `MIGRATION_DATABASE_URL` and `APP_DB_PASSWORD` in that shell. Run migrations first if tables do not exist yet: the grants apply to existing tables, and default privileges cover later ones.

## 4. Variables on `contract-studio`

See [08-environment-variables.md](08-environment-variables.md). Reference the database with Railway's private URL. Set `ANTHROPIC_API_KEY` yourself so it never passes through a chat or a file.

## 5. Deploy

```bash
railway up --service contract-studio --detach
```

`railway.json` runs `node src/migrate.ts` before each release and health-checks `/healthz`. Confirm with `railway deployment list --json` that the deployment reached `SUCCESS`.

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
