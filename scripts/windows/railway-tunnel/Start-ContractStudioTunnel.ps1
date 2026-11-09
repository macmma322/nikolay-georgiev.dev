#Requires -Version 5.1
<#
.SYNOPSIS
    Keeps `railway connect --tunnel-only` alive on 127.0.0.1 for DataGrip.

.DESCRIPTION
    Supervisor started hidden at logon by the "Contract Studio DB tunnel" task.
    Settings come from %LOCALAPPDATA%\ContractStudio\tunnel.json. No secrets
    live there, and no CLI output is ever written to disk: the CLI prints
    connection details, so its lines only ever select a fixed label.

    Exit codes: 0 for every deliberate end (stopped, auth_expired, unsafe_bind,
    config_error, second instance), because the task's RestartCount must not
    re-run a state that retrying cannot fix. 1 only for an unexpected crash.
#>
[CmdletBinding()]
param(
    # Test hook: path to a fake CLI (.ps1, .cmd or .exe).
    [Parameter(DontShow = $true)][string]$RailwayCommand,
    # Test hook: use this directory instead of %LOCALAPPDATA%\ContractStudio.
    [Parameter(DontShow = $true)][string]$StateDirectory
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$BackoffMinSeconds = 2
$BackoffMaxSeconds = 120
$StableAfterSeconds = 300   # a connection this old resets the backoff
$ListenTimeoutSeconds = 90  # spawn to listening, covers API calls and the ssh handshake
$ProbeIntervalSeconds = 15
$ProbeFailureLimit = 2
$ClockJumpSeconds = 30      # the tick is 500 ms, so a gap this size means sleep or suspend
$WhoamiTimeoutSeconds = 45
$LogMaxBytes = 1MB
$LogKeep = 3

$stateDir = if ($StateDirectory) { $StateDirectory } else { Join-Path $env:LOCALAPPDATA 'ContractStudio' }
[void][IO.Directory]::CreateDirectory($stateDir)
$configPath = Join-Path $stateDir 'tunnel.json'
$statusPath = Join-Path $stateDir 'tunnel-status.json'
$logPath = Join-Path $stateDir 'tunnel.log'
$stopPath = Join-Path $stateDir 'tunnel.stop'
$authNotePath = Join-Path $stateDir 'auth-notified'
$utf8 = New-Object Text.UTF8Encoding $false

$CredentialPattern = '(?i)postgres(ql)?://|password|pgpass'
$AuthFailurePattern = '(?i)railway login|not logged in|not authenticated|unauthorized|rejected the CLI'
$CliSignals = @(
    @{ Pattern = $AuthFailurePattern; Label = 'CLI reported an authentication problem' }
    @{ Pattern = '(?i)address already in use|cannot listen|bind.*(fail|denied)'; Label = 'CLI reported a local port bind failure' }
    @{ Pattern = '(?i)not found|does not exist|no such'; Label = 'CLI reported project, environment or service not found' }
    @{ Pattern = '(?i)timed? ?out|connection (refused|reset|closed|lost)|network|dns|could not resolve'; Label = 'CLI reported a network problem' }
)

function Protect-Text([string]$Text) {
    $Text = $Text -replace '(?i)postgres(ql)?://\S*', '[masked-url]'
    $Text = $Text -replace '(?i)\w*pass(word|wd)\w*\s*[:=]\s*\S+', '[masked-secret]'
    return $Text -replace '(?i)\w*password\w*', '[masked]'
}

function Write-Log([string]$Message) {
    try {
        if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -ge $LogMaxBytes) {
            Remove-Item -LiteralPath "$logPath.$LogKeep" -Force -ErrorAction SilentlyContinue
            for ($i = $LogKeep - 1; $i -ge 1; $i--) {
                if (Test-Path -LiteralPath "$logPath.$i") { Move-Item -LiteralPath "$logPath.$i" "$logPath.$($i + 1)" -Force }
            }
            Move-Item -LiteralPath $logPath "$logPath.1" -Force
        }
        $stamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss.fffzzz')
        [IO.File]::AppendAllText($logPath, "$stamp  $(Protect-Text $Message)`r`n", $utf8)
    }
    catch { }  # losing a log line must never take the tunnel down
}

function Get-ProcessStamp([int]$Id) {
    try { return (Get-Process -Id $Id -ErrorAction Stop).StartTime.ToFileTimeUtc().ToString() }
    catch { return $null }
}

$status = [ordered]@{
    state = $null; pid = $null; port = $null; since = $null; lastError = $null; restarts = 0
    supervisorPid = $PID; supervisorStart = (Get-ProcessStamp $PID)
    pidStart = $null; listenerPid = $null; listenerStart = $null; updated = $null
}

