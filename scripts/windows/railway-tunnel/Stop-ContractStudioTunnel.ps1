#Requires -Version 5.1
<#
.SYNOPSIS
    Stops the Contract Studio tunnel: asks the supervisor, then kills only the
    process trees it recorded. Never matches railway, node or ssh by name, since
    the Zone tunnel runs the same binaries.
#>
[CmdletBinding()]
param(
    [int]$TimeoutSeconds = 20,
    # Test hook: use this directory instead of %LOCALAPPDATA%\ContractStudio.
    [Parameter(DontShow = $true)][string]$StateDirectory
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$stateDir = if ($StateDirectory) { $StateDirectory } else { Join-Path $env:LOCALAPPDATA 'ContractStudio' }
$statusPath = Join-Path $stateDir 'tunnel-status.json'
$stopPath = Join-Path $stateDir 'tunnel.stop'

function Get-ProcessStamp([int]$Id) {
    try { return (Get-Process -Id $Id -ErrorAction Stop).StartTime.ToFileTimeUtc().ToString() }
    catch { return $null }
}

# Same walk as the supervisor; duplicated so the installed supervisor stays one file.
function Get-ProcessTree([int]$Root, [string]$Stamp) {
    $alive = Get-ProcessStamp $Root
    if ($alive -and $Stamp -and $alive -ne $Stamp) { return @() }
    $all = @(Get-CimInstance -ClassName Win32_Process -Property ProcessId, ParentProcessId, CreationDate)
    $found = New-Object 'Collections.Generic.List[int]'
    $queue = New-Object Collections.Queue
    foreach ($row in $all) { if ($row.ProcessId -eq $Root) { $queue.Enqueue($row) } }
    if ($queue.Count -eq 0 -and $Stamp) {
        $queue.Enqueue([pscustomobject]@{ ProcessId = $Root; CreationDate = [DateTime]::FromFileTime([long]$Stamp) })
    }
    while ($queue.Count -gt 0) {
        $parent = $queue.Dequeue()
        if ($found.Contains([int]$parent.ProcessId)) { continue }
        $found.Add([int]$parent.ProcessId)
        foreach ($row in $all) {
            if ($row.ParentProcessId -eq $parent.ProcessId -and $row.CreationDate -ge $parent.CreationDate) { $queue.Enqueue($row) }
        }
    }
    return @($found.ToArray())
}

function Stop-ProcessTree($Id, $Stamp) {
    if (-not $Id -or -not $Stamp) { return }  # no stamp means the PID cannot be trusted
    foreach ($item in @(Get-ProcessTree ([int]$Id) ([string]$Stamp))) { Stop-Process -Id $item -Force -ErrorAction SilentlyContinue }
}

if (-not (Test-Path -LiteralPath $statusPath)) {
    Write-Output 'Tunnel is not running (no status file).'
    exit 0
}
$status = Get-Content -LiteralPath $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Test-SupervisorAlive {
    return ($status.supervisorPid -and $status.supervisorStart -and
        (Get-ProcessStamp ([int]$status.supervisorPid)) -eq $status.supervisorStart)
}

if (Test-SupervisorAlive) {
    [IO.File]::WriteAllText($stopPath, (Get-Date).ToString('o'))
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Test-SupervisorAlive) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
}

$forced = $false
if (Test-SupervisorAlive) {
    $forced = $true
    Stop-ProcessTree $status.supervisorPid $status.supervisorStart
}
# Also covers a supervisor that crashed and left its child behind.
foreach ($pair in @(@($status.pid, $status.pidStart), @($status.listenerPid, $status.listenerStart))) {
    if ($pair[0] -and $pair[1]) {
        if ((Get-ProcessStamp ([int]$pair[0])) -eq $pair[1] -or $forced) { Stop-ProcessTree $pair[0] $pair[1] }
    }
}
Remove-Item -LiteralPath $stopPath -Force -ErrorAction SilentlyContinue

if (Test-SupervisorAlive) {
    Write-Error 'Supervisor is still running after the forced stop.'
    exit 1
}
if ($forced) {
    $status.state = 'stopped'
    $status.lastError = 'force-stopped after the graceful stop timed out'
    $status.pid = $null
    $status.listenerPid = $null
    [IO.File]::WriteAllText($statusPath, ($status | ConvertTo-Json))
    Write-Output 'Tunnel force-stopped.'
}
else {
    Write-Output 'Tunnel stopped.'
}
exit 0
