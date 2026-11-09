#Requires -Version 5.1
<#
.SYNOPSIS
    Writes the tunnel config and registers the "Contract Studio DB tunnel" task
    for the current user. Safe to re-run: it replaces its own task only.

.EXAMPLE
    .\Install-ContractStudioTunnelTask.ps1 -ProjectId 00000000-0000-0000-0000-000000000000 -Port 15433
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')]
    [string]$ProjectId,
    [ValidateNotNullOrEmpty()][string]$Environment = 'production',
    [ValidateNotNullOrEmpty()][string]$Service = 'Postgres',
    [ValidateRange(1024, 65535)][int]$Port = 15432,
    # Test hook: write here, register nothing, and return the task definition.
    [Parameter(DontShow = $true)][string]$StateDirectory
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$taskName = 'Contract Studio DB tunnel'
$stateDir = if ($StateDirectory) { $StateDirectory } else { Join-Path $env:LOCALAPPDATA 'ContractStudio' }
$binDir = Join-Path $stateDir 'bin'
$supervisor = Join-Path $binDir 'Start-ContractStudioTunnel.ps1'
[void][IO.Directory]::CreateDirectory($binDir)

$config = [ordered]@{ projectId = $ProjectId; environment = $Environment; service = $Service; port = $Port }
[IO.File]::WriteAllText((Join-Path $stateDir 'tunnel.json'), ($config | ConvertTo-Json), (New-Object Text.UTF8Encoding $false))

# The task runs a copy outside the repo: a worktree can be cleaned up or moved,
# and a task pointing into one would then fail silently at the next logon.
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Start-ContractStudioTunnel.ps1') -Destination $supervisor -Force

$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$supervisor`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
# RunOnlyIfNetworkAvailable is left off on purpose: the supervisor handles the network.
$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
    -Description 'Keeps the Railway SSH tunnel for the Contract Studio database open on 127.0.0.1 for DataGrip.'

if ($StateDirectory) {
    Write-Output $task
    exit 0
}

# A supervisor from an older install would keep running its old config.
& (Join-Path $PSScriptRoot 'Stop-ContractStudioTunnel.ps1') | Out-Null

# A connect probe, not the TCP table: the table can miss live listeners.
$probe = New-Object Net.Sockets.TcpClient
try {
    $pending = $probe.BeginConnect('127.0.0.1', $Port, $null, $null)
    if ($pending.AsyncWaitHandle.WaitOne(2000)) {
        $probe.EndConnect($pending)
        Write-Warning "Port $Port is already in use on 127.0.0.1. The tunnel will wait in state port_in_use until it is free. See 'Port clash with the Zone tunnel' in README.md."
    }
}
catch { }  # refused: the port is free
finally { $probe.Close() }

[void](Register-ScheduledTask -TaskName $taskName -InputObject $task -Force)
Start-ScheduledTask -TaskName $taskName
Write-Output "Registered and started '$taskName' on 127.0.0.1:$Port. Check it with .\Test-ContractStudioTunnel.ps1"
