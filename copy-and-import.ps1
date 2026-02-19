# Copy batches and import to database
$ErrorActionPreference = "Stop"

# Change to the DuckSAT directory
Set-Location "C:\Users\lionv\DuckSAT\Migration\DuckSAT"

Write-Host "=== QG800 Import Script ===" -ForegroundColor Cyan
Write-Host " "

# Step 1: Copy batch files
Write-Host "Step 1: Copying batch files to approved folder..." -ForegroundColor Yellow
$batchFiles = Get-ChildItem "generated-batches\batch-*.json"
$batchCount = $batchFiles.Count
Write-Host "Found $batchCount batch files" -ForegroundColor White

foreach ($file in $batchFiles) {
    Copy-Item $file.FullName "generated-batches\approved" -Force
}

$approvedCount = (Get-ChildItem "generated-batches\approved\*.json").Count
Write-Host "Copied $approvedCount files to approved folder" -ForegroundColor Green
Write-Host " "

# Step 2: Import to database
Write-Host "Step 2: Importing to database..." -ForegroundColor Yellow
npx tsx scripts/import-approved-questions.ts import --all

Write-Host " "
Write-Host "=== Import Complete ===" -ForegroundColor Cyan
