param(
    [switch]$ForceInstall,
    [switch]$SkipBuild
)

. (Join-Path $PSScriptRoot "common.ps1")

$skillRoot = Get-AlphaGotchiSkillRoot
$runtimeRoot = Get-AlphaGotchiRuntimeRoot

$paths = Sync-AlphaGotchiTemplate -SkillRoot $skillRoot -RuntimeRoot $runtimeRoot
Ensure-AlphaGotchiBuild -AppDir $paths.AppDir -ForceInstall:$ForceInstall -SkipBuild:$SkipBuild

$okxInstalled = [bool](Get-Command okx -ErrorAction SilentlyContinue)

[pscustomobject]@{
    name         = "Alpha-Gotchi"
    runtimeRoot  = $runtimeRoot
    appDir       = $paths.AppDir
    okxInstalled = $okxInstalled
    note         = $(if ($okxInstalled) { "OKX CLI detected." } else { "OKX CLI missing. The dashboard will still start in onboarding mode." })
} | ConvertTo-Json -Depth 6
