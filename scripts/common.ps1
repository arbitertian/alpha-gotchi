Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-AlphaGotchiSkillRoot {
    return (Split-Path -Parent $PSScriptRoot)
}

function Get-AlphaGotchiRuntimeRoot {
    if ($env:ALPHA_GOTCHI_HOME) {
        return $env:ALPHA_GOTCHI_HOME
    }

    $openClawHome = Join-Path $HOME ".openclaw"
    return (Join-Path $openClawHome "alpha-gotchi")
}

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-LanAddress {
    try {
        $candidate = Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object { -not $_.IPAddress.StartsWith("169.254.") -and $_.IPAddress -ne "127.0.0.1" } |
            Select-Object -First 1 -ExpandProperty IPAddress

        if ($candidate) {
            return $candidate
        }
    }
    catch {
    }

    return $null
}

function Get-AlphaGotchiPaths {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    $appDir = Join-Path $RuntimeRoot "app"
    $dataDir = Join-Path $RuntimeRoot "data"
    $logDir = Join-Path $RuntimeRoot "logs"

    return [pscustomobject]@{
        RuntimeRoot = $RuntimeRoot
        AppDir      = $appDir
        DataDir     = $dataDir
        LogDir      = $logDir
        PidFile     = Join-Path $RuntimeRoot "alpha-gotchi.pid"
        StatusFile  = Join-Path $RuntimeRoot "status.json"
        StdoutFile  = Join-Path $logDir "server.out.log"
        StderrFile  = Join-Path $logDir "server.err.log"
    }
}

function Sync-AlphaGotchiTemplate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SkillRoot,
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    $paths = Get-AlphaGotchiPaths -RuntimeRoot $RuntimeRoot
    Ensure-Directory -Path $RuntimeRoot
    Ensure-Directory -Path $paths.DataDir
    Ensure-Directory -Path $paths.LogDir
    Ensure-Directory -Path $paths.AppDir

    $templateDir = Join-Path $SkillRoot "assets\app"
    $templateChildren = Get-ChildItem -LiteralPath $templateDir -Force |
        Where-Object { $_.Name -notin @("node_modules", ".vite") }

    foreach ($child in $templateChildren) {
        Copy-Item -LiteralPath $child.FullName -Destination $paths.AppDir -Recurse -Force
    }

    return $paths
}

function Ensure-AlphaGotchiBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AppDir,
        [switch]$ForceInstall,
        [switch]$SkipBuild
    )

    $null = Get-Command node -ErrorAction Stop
    $null = Get-Command npm -ErrorAction Stop

    Push-Location $AppDir
    try {
        if ($ForceInstall -or -not (Test-Path -LiteralPath (Join-Path $AppDir "node_modules"))) {
            npm install
        }

        $distIndex = Join-Path $AppDir "dist\index.html"
        if (-not $SkipBuild -or -not (Test-Path -LiteralPath $distIndex)) {
            npm run build
        }
    }
    finally {
        Pop-Location
    }
}

function Get-AlphaGotchiStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    $paths = Get-AlphaGotchiPaths -RuntimeRoot $RuntimeRoot
    $status = [pscustomobject]@{
        name        = "Alpha-Gotchi"
        runtimeRoot = $RuntimeRoot
        appDir      = $paths.AppDir
        running     = $false
        pid         = $null
        host        = "0.0.0.0"
        port        = 43115
        localhost   = "http://localhost:43115"
        lan         = $null
    }

    if (Test-Path -LiteralPath $paths.StatusFile) {
        try {
            $saved = Get-Content -LiteralPath $paths.StatusFile -Raw | ConvertFrom-Json
            foreach ($property in $saved.PSObject.Properties.Name) {
                $status | Add-Member -NotePropertyName $property -NotePropertyValue $saved.$property -Force
            }
        }
        catch {
        }
    }

    if (Test-Path -LiteralPath $paths.PidFile) {
        $pidValue = Get-Content -LiteralPath $paths.PidFile -Raw
        if ($pidValue) {
            $status.pid = [int]$pidValue
            try {
                $process = Get-Process -Id $status.pid -ErrorAction Stop
                if ($process) {
                    $status.running = $true
                }
            }
            catch {
                $status.running = $false
            }
        }
    }

    if (-not $status.running -and $status.localhost) {
        try {
            $null = Invoke-WebRequest -UseBasicParsing "$($status.localhost)/api/health" -TimeoutSec 2
            $status.running = $true
        }
        catch {
        }
    }

    if (-not $status.lan) {
        $lanIp = Get-LanAddress
        if ($lanIp) {
            $status.lan = "http://${lanIp}:$($status.port)"
        }
    }

    return $status
}

function Save-AlphaGotchiStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot,
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Status
    )

    $paths = Get-AlphaGotchiPaths -RuntimeRoot $RuntimeRoot
    try {
        Ensure-Directory -Path $RuntimeRoot
        $Status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $paths.StatusFile
    }
    catch {
    }
}

function Start-AlphaGotchiServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot,
        [string]$BindHost = "0.0.0.0",
        [int]$Port = 43115,
        [switch]$Restart
    )

    $paths = Get-AlphaGotchiPaths -RuntimeRoot $RuntimeRoot
    $current = Get-AlphaGotchiStatus -RuntimeRoot $RuntimeRoot
    if ($current.running -and -not $Restart) {
        return $current
    }

    if ($current.running -and $Restart) {
        Stop-AlphaGotchiServer -RuntimeRoot $RuntimeRoot | Out-Null
    }

    Ensure-Directory -Path $paths.LogDir
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $process = Start-Process -FilePath $nodePath `
        -ArgumentList @("server/index.js", "--host", $BindHost, "--port", "$Port", "--runtime-home", $RuntimeRoot) `
        -WorkingDirectory $paths.AppDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $paths.StdoutFile `
        -RedirectStandardError $paths.StderrFile `
        -PassThru

    $lanIp = Get-LanAddress
    $status = [pscustomobject]@{
        name        = "Alpha-Gotchi"
        runtimeRoot = $RuntimeRoot
        appDir      = $paths.AppDir
        running     = $true
        pid         = $process.Id
        host        = $BindHost
        port        = $Port
        localhost   = "http://localhost:$Port"
        lan         = $(if ($lanIp) { "http://${lanIp}:$Port" } else { $null })
    }

    $process.Id | Set-Content -LiteralPath $paths.PidFile
    Save-AlphaGotchiStatus -RuntimeRoot $RuntimeRoot -Status $status

    return $status
}

function Stop-AlphaGotchiServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    $paths = Get-AlphaGotchiPaths -RuntimeRoot $RuntimeRoot
    $status = Get-AlphaGotchiStatus -RuntimeRoot $RuntimeRoot

    if ($status.pid) {
        try {
            Stop-Process -Id $status.pid -Force -ErrorAction Stop
        }
        catch {
        }
    }

    if (Test-Path -LiteralPath $paths.PidFile) {
        Remove-Item -LiteralPath $paths.PidFile -Force
    }

    $status.running = $false
    Save-AlphaGotchiStatus -RuntimeRoot $RuntimeRoot -Status $status
    return $status
}
