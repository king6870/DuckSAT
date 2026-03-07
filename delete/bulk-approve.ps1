# Bulk Approve All Generated Batches
# This script approves all pending batches for import to database

$batchFiles = Get-ChildItem generated-batches\*.json -Exclude generation-state.json

Write-Host "`n=== Batch Approval Tool ===" -ForegroundColor Cyan
Write-Host "Found $($batchFiles.Count) batches to review`n"

$totalQuestions = 0
$validQuestions = 0

foreach ($file in $batchFiles) {
    $batch = Get-Content $file.FullName | ConvertFrom-Json
    $totalQuestions += $batch.totalGenerated
    $validQuestions += $batch.totalValid
}

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Total questions: $totalQuestions"
Write-Host "  Valid questions: $validQuestions"
Write-Host "  Invalid questions: $($totalQuestions - $validQuestions)`n"

Write-Host "Options:" -ForegroundColor Green
Write-Host "  1. Approve ALL batches (bulk approval)"
Write-Host "  2. Open first 3 HTML files for manual review"
Write-Host "  3. Cancel`n"

$choice = Read-Host "Enter choice (1-3)"

if ($choice -eq "1") {
    Write-Host "`nApproving all batches..." -ForegroundColor Cyan
    
    foreach ($file in $batchFiles) {
        $batch = Get-Content $file.FullName | ConvertFrom-Json
        
        # Approve batch via CLI
        npx tsx scripts/generate-sat-questions.ts approve --batch $batch.batchId
        
        Write-Host "  ✓ Approved: $($batch.batchId) ($($batch.totalValid) questions)" -ForegroundColor Green
    }
    
    Write-Host "`n✅ All batches approved! Ready for import." -ForegroundColor Green
    
} elseif ($choice -eq "2") {
    Write-Host "`nOpening HTML files for review..." -ForegroundColor Cyan
    
    $htmlFiles = Get-ChildItem generated-batches\*.html | Select-Object -First 3
    foreach ($html in $htmlFiles) {
        Start-Process $html.FullName
        Write-Host "  Opened: $($html.Name)"
    }
    
    Write-Host "`nAfter reviewing, run this script again to approve." -ForegroundColor Yellow
    
} else {
    Write-Host "`nCancelled." -ForegroundColor Red
}
