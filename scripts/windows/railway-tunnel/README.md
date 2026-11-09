# Contract Studio Railway tunnel (Windows 11)

Keeps `railway connect --tunnel-only` open on `127.0.0.1` for DataGrip and
rebuilds it after a drop, sleep or network change. DataGrip settings are in
[`docs/contract-studio/07-datagrip-ssh-tunnel.md`](../../../docs/contract-studio/07-datagrip-ssh-tunnel.md).

> **Not live-tested.** The Railway project `personal-contract-studio` does not
> exist yet, so `railway connect` has never run under this supervisor and the
> scheduled task has never been registered. The supervisor logic was exercised
> against a fake CLI only.

## What "persistent" means

The tunnel exists only while your Windows session and network are up. It starts
at logon and stops at logoff or shutdown. The database and the app do not depend
on it: if it is down, only DataGrip on this machine loses its connection.

## Port clash with the Zone tunnel

The Zone tunnel uses `127.0.0.1:15432` too, and both tasks start at logon. Only
one can hold the port. The loser waits: this tunnel sits in state `port_in_use`
and retries, and the Zone watchdog exits. To run both, install with
`-Port 15433` and use 15433 in DataGrip.

## One-time install

Run in Windows PowerShell from the repo root, after the project exists:

```powershell
railway login
railway whoami

# The project id is the UUID in the dashboard URL: railway.com/project/<id>
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\railway-tunnel\Install-ContractStudioTunnelTask.ps1 -ProjectId <PROJECT_ID>

powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\railway-tunnel\Test-ContractStudioTunnel.ps1
```

Options: `-Environment production`, `-Service Postgres`, `-Port 15432`.

Install writes `%LOCALAPPDATA%\ContractStudio\tunnel.json` (no secrets), copies
the supervisor to `%LOCALAPPDATA%\ContractStudio\bin`, registers the task for
your user only, and starts it. The task runs that copy, so removing a worktree
cannot break it. Re-run Install to change a setting or pick up a new supervisor.

If registration fails with "Access is denied", run the Install command once from
an elevated PowerShell. The task still runs as your user at limited rights.

## Everyday commands

Run from `scripts\windows\railway-tunnel`:

| Goal             | Command                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Status           | `powershell.exe -NoProfile -File .\Test-ContractStudioTunnel.ps1` (exit 0 means healthy)                                 |
| Stop             | `powershell.exe -NoProfile -File .\Stop-ContractStudioTunnel.ps1`                                                        |
| Start or restart | Stop, then `Start-ScheduledTask -TaskName "Contract Studio DB tunnel"`                                                   |
| Log              | `Get-Content "$env:LOCALAPPDATA\ContractStudio\tunnel.log" -Tail 30`                                                     |
| Uninstall        | `powershell.exe -NoProfile -File .\Remove-ContractStudioTunnelTask.ps1` (add `-Purge` to delete the config and logs too) |

If script execution is blocked, add `-ExecutionPolicy Bypass` after `-NoProfile`.

Status lives in `%LOCALAPPDATA%\ContractStudio\tunnel-status.json`:

| State          | Meaning                                                | What to do                              |
| -------------- | ------------------------------------------------------ | --------------------------------------- |
| `running`      | Listening on 127.0.0.1 only                            | Nothing                                 |
| `starting`     | CLI launched, waiting for the port                     | Wait up to 90 s                         |
| `backoff`      | Dropped or offline, retrying in 2 to 120 s             | Nothing; see `lastError` if it persists |
| `port_in_use`  | Another process holds the port; retrying               | See the Zone section above              |
| `auth_expired` | Login expired; the supervisor has exited               | See below                               |
| `unsafe_bind`  | Listener was not 127.0.0.1-only; killed and exited     | Investigate before restarting           |
| `config_error` | `tunnel.json` missing or invalid; exited               | Re-run Install                          |
| `stopped`      | Stopped on request                                     | Start the task                          |
| `error`        | Supervisor crashed; the task restarts it up to 5 times | Read the log                            |

## Recovery after auth expiry

The supervisor stops rather than retrying, and shows one toast until you log in
again.

```powershell
railway login
railway whoami
Start-ScheduledTask -TaskName "Contract Studio DB tunnel"
```

## Diagnosing a tunnel that will not come up

The CLI's output can contain credentials, so none of it is stored. The log holds
exit codes and fixed labels such as "CLI reported a network problem". To see the
CLI's own words, stop the tunnel and run it by hand. **This prints connection
details to your terminal.**

```powershell
railway connect Postgres -e production -p <PROJECT_ID> --tunnel-only -P 15432
```

The log is capped at 1 MB with three rotated files (`tunnel.log.1` to `.3`).

## Limits

- Dead-tunnel detection covers the process exiting and the local port no longer
  accepting. A hung upstream is left to the CLI's ssh keepalives, which end the
  process after about 90 s.
- Some Windows sessions do not list live listeners in `netstat` or
  `Get-NetTCPConnection`. Connect probes therefore decide whether the port is
  bound and whether it is exposed. When the table has no usable row, the listener
  owner cannot be confirmed and the log says so.
