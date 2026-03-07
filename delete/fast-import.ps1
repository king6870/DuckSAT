# Fast Approval & Import - No Individual Batch Processing
# Directly moves all valid batch files to approved folder and imports

Write-Host "`n=== QG800 Fast Import Workflow ===" -ForegroundColor Cyan

# Step 1: Find all valid batches
$batches = Get-ChildItem generated-batches\*.json -Exclude generation-state.json
$validBatches = @()
$totalQuestions = 0

foreach ($file in $batches) {
    $batch = Get-Content $file.FullName | ConvertFrom-Json
    if ($batch.totalValid -gt 0) {
        $validBatches += $file
        $totalQuestions += $batch.totalValid
    }
}

Write-Host "Found $($validBatches.Count) valid batches with $totalQuestions questions`n" -ForegroundColor Green

# Step 2: Move all valid batches to approved folder
Write-Host "Moving batches to approved folder..." -ForegroundColor Yellow
$approvedDir = "generated-batches\approved"
if (!(Test-Path $approvedDir)) {
    New-Item -ItemType Directory -Path $approvedDir | Out-Null
}

foreach ($file in $validBatches) {
    $destPath = Join-Path $approvedDir $file.Name
    Copy-Item $file.FullName $destPath -Force
}

Write-Host "  ✓ Moved $($validBatches.Count) batches to approved/`n" -ForegroundColor Green

# Step 3: Direct database import
Write-Host "Importing to database..." -ForegroundColor Yellow
Write-Host "  (This may take 2-3 minutes for $totalQuestions questions)`n" -ForegroundColor Gray

npx tsx scripts/import-approved-questions.ts import --all

Write-Host "`n=== Import Complete! ===" -ForegroundColor Green
Write-Host "`nNext: Verify with 'npm run check:db' or query the database`n" -ForegroundColor Yellow
