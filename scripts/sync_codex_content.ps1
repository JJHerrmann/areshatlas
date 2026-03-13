param(
  [string]$Source = "",
  [string]$Destination = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Source)) {
  $Source = $env:ARESH_CODEX_SOURCE
}

if ([string]::IsNullOrWhiteSpace($Source)) {
  $Source = "R:\RookVault\01_Active\Mindpalace\Authorship\roleplaying\worlds\aresh\codex-content"
}

if ([string]::IsNullOrWhiteSpace($Destination)) {
  $repoRoot = Split-Path -Parent $PSScriptRoot
  $Destination = Join-Path $repoRoot "content"
}

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
  throw "Source codex content folder not found: $Source"
}

if (-not (Test-Path -LiteralPath $Destination -PathType Container)) {
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

$sourceResolved = (Resolve-Path -LiteralPath $Source).Path
$destinationResolved = (Resolve-Path -LiteralPath $Destination).Path

Write-Host "[codex-sync] source: $sourceResolved"
Write-Host "[codex-sync] destination: $destinationResolved"

$sourceArg = "$sourceResolved\"
$destinationArg = "$destinationResolved\"

robocopy $sourceArg $destinationArg /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
$exitCode = $LASTEXITCODE

if ($exitCode -ge 8) {
  throw "robocopy failed with exit code $exitCode"
}

Write-Host "[codex-sync] completed with robocopy exit code $exitCode"

$repoRoot = Split-Path -Parent $PSScriptRoot
Write-Host "[codex-sync] generating derived sidebar json..."
node (Join-Path $repoRoot "scripts\generate_codex_derived.mjs")
