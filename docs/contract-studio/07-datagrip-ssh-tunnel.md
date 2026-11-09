# DataGrip access to the Contract Studio database

How to connect DataGrip 2026.2 (installed on this machine) to the production
Postgres on Railway through the local tunnel in
[`scripts/windows/railway-tunnel`](../../scripts/windows/railway-tunnel/README.md).

> **Not live-tested.** The Railway project `personal-contract-studio` does not
> exist yet, so nothing below has been run against it. Menu names follow
> JetBrains' documented layout and were not checked in the 2026.2 window.

## Before you start

1. Install the tunnel and confirm `Test-ContractStudioTunnel.ps1` exits 0.
2. Check the port. The Zone tunnel also uses `15432`, and both start at logon. If
   you installed with `-Port 15433`, use 15433 wherever this page says 15432.

## Get the real values

`--kv` prints raw values, including the password. The first command shows only
the two non-secret values. The second puts the password on the clipboard without
showing it.

```powershell
railway variable list --service Postgres -e production -p <PROJECT_ID> --kv |
  Select-String '^(PGDATABASE|PGUSER)='

railway variable list --service Postgres -e production -p <PROJECT_ID> --kv |
  Select-String '^PGPASSWORD=' |
  ForEach-Object { ($_.Line -split '=', 2)[1] } | Set-Clipboard
```

Clear the clipboard after pasting (`Set-Clipboard ' '`). If Windows clipboard
history is on, delete the entry there as well.

## Create the data source

**File > New > Data Source > PostgreSQL.** Download the driver if prompted.

| Field          | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Name           | `Contract Studio — Production`                            |
| Host           | `127.0.0.1` (not `localhost`, which can resolve to `::1`) |
| Port           | `15432`                                                   |
| Authentication | User & Password                                           |
| User           | value of `PGUSER`                                         |
| Password       | value of `PGPASSWORD`                                     |
| Save           | Forever                                                   |
| Database       | value of `PGDATABASE`                                     |

On the **SSH/SSL** tab:

| Setting        | Value                                            |
| -------------- | ------------------------------------------------ |
| Use SSH tunnel | **Off**                                          |
| Use SSL        | On, Mode `prefer` (`disable` is also acceptable) |

Click **Test Connection**, then **OK**. Mark the data source read-only if you
mostly browse: production is one mistyped `UPDATE` away.

### Why DataGrip's own SSH tunnel stays off

DataGrip's SSH option opens an SSH connection itself, to a host and key you give
it. Railway does not hand you such a host. The Railway CLI authenticates with
your Railway login and exposes the far end as a local port, so from DataGrip's
side the database is simply on `127.0.0.1`. Turning DataGrip's tunnel on as well
would make it try to SSH into your own machine, and the connection would fail.

### Why `disable` or `prefer` is acceptable

The connection has three hops:

1. **DataGrip to the local tunnel** stays on loopback and never reaches a network.
2. **The tunnel to Railway** crosses the internet inside SSH, which encrypts it.
3. **Railway's SSH endpoint to Postgres** is inside Railway's private network and
   is not covered by the SSH encryption.

So Postgres-level TLS would add nothing on the first two hops. `prefer` is the
better default because it uses TLS whenever the server offers it, which also
covers the third hop. Do not use `verify-ca` or `verify-full`: the name DataGrip
sees is `127.0.0.1`, which will not match a server certificate.

## Keep the password out of files

**Settings > Appearance & Behavior > System Settings > Passwords > In native
Keychain.** On Windows that is Windows Credential Manager. With Save set to
Forever, the password goes there and not into any project file.

**Do not share the `.idea/dataSources*` files.** `dataSources.xml` and
`dataSources.local.xml` hold host, port and user; the `dataSources/` folder caches
the schema. Keep the DataGrip project in DataGrip's own projects folder, not in
this repository: this repo's `.gitignore` has no `.idea` entry, so files created
here could be committed by accident.

## Rotating the password

Rotate after any exposure, such as a password pasted into a chat or a file. The
app's connection fails between steps 2 and 4, so pick a quiet moment.

1. Generate a new password in your password manager.
2. In DataGrip, run `ALTER ROLE "<PGUSER>" WITH PASSWORD '<new password>';`. Open
   sessions keep working. New logins need the new password.
3. In Railway, update the Postgres service's password variables (`PGPASSWORD`,
   `POSTGRES_PASSWORD`) to the same value. Check that `DATABASE_URL` still
   resolves to it.
4. Redeploy every service that references those variables, and confirm the app
   connects.
5. In DataGrip, open the data source, paste the new password, keep Save on
   Forever, and click **Test Connection**.
6. Clear the clipboard, and the terminal scrollback if the value was printed.

The tunnel needs no change: it uses your Railway login, not the database password.

## When it stops connecting

Run `Test-ContractStudioTunnel.ps1` first. Recovery for each state, including
expired Railway logins, is in the
[tunnel README](../../scripts/windows/railway-tunnel/README.md).

A "password authentication failed" error while the tunnel is healthy can mean
DataGrip reached the other database: check that port 15432 is not being held by
the Zone tunnel.