function Set-Status([string]$State, [hashtable]$Fields = @{}) {
    $now = (Get-Date).ToUniversalTime().ToString('o')
    if ($State -ne $status.state) { $status.since = $now }
    $status.state = $State
    $status.updated = $now
    foreach ($key in $Fields.Keys) {
        $value = $Fields[$key]
        if ($value -is [string]) { $value = Protect-Text $value }
        $status[$key] = $value
    }
    try {
        $tmp = "$statusPath.$PID.tmp"
        [IO.File]::WriteAllText($tmp, ($status | ConvertTo-Json), $utf8)
        Move-Item -LiteralPath $tmp $statusPath -Force
    }
    catch { Write-Log "could not write status file: $($_.Exception.Message)" }
}

function Read-OldStatus {
    try { return Get-Content -LiteralPath $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { return $null }
}

# Parent links outlive their processes and PIDs get reused, so a child must also
# be younger than its parent to count. With a recorded start stamp the walk still
# finds the children of a root that already died (railway.exe gone, ssh left over)
# and refuses a PID that now belongs to something else. The Zone tunnel runs the
# same binaries; nothing here ever selects a process by name.
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

function Stop-ProcessTree([int]$Root, [string]$Stamp) {
    foreach ($id in @(Get-ProcessTree $Root $Stamp)) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
}

function Stop-Tunnel($Process) {
    try {
        if ($Process) { Stop-ProcessTree $Process.Id $status.pidStart }
        # railway.exe can die first and leave its ssh child holding the port.
        if ($status.listenerPid) { Stop-ProcessTree $status.listenerPid $status.listenerStart }
    }
    catch { Write-Log "tree kill failed: $($_.Exception.Message)" }
    Set-Status $status.state @{ pid = $null; pidStart = $null; listenerPid = $null; listenerStart = $null }
}

function ConvertTo-ProcessArgument([string]$Value) {
    return '"' + (($Value -replace '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
}

function New-RailwayProcess([string[]]$CliArguments) {
    $path = $RailwayCommand
    if (-not $path) {
        # Straight to the binary: one layer fewer than the npm shim. CreateProcess
        # runs the .cmd fallback directly if the npm package layout ever changes.
        $path = Join-Path $env:APPDATA 'npm\node_modules\@railway\cli\bin\railway.exe'
        if (-not (Test-Path -LiteralPath $path)) { $path = Join-Path $env:APPDATA 'npm\railway.cmd' }
    }
    $prefix = @()
    if ($path -match '\.ps1$') {
        $prefix = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $path)
        $path = Join-Path $PSHOME 'powershell.exe'
    }
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $path
    $info.Arguments = (@($prefix + $CliArguments) | ForEach-Object { ConvertTo-ProcessArgument $_ }) -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.RedirectStandardInput = $true  # held open and unused, so the CLI never sees EOF
    return [Diagnostics.Process]::Start($info)
}

function Read-Config {
    $raw = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $raw.projectId) { throw 'projectId is empty' }
    $port = [int]$raw.port
    if ($port -lt 1 -or $port -gt 65535) { throw "port $port is out of range" }
    return @{ ProjectId = [string]$raw.projectId; Environment = [string]$raw.environment; Service = [string]$raw.service; Port = $port }
}

function Test-StopRequested { return (Test-Path -LiteralPath $stopPath) }

# Connect probes decide, not the TCP table: Windows sessions exist where a working
# listener never shows up in netstat or Get-NetTCPConnection. 127.0.0.2 reaches a
# wildcard bind but not a 127.0.0.1 bind and needs no network; ::1 and the LAN
# addresses cover the rest.
function Get-ExposedAddresses {
    $addresses = New-Object Collections.ArrayList
    [void]$addresses.AddRange(@('127.0.0.2', '::1'))
    foreach ($nic in [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
        if ($nic.OperationalStatus -ne 'Up') { continue }
        foreach ($unicast in $nic.GetIPProperties().UnicastAddresses) {
            if ($unicast.Address.AddressFamily -eq 'InterNetwork' -and -not [Net.IPAddress]::IsLoopback($unicast.Address)) {
                [void]$addresses.Add($unicast.Address.ToString())
            }
        }
    }
    return @($addresses | Sort-Object -Unique)
}

# ponytail: proves the local listener only. A dead upstream is caught by the CLI's
# own ssh options (ServerAliveInterval=30, ServerAliveCountMax=3), which end the
# process. Add a Postgres SSLRequest probe if a tunnel is ever seen hanging.
function Get-AcceptingAddress([string[]]$Addresses) {
    $attempts = @()
    foreach ($address in $Addresses) {
        try {
            $ip = [Net.IPAddress]::Parse($address)
            $client = New-Object Net.Sockets.TcpClient($ip.AddressFamily)
            $attempts += @{ Address = $address; Client = $client; Pending = $client.BeginConnect($ip, $config.Port, $null, $null) }
        }
        catch { }
    }
    # Parallel because a refused connect takes about a second on Windows.
    $deadline = [DateTime]::UtcNow.AddMilliseconds(2000)
    $accepting = @()
    foreach ($attempt in $attempts) {
        try {
            $left = [Math]::Max(0, [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds)
            if ($attempt.Pending.AsyncWaitHandle.WaitOne($left)) {
                $attempt.Client.EndConnect($attempt.Pending)
                $accepting += $attempt.Address
            }
        }
        catch { }
        finally { $attempt.Client.Close() }
    }
    return $accepting
}

function Get-BoundAddresses { return @(Get-AcceptingAddress (@('127.0.0.1') + @(Get-ExposedAddresses))) }

function Test-RailwayAuth {
    # Returns ok, expired or unknown. Offline at logon must land on unknown, or
    # a laptop waking without Wi-Fi would stop the tunnel until the next logon.
    $process = New-RailwayProcess @('whoami')
    try {
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $deadline = (Get-Date).AddSeconds($WhoamiTimeoutSeconds)
        while (-not $process.WaitForExit(250)) {
            if ((Test-StopRequested) -or (Get-Date) -gt $deadline) {
                Stop-ProcessTree $process.Id
                return 'unknown'
            }
        }
        if ($process.ExitCode -eq 0) { return 'ok' }
        [void]$stdout.Wait(2000)
        [void]$stderr.Wait(2000)
        $text = ''
        if ($stdout.IsCompleted) { $text += $stdout.Result }
        if ($stderr.IsCompleted) { $text += $stderr.Result }
        if ($text -match $AuthFailurePattern) { return 'expired' }
        return 'unknown'
    }
    finally { $process.Dispose() }
}

function Show-AuthNote {
    if (Test-Path -LiteralPath $authNotePath) { return }
    [IO.File]::WriteAllText($authNotePath, (Get-Date).ToString('o'), $utf8)
    if ($RailwayCommand) { return }  # tests must not pop UI on the desktop
    try {
        $manager = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
        $xml = $manager::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $lines = $xml.GetElementsByTagName('text')
        [void]$lines.Item(0).AppendChild($xml.CreateTextNode('Contract Studio DB tunnel stopped'))
        [void]$lines.Item(1).AppendChild($xml.CreateTextNode('Railway login expired. Run: railway login, then Start-ScheduledTask "Contract Studio DB tunnel".'))
        $toast = [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]::new($xml)
        $manager::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show($toast)
    }
    catch { Write-Log "toast failed: $($_.Exception.Message)" }
}

# Drains the CLI's pipes without keeping a single character of them.
function New-Drain($Process) {
    $script:cliLines = 0
    $script:cliSuppressed = 0
    $script:cliHint = $null
    return @(
        @{ Reader = $Process.StandardOutput; Task = $Process.StandardOutput.ReadLineAsync() }
        @{ Reader = $Process.StandardError; Task = $Process.StandardError.ReadLineAsync() }
    )
}

function Read-Drain($Drain) {
    foreach ($stream in $Drain) {
        while ($stream.Task -and $stream.Task.IsCompleted) {
            if ($stream.Task.IsFaulted -or $stream.Task.IsCanceled -or $null -eq $stream.Task.Result) { $stream.Task = $null; break }
            $line = $stream.Task.Result
            $script:cliLines++
            if ($line -match $CredentialPattern) {
                $script:cliSuppressed++
            }
            else {
                foreach ($signal in $CliSignals) {
                    if ($line -match $signal.Pattern) {
                        if ($script:cliHint -ne $signal.Label) { Write-Log $signal.Label }
                        $script:cliHint = $signal.Label
                        break
                    }
                }
            }
            $stream.Task = $stream.Reader.ReadLineAsync()
        }
    }
}

function Test-Listener([int]$RootPid, [string[]]$Bound) {
    # Returns ok, unsafe or foreign. Ownership matters: the Zone tunnel also
    # defaults to 15432 and starts at the same logon, so "something accepts on
    # the port" does not mean it is this tunnel. Rows with no live owner are
    # noise, and when the table has nothing usable the probes alone decide.
    $rows = @(Get-NetTCPConnection -State Listen -LocalPort $config.Port -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 4 -and (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue) })
    $tree = @(Get-ProcessTree $RootPid)
    $mine = @($rows | Where-Object { $tree -contains [int]$_.OwningProcess })
    if ($rows.Count -gt 0 -and $mine.Count -eq 0) { return 'foreign' }

    $bad = @($Bound | Where-Object { $_ -ne '127.0.0.1' }) +
        @($mine | Where-Object { $_.LocalAddress -ne '127.0.0.1' } | ForEach-Object { $_.LocalAddress })
    if ($bad.Count -gt 0) {
        $script:unsafeAddress = ($bad | Sort-Object -Unique) -join ', '
        return 'unsafe'
    }
    if ($mine.Count -gt 0) {
        $owner = [int]$mine[0].OwningProcess
        Set-Status $status.state @{ listenerPid = $owner; listenerStart = (Get-ProcessStamp $owner) }
    }
    else {
        Write-Log 'listener owner not visible in the TCP table; bind verified by connect probes only'
    }
    return 'ok'
}

function Watch-Tunnel($Process) {
    $drain = New-Drain $Process
    $spawned = [DateTime]::UtcNow
    $previous = $spawned
    $upSince = $null
    $nextProbe = $spawned
    $failures = 0
    $result = {
        param($Reason)
        $uptime = 0
        if ($upSince) { $uptime = ([DateTime]::UtcNow - $upSince).TotalSeconds }
        return @{ Reason = $Reason; Uptime = $uptime }
    }
    while ($true) {
        Start-Sleep -Milliseconds 500
        Read-Drain $drain
        $now = [DateTime]::UtcNow
        $gap = [Math]::Abs(($now - $previous).TotalSeconds)
        $previous = $now

        if (Test-StopRequested) { return (& $result 'stop') }
        if ($gap -gt $ClockJumpSeconds) {
            Write-Log ("clock jumped {0:N0}s (sleep or suspend), rebuilding the tunnel" -f $gap)
            return (& $result 'sleep')
        }
        if ($Process.HasExited) {
            Read-Drain $drain
            Write-Log "railway exited with code $($Process.ExitCode); discarded $script:cliLines output lines ($script:cliSuppressed held credentials)"
            return (& $result 'exited')
        }

        if (-not $upSince) {
            if ($now -lt $nextProbe) { continue }
            $nextProbe = $now.AddSeconds(1)
            $bound = @(Get-BoundAddresses)
            if ($bound.Count -gt 0) {
                $verdict = Test-Listener $Process.Id $bound
                if ($verdict -ne 'ok') { return (& $result $verdict) }
                $upSince = [DateTime]::UtcNow
                $nextProbe = $upSince.AddSeconds($ProbeIntervalSeconds)
                Set-Status 'running' @{ lastError = $null }
                Write-Log "tunnel up on 127.0.0.1:$($config.Port)"
            }
            elseif (($now - $spawned).TotalSeconds -gt $ListenTimeoutSeconds) {
                return (& $result 'no_listener')
            }
            continue
        }

        if ($now -ge $nextProbe) {
            $nextProbe = $now.AddSeconds($ProbeIntervalSeconds)
            $bound = @(Get-BoundAddresses)
            if (@($bound | Where-Object { $_ -ne '127.0.0.1' }).Count -gt 0) {
                if ((Test-Listener $Process.Id $bound) -eq 'unsafe') { return (& $result 'unsafe') }
            }
            if ($bound -contains '127.0.0.1') { $failures = 0 }
            else {
                $failures++
                if ($failures -ge $ProbeFailureLimit) {
                    Write-Log "port $($config.Port) stopped accepting connections"
                    return (& $result 'probe_failed')
                }
            }
        }
    }
}

function Get-BackoffSeconds([int]$Attempt) {
    $base = [Math]::Min($BackoffMaxSeconds, $BackoffMinSeconds * [Math]::Pow(2, [Math]::Min($Attempt - 1, 16)))
    $jittered = $base * (1 + ((Get-Random -Minimum -200 -Maximum 201) / 1000.0))
    return [Math]::Round([Math]::Max($BackoffMinSeconds, [Math]::Min($BackoffMaxSeconds, $jittered)), 1)
}

function Wait-Backoff([string]$State, [string]$Reason) {
    $script:attempt++
    $delay = Get-BackoffSeconds $script:attempt
    Write-Log "retry in ${delay}s (attempt $script:attempt): $Reason"
    Set-Status $State @{ lastError = $Reason }
    $deadline = [DateTime]::UtcNow.AddSeconds($delay)
    while ([DateTime]::UtcNow -lt $deadline -and -not (Test-StopRequested)) { Start-Sleep -Milliseconds 250 }
}

$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$sha = [Security.Cryptography.SHA256]::Create()
$dirHash = ([BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes($stateDir.ToLowerInvariant()))) -replace '-', '').Substring(0, 16)
$mutex = New-Object Threading.Mutex($false, "Global\ContractStudioTunnel-$sid-$dirHash")
$ownsMutex = $false
try { $ownsMutex = $mutex.WaitOne(0) }
catch [Threading.AbandonedMutexException] { $ownsMutex = $true }  # the previous supervisor crashed
if (-not $ownsMutex) {
    Write-Log "second instance (pid $PID) exiting: a supervisor is already running"
    exit 0
}

$exitCode = 0
$child = $null
$finalState = 'stopped'
$attempt = 0
$spawns = 0
$config = $null
try {
    Write-Log "supervisor started (pid $PID)"
    Remove-Item -LiteralPath $stopPath -Force -ErrorAction SilentlyContinue
    $old = Read-OldStatus  # before the first Set-Status overwrites it

    try { $config = Read-Config }
    catch {
        $finalState = 'config_error'
        Set-Status 'config_error' @{ lastError = "cannot read tunnel.json: $($_.Exception.Message)" }
        Write-Log "config error: $($_.Exception.Message)"
    }

    if ($config) {
        Set-Status 'starting' @{ port = $config.Port }

        # Holding the mutex proves no supervisor owns these: a crash left them behind.
        if ($old -and $old.pid -and $old.pidStart) { Stop-ProcessTree $old.pid $old.pidStart }
        if ($old -and $old.listenerPid -and $old.listenerStart) { Stop-ProcessTree $old.listenerPid $old.listenerStart }

        while (-not (Test-StopRequested)) {
            $auth = Test-RailwayAuth
            if ($auth -eq 'expired') {
                $finalState = 'auth_expired'
                Set-Status 'auth_expired' @{ lastError = 'Railway login expired: run railway login, then start the task again' }
                Write-Log 'railway auth expired; exiting without retry'
                Show-AuthNote
                break
            }
            if ($auth -eq 'unknown') {
                Wait-Backoff 'backoff' 'railway whoami failed or timed out (network?)'
                continue
            }
            Remove-Item -LiteralPath $authNotePath -Force -ErrorAction SilentlyContinue

            if (@(Get-BoundAddresses).Count -gt 0) {
                Wait-Backoff 'port_in_use' "port $($config.Port) is already bound by another process"
                continue
            }

            $spawns++
            Set-Status 'starting' @{ restarts = [Math]::Max(0, $spawns - 1) }
            $child = New-RailwayProcess @('connect', $config.Service, '-e', $config.Environment, '-p', $config.ProjectId, '--tunnel-only', '-P', [string]$config.Port)
            Set-Status 'starting' @{ pid = $child.Id; pidStart = (Get-ProcessStamp $child.Id) }
            Write-Log "started railway connect (service=$($config.Service) env=$($config.Environment) port=$($config.Port) pid=$($child.Id))"

            $outcome = Watch-Tunnel $child
            Stop-Tunnel $child
            $child.Dispose()
            $child = $null
            if ($outcome.Uptime -gt $StableAfterSeconds) { $attempt = 0 }

            if ($outcome.Reason -eq 'stop') { break }
            if ($outcome.Reason -eq 'unsafe') {
                $finalState = 'unsafe_bind'
                Set-Status 'unsafe_bind' @{ lastError = "tunnel listened on $script:unsafeAddress instead of 127.0.0.1 only; killed" }
                Write-Log "refused unsafe bind on $script:unsafeAddress; exiting without retry"
                break
            }
            if ($outcome.Reason -eq 'sleep') { continue }  # no penalty for closing the lid
            if ($outcome.Reason -eq 'foreign') {
                Wait-Backoff 'port_in_use' "port $($config.Port) was taken by another process before the tunnel bound it"
                continue
            }

            $reason = "tunnel ended ($($outcome.Reason))"
            if ($script:cliHint) { $reason = "$reason`: $script:cliHint" }
            Wait-Backoff 'backoff' $reason
        }
    }
}
catch {
    $exitCode = 1
    $finalState = 'error'
    Set-Status 'error' @{ lastError = $_.Exception.Message }
    Write-Log "supervisor crashed: $($_.Exception.Message)"
}
finally {
    if ($child) { Stop-Tunnel $child }
    Remove-Item -LiteralPath $stopPath -Force -ErrorAction SilentlyContinue
    if ($finalState -eq 'stopped') { Set-Status 'stopped' }
    Write-Log "supervisor exiting (state=$finalState)"
    try { $mutex.ReleaseMutex() } catch { }
    $mutex.Dispose()
}
exit $exitCode
