# move-to-appdata.ps1

$ErrorActionPreference = "Stop"

$AppSubfolder = "vscode-pb"
$folders = @("auth", "examples", "views")

$sourceRoot = $PSScriptRoot
$destRoot   = Join-Path $env:APPDATA $AppSubfolder

$success = $true
$scriptPath = $MyInvocation.MyCommand.Path

function LogInfo([string]$msg) { Write-Host "[INFO] $msg" }
function LogWarn([string]$msg) { Write-Warning "[WARN] $msg" }
function LogErr ([string]$msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

try {
  New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
  LogInfo "Source root: $sourceRoot"
  LogInfo "Target root: $destRoot"

  foreach ($name in $folders) {
    $from = Join-Path $sourceRoot $name
    $to   = Join-Path $destRoot  $name

    if (!(Test-Path -LiteralPath $from)) {
      LogWarn "Folder not found, skipping: $from"
      continue
    }

    if (Test-Path -LiteralPath $to) {
      # Merge into existing destination
      New-Item -ItemType Directory -Force -Path $to | Out-Null
      Get-ChildItem -LiteralPath $from -Force | ForEach-Object {
        Move-Item -LiteralPath $_.FullName -Destination $to -Force
      }
      # Remove now-empty source folder (best effort)
      try { Remove-Item -LiteralPath $from -Recurse -Force } catch {}
      LogInfo "MOVED (merged): $from -> $to"
    } else {
      Move-Item -LiteralPath $from -Destination $to -Force
      LogInfo "MOVED: $from -> $to"
    }
  }

  LogInfo "Done. Target folder: $destRoot"
}
catch {
  $success = $false
  LogErr "Failed: $($_.Exception.Message)"
}

# Self-delete only if everything succeeded
if ($success) {
  LogInfo "Scheduling self-delete: $scriptPath"

  # Start cmd that waits a bit and deletes this .ps1
  $cmd = "cmd.exe"
  $args = "/c ping 127.0.0.1 -n 2 > nul & del /f /q `"$scriptPath`""

  Start-Process -FilePath $cmd -ArgumentList $args -WindowStyle Hidden
}
else {
  LogWarn "Self-delete skipped because of errors."
}