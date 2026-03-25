param(
    [string]$BindHost = "0.0.0.0",
    [int]$Port = 43115,
    [switch]$Restart,
    [switch]$ForceInstall,
    [switch]$SkipBuild
)

. (Join-Path $PSScriptRoot "common.ps1")

$skillRoot = Get-AlphaGotchiSkillRoot
$runtimeRoot = Get-AlphaGotchiRuntimeRoot

$paths = Sync-AlphaGotchiTemplate -SkillRoot $skillRoot -RuntimeRoot $runtimeRoot
Ensure-AlphaGotchiBuild -AppDir $paths.AppDir -ForceInstall:$ForceInstall -SkipBuild:$SkipBuild
$status = Start-AlphaGotchiServer -RuntimeRoot $runtimeRoot -BindHost $BindHost -Port $Port -Restart:$Restart

$status | ConvertTo-Json -Depth 8
