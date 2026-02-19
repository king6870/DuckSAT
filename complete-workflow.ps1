# Complete Approval and Import Workflow
# This script approves all valid batches and imports them to the database

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host " QG800 Batch Approval & Import Workflow" -ForegroundColor Cyan  
Write-Host "===========================================================" -ForegroundColor Cyan

# Step 1: Count valid batches
Write-Host "`n[STEP 1/3] Counting batches..." -ForegroundColor Yellow
$batches = Get-ChildItem generated-batches\*.json -Exclude generation-state.json
$validBatches = @()
$totalValid = 0

foreach ($file in $batches) {
    $batch = Get-Content $file.FullName | ConvertFrom-Json
    if ($batch.totalValid -gt 0) {
        $validBatches += $batch.batchId
        $totalValid += $batch.totalValid
    }
}

Write-Host "  Found: $($validBatches.Count) batches with $totalValid valid questions" -ForegroundColor Green

# Step 2: Approve all valid batches
Write-Host "`n[STEP 2/3] Approving batches..." -ForegroundColor Yellow
$approved = 0

foreach ($batchId in $validBatches) {
    try {
        npx tsx scripts/generate-sat-questions.ts approve --batch $batchId 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $approved++
            Write-Host "  ✓ Approved: $batchId" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ Error: $batchId - $_" -ForegroundColor Red
    }
}

Write-Host "`n  Approved: $approved / $($validBatches.Count) batches" -ForegroundColor Green

# Step 3: Import to database
Write-Host "`n[STEP 3/3] Importing to database..." -ForegroundColor Yellow
Write-Host "  Running import (this may take a few minutes)..." -ForegroundColor Gray

npx tsx scripts/import-approved-questions.ts import --all

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host " Workflow Complete!" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "`nNext: Verify database counts with:" -ForegroundColor Yellow
Write-Host "  npm run check:db`n" -ForegroundColor Yellow
