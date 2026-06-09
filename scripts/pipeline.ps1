#!/usr/bin/env pwsh
<#
.SYNOPSIS
  DuckSAT automated deployment pipeline.
  localhost → staging (dev.ducksat.com) → prod (www.ducksat.com)

.DESCRIPTION
  1. Starts local dev server (or uses existing)
  2. Runs full Playwright test suite against localhost
  3. If ALL pass: pushes to staging branch → waits for deploy → tests dev.ducksat.com
  4. If ALL pass: prompts user before pushing to main (prod)
  5. If approved: pushes to main → waits for deploy → tests www.ducksat.com

.PARAMETER SkipLocalServer
  Skip starting a local server (use if one is already running on :3000)

.PARAMETER SkipProdConfirm
  Skip the manual confirmation before pushing to prod (use only in CI)

.PARAMETER OnlyStage
  Run localhost + staging tests, stop before prod

.EXAMPLE
  pwsh scripts/pipeline.ps1
  pwsh scripts/pipeline.ps1 -SkipLocalServer
  pwsh scripts/pipeline.ps1 -OnlyStage
#>
param(
  [switch]$SkipLocalServer,
  [switch]$SkipProdConfirm,
  [switch]$OnlyStage
)

$ErrorActionPreference = 'Stop'

# ─── Helpers ─────────────────────────────────────────────────────────────────

