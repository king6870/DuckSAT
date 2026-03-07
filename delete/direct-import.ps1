# Direct Import - Copy valid batches and import 
$ErrorActionPreference = "Stop"

$sourceDir = "C:\Users\lionv\DuckSAT\Migration\DuckSAT\generated-batches"
$approvedDir = "$sourceDir\approved"

Write-Host "`n=== Direct Import to Database ===" -ForegroundColor Cyan

# Ensure approved directory exists
New-Item -ItemType Directory -Force -Path $approvedDir | Out-Null

# Copy all batch files
$batches = Get-ChildItem "$sourceDir\batch-*.json"
Write-Host "Copying $($batches.Count) batch files to approved folder..." -ForegroundColor Yellow

foreach ($batch in $batches) {
    Copy-Item $batch.FullName "$approvedDir\$($batch.Name)" -Force
}

Write-Host "  ✓ Copied $($batches.Count) files`n" -ForegroundColor Green

# Run import
Write-Host "Starting database import..." -ForegroundColor Yellow
Set-Location "C:\Users\lionv\DuckSAT\Migration\DuckSAT"
& npx tsx scripts/import-approved-questions.ts import --all

Write-Host "`n✅ Import complete!`n" -ForegroundColor Green
