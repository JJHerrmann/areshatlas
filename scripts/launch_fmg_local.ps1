$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$fmgRoot = Join-Path $repoRoot "Fantasy-Map-Generator-master\Fantasy-Map-Generator-master"

if (-not (Test-Path $fmgRoot)) {
  throw "FMG root not found: $fmgRoot"
}

$packageJson = Join-Path $fmgRoot "package.json"
if (-not (Test-Path $packageJson)) {
  throw "FMG package.json not found: $packageJson"
}

$nodeModules = Join-Path $fmgRoot "node_modules"
if (-not (Test-Path $nodeModules)) {
  throw "FMG node_modules not found. Install dependencies in $fmgRoot first."
}

$launchCommand = @"
Set-Location '$fmgRoot'
npm run dev -- --host 127.0.0.1
"@

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", $launchCommand
) | Out-Null

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:5173/" | Out-Null

Write-Host "[fmg] launched from $fmgRoot"
Write-Host "[fmg] expected local URL: http://127.0.0.1:5173/"
