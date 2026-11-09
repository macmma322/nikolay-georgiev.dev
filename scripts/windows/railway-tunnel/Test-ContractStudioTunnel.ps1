#Requires -Version 5.1
<#
.SYNOPSIS
    Reports tunnel health. Exit code 0 when healthy, 1 otherwise. Never prints a
    password: psql runs only when PGPASSWORD is already set, and only "ok" or
    "failed" comes back from it.
#>
[CmdletBinding()]
param(
    # Test hook: use this directory instead of %LOCALAPPDATA%\ContractStudio.
    [Parameter(DontShow = $true)][string]$StateDirectory
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$taskName = 'Contract Studio DB tunnel'
$stateDir = if ($StateDirectory) { $StateDirectory } else { Join-Path $env:LOCALAPPDATA 'ContractStudio' }
$healthy = $true

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    Write-Output "Scheduled task:      $($task.State)"
}
else {
    Write-Output 'Scheduled task:      not registered'
    if (-not $StateDirectory) { $healthy = $false }
}

$port = 0
try {
    $config = Get-Content -LiteralPath (Join-Path $stateDir 'tunnel.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $port = [int]$config.port
    Write-Output "Config:              environment=$($config.environment) service=$($config.service) port=$port"
}
catch {
    Write-Output 'Config:              missing or unreadable (run Install-ContractStudioTunnelTask.ps1)'
    $healthy = $false
}

try {
    $status = Get-Content -LiteralPath (Join-Path $stateDir 'tunnel-status.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Output "Status state:        $($status.state) (since $($status.since))"
    Write-Output "Status pid/restarts: $($status.pid) / $($status.restarts)"
    if ($status.lastError) { Write-Output "Status lastError:    $($status.lastError)" }
    if ($status.state -ne 'running') { $healthy = $false }
}
catch {
    Write-Output 'Status:              no status file yet'
    $healthy = $false
}

if ($port -gt 0) {
    $client = New-Object Net.Sockets.TcpClient
    $accepts = $false
    try {
        $pending = $client.BeginConnect('127.0.0.1', $port, $null, $null)
        if ($pending.AsyncWaitHandle.WaitOne(2000)) { $client.EndConnect($pending); $accepts = $true }
    }
    catch { }
    finally { $client.Close() }
    Write-Output "127.0.0.1:$port accepts TCP: $accepts"
    if (-not $accepts) { $healthy = $false }

    # Probes as well as the table: the table can miss a live listener on some sessions.
    $candidates = @('127.0.0.2', '::1')
    foreach ($nic in [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
        if ($nic.OperationalStatus -ne 'Up') { continue }
        foreach ($unicast in $nic.GetIPProperties().UnicastAddresses) {
            if ($unicast.Address.AddressFamily -eq 'InterNetwork' -and -not [Net.IPAddress]::IsLoopback($unicast.Address)) {
                $candidates += $unicast.Address.ToString()
            }
        }
    }
    $exposed = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -ne '127.0.0.1' -and $_.OwningProcess -gt 4 } | ForEach-Object { $_.LocalAddress })
    foreach ($address in ($candidates | Sort-Object -Unique)) {
        $probe = $null
        try {
            $ip = [Net.IPAddress]::Parse($address)
            $probe = New-Object Net.Sockets.TcpClient($ip.AddressFamily)
            $pending = $probe.BeginConnect($ip, $port, $null, $null)
            if ($pending.AsyncWaitHandle.WaitOne(1500)) { $probe.EndConnect($pending); $exposed += $address }
        }
        catch { }
        finally { if ($probe) { $probe.Close() } }
    }
    if ($exposed.Count -gt 0) {
        Write-Output "Non-loopback listener: YES on $(($exposed | Sort-Object -Unique) -join ', ')"
        $healthy = $false
    }
    else {
        Write-Output 'Non-loopback listener: none'
    }

    if ((Get-Command psql -ErrorAction SilentlyContinue) -and $env:PGPASSWORD) {
        # psql reads PGPASSWORD, PGUSER and PGDATABASE from the environment itself.
        $env:PGCONNECT_TIMEOUT = '5'
        $previous = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        $answer = & psql -h 127.0.0.1 -p $port -w -tAc 'select 1' 2>$null
        $code = $LASTEXITCODE
        $ErrorActionPreference = $previous
        if ($code -eq 0 -and "$answer".Trim() -eq '1') {
            Write-Output 'select 1:            ok'
        }
        else {
            Write-Output 'select 1:            failed'
            $healthy = $false
        }
    }
    else {
        Write-Output 'select 1:            skipped (needs psql on PATH and PGPASSWORD set)'
    }
}

if ($healthy) {
    Write-Output 'Result: healthy'
    exit 0
}
Write-Output 'Result: UNHEALTHY'
exit 1
