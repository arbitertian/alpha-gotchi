. (Join-Path $PSScriptRoot "common.ps1")

$runtimeRoot = Get-AlphaGotchiRuntimeRoot
$status = Get-AlphaGotchiStatus -RuntimeRoot $runtimeRoot

$status | ConvertTo-Json -Depth 8