function Write-Step { param([string]$msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$msg) Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-Fail { param([string]$msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Warn { param([string]$msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Info { param([string]$msg) Write-Host "  $msg" -ForegroundColor Gray }

$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path $ScriptDir

function Run-Tests {
  param([string]$BaseUrl, [string]$Label)

  Write-Step "Running test suite against $Label ($BaseUrl)"
  $env:BASE_URL = $BaseUrl

  $result = & npx playwright test --reporter=list 2>&1
  $exitCode = $LASTEXITCODE

  $result | ForEach-Object { Write-Host "  $_" }

  if ($exitCode -ne 0) {
    Write-Fail "Tests FAILED against $Label"
    Write-Host ""
    Write-Host "  Run 'npx playwright show-report tests/report' for details." -ForegroundColor Yellow
    return $false
  }

  Write-OK "All tests PASSED against $Label"
  return $true
}

function Wait-ForDeploy {
  param([string]$Workflow, [string]$Label, [int]$TimeoutSeconds = 300)

  Write-Info "Waiting for $Label GitHub Actions deploy to complete..."

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastRunId = $null
  Start-Sleep -Seconds 15

  while ((Get-Date) -lt $deadline) {
    $runs = gh run list --workflow=$Workflow --limit=1 --json "databaseId,status,conclusion,headBranch" 2>/dev/null | ConvertFrom-Json
    if ($runs -and $runs.Count -gt 0) {
      $run = $runs[0]
      if ($lastRunId -ne $run.databaseId) {
        $lastRunId = $run.databaseId
        Write-Info "  Run $($run.databaseId): $($run.status)"
      }
      if ($run.status -eq 'completed') {
        if ($run.conclusion -eq 'success') {
          Write-OK "$Label deploy succeeded (run $($run.databaseId))"
          Start-Sleep -Seconds 20  # Give Azure a moment to restart
          return $true
        } else {
          Write-Fail "$Label deploy FAILED (conclusion: $($run.conclusion))"
          Write-Info "  See: gh run view $($run.databaseId)"
          return $false
        }
      }
    }
    Start-Sleep -Seconds 15
  }

  Write-Fail "Timed out waiting for $Label deploy after ${TimeoutSeconds}s"
  return $false
}

# ─── HEADER ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          DuckSAT Automated Deployment Pipeline               ║" -ForegroundColor Cyan
Write-Host "║   localhost  →  dev.ducksat.com  →  www.ducksat.com         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location $RepoRoot

# ─── PHASE 1: LOCALHOST ──────────────────────────────────────────────────────

Write-Step "PHASE 1 — localhost"

$localProc = $null

if (-not $SkipLocalServer) {
  Write-Info "Building production bundle..."
  $buildResult = npm run build 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build failed — fix errors before deploying"
    $buildResult | Select-Object -Last 30 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
  }
  Write-OK "Build succeeded"

  Write-Info "Starting local server on :3000..."
  $localProc = Start-Process -FilePath "npm" -ArgumentList "run","start" -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 8

  # Health check
  $attempts = 0
  while ($attempts -lt 10) {
    try {
      $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      if ($resp.StatusCode -eq 200) {
        Write-OK "Local server is healthy"
        break
      }
    } catch { }
    $attempts++
    Start-Sleep -Seconds 3
    Write-Info "  Waiting for server... ($attempts/10)"
  }

  if ($attempts -ge 10) {
    Write-Fail "Local server did not start in time"
    if ($localProc) { $localProc | Stop-Process -Force -ErrorAction SilentlyContinue }
    exit 1
  }
} else {
  Write-Info "Skipping local server start (-SkipLocalServer flag set)"
  Write-Info "Assuming server is already running on http://localhost:3000"
}

$localPassed = Run-Tests -BaseUrl "http://localhost:3000" -Label "localhost"

if ($localProc) {
  Write-Info "Stopping local server..."
  $localProc | Stop-Process -Force -ErrorAction SilentlyContinue
  # Also kill any node processes on port 3000
  $portProc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
               Select-Object -ExpandProperty OwningProcess |
               Select-Object -Unique
  if ($portProc) {
    $portProc | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  }
}

if (-not $localPassed) {
  Write-Fail "Localhost tests failed — aborting pipeline. Fix all issues before deploying."
  exit 1
}

Write-OK "PHASE 1 complete — localhost tests all passed"

# ─── PHASE 2: STAGING ────────────────────────────────────────────────────────

Write-Step "PHASE 2 — staging (dev.ducksat.com)"
Write-Info "Pushing current main branch state to staging..."

# Merge main into staging
$currentBranch = git branch --show-current
if ($currentBranch -ne 'main') {
  Write-Warn "You are on branch '$currentBranch', not main. Switching to main..."
  git checkout main
}

# Push main → staging by merging
git checkout staging
git merge main --no-edit
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Merge main→staging failed. Resolve conflicts and retry."
  git checkout main
  exit 1
}

git push origin staging
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Push to staging failed"
  git checkout main
  exit 1
}

Write-OK "Pushed to staging branch — triggering GitHub Actions deploy"
git checkout main

$stagingDeployed = Wait-ForDeploy -Workflow "staging_ducksatapp-staging.yml" -Label "staging" -TimeoutSeconds 360

if (-not $stagingDeployed) {
  Write-Fail "Staging deploy failed — aborting pipeline"
  exit 1
}

$stagingPassed = Run-Tests -BaseUrl "https://dev.ducksat.com" -Label "dev.ducksat.com (staging)"

if (-not $stagingPassed) {
  Write-Fail "Staging tests failed — aborting before prod deploy"
  Write-Warn "Staging issues must be fixed before promoting to production"
  exit 1
}

Write-OK "PHASE 2 complete — staging tests all passed"

if ($OnlyStage) {
  Write-OK "Pipeline complete (stopped at staging — -OnlyStage flag set)"
  exit 0
}

# ─── PHASE 3: PROD ───────────────────────────────────────────────────────────

Write-Step "PHASE 3 — production (www.ducksat.com)"

if (-not $SkipProdConfirm) {
  Write-Host ""
  Write-Host "  ⚠️  All localhost and staging tests passed." -ForegroundColor Yellow
  Write-Host "  ⚠️  You are about to push to PRODUCTION (www.ducksat.com)." -ForegroundColor Yellow
  Write-Host ""
  $confirm = Read-Host "  Type 'yes' to deploy to production, anything else to abort"
  if ($confirm -ne 'yes') {
    Write-Warn "Prod deploy aborted by user"
    exit 0
  }
}

git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Push to main (prod) failed"
  exit 1
}

Write-OK "Pushed to main — triggering production GitHub Actions deploy"

$prodDeployed = Wait-ForDeploy -Workflow "main_ducksatapp.yml" -Label "production" -TimeoutSeconds 360

if (-not $prodDeployed) {
  Write-Fail "Production deploy failed"
  exit 1
}

$prodPassed = Run-Tests -BaseUrl "https://www.ducksat.com" -Label "www.ducksat.com (prod)"

# ─── FINAL REPORT ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                   Pipeline Summary                          ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  localhost       $($localPassed   ? '[PASS]' : '[FAIL]')                                      ║" -ForegroundColor $(if ($localPassed) { 'Green' } else { 'Red' })
Write-Host "║  staging         $($stagingPassed ? '[PASS]' : '[FAIL]')                                      ║" -ForegroundColor $(if ($stagingPassed) { 'Green' } else { 'Red' })
Write-Host "║  production      $($prodPassed    ? '[PASS]' : '[FAIL]')                                      ║" -ForegroundColor $(if ($prodPassed) { 'Green' } else { 'Red' })
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $prodPassed) {
  Write-Fail "Production tests failed — investigate immediately!"
  Write-Host "  Run: npx playwright show-report tests/report" -ForegroundColor Yellow
  exit 1
}

Write-OK "FULL PIPELINE COMPLETE — all environments green"
