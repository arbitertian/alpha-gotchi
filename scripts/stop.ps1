. (Join-Path $PSScriptRoot "common.ps1")

$runtimeRoot = Get-AlphaGotchiRuntimeRoot
$status = Stop-AlphaGotchiServer -RuntimeRoot $runtimeRoot

$status | ConvertTo-Json -Depth 8
