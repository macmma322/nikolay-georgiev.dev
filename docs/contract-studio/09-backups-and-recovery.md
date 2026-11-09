# 09. Backups and recovery

**Backup schedules are not yet configured**, because the Railway project does not exist. Step 2 of [06-railway-deployment.md](06-railway-deployment.md) sets them up.

From Railway's documentation, checked 2026-11-09: daily backups are kept 6 days, weekly 27 days, monthly 89 days. They are incremental and billed like volume storage. **Wiping a volume deletes its backups**, and a backup can only be restored within the same project and environment. So Railway's backups protect against mistakes, not against losing the Railway account.

## An independent copy

Take a dump to storage you control, monthly and before any risky change, through the tunnel and with PostgreSQL client tools:

```bash
pg_dump --host 127.0.0.1 --port 15433 --username postgres --format custom --file contract-studio.dump railway
```

The dump contains client personal data. Keep it encrypted, and delete old copies. Copy `/data/documents` too, or rely on re-exporting.

## Restoring from a Railway backup

1. Open the service → Backups, and choose one by date.
2. Click Restore, then review the staged change (Details at the top of the canvas).
3. Deploy. The restored volume is mounted in place; the previous one remains in the project, unmounted.

Restore Postgres and the document volume to the same moment where possible.

## Restoring from a dump

```bash
pg_restore --host 127.0.0.1 --port 15433 --username postgres --dbname railway --clean --if-exists contract-studio.dump
```

Stop the application first. Test this at least once before you need it; it has not been run against Railway.

## If generated files are lost

The approved content and its rendered HTML live in PostgreSQL. A missing file makes the download fail. Delete the matching `generated_documents` row and export again. PDFs are deterministic for the same renderer version and fonts; DOCX files are not byte-identical between runs, so their recorded checksum will change.

## Other failures

| Failure            | Response                                                                          |
| ------------------ | --------------------------------------------------------------------------------- |
| Bad release        | Redeploy the previous deployment.                                                 |
| Failed migration   | It rolled back and blocked the release. Fix it forward in a new file.             |
| Anthropic outage   | Chat reports it; everything else works.                                           |
| Compromised secret | [03-authentication-security.md](03-authentication-security.md)                    |
| Tunnel down        | Only DataGrip is affected. [07-datagrip-ssh-tunnel.md](07-datagrip-ssh-tunnel.md) |
