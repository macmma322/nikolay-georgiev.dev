#Requires -Version 5.1
<#
.SYNOPSIS
    Stops the tunnel and unregisters its task. Keeps tunnel.json unless -Purge.
#>
[CmdletBinding()]
param(
    [switch]$Purge,
    # Test hook: use this directory and leave the Task Scheduler alone.
    [Parameter(DontShow = $true)][string]$StateDirectory
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$taskName = 'Contract Studio DB tunnel'
$stateDir = if ($StateDirectory) { $StateDirectory } else { Join-Path $env:LOCALAPPDATA 'ContractStudio' }

$stopArguments = @{}
if ($StateDirectory) { $stopArguments.StateDirectory = $StateDirectory }
& (Join-Path $PSScriptRoot 'Stop-ContractStudioTunnel.ps1') @stopArguments | Out-Null

if (-not $StateDirectory) {
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Output "Unregistered '$taskName'."
    }
    else {
        Write-Output "Task '$taskName' was not registered."
    }
}

if ($Purge) {
    # Named files only: the folder may hold other Contract Studio data one day.
    foreach ($name in 'tunnel.json', 'tunnel-status.json', 'tunnel.stop', 'auth-notified', 'tunnel.log', 'tunnel.log.1', 'tunnel.log.2', 'tunnel.log.3') {
        Remove-Item -LiteralPath (Join-Path $stateDir $name) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath (Join-Path $stateDir 'bin') -Recurse -Force -ErrorAction SilentlyContinue
    if ((Test-Path -LiteralPath $stateDir) -and -not (Get-ChildItem -LiteralPath $stateDir -Force)) {
        Remove-Item -LiteralPath $stateDir -Force
    }
    Write-Output 'Config, status and logs removed.'
}
else {
    Write-Output "Config kept at $(Join-Path $stateDir 'tunnel.json'). Use -Purge to remove it."
}
