# Automated Bulk Approval Script
# Approves all batches with valid questions

Write-Host "`n=== Starting Bulk Approval ===" -ForegroundColor Cyan

$batches = Get-ChildItem generated-batches\*.json -Exclude generation-state.json | Sort-Object Name

$approved = 0
$skipped = 0
$errors = 0

foreach ($file in $batches) {
    try {
        $batch = Get-Content $file.FullName | ConvertFrom-Json
        
        if ($batch.totalValid -gt 0) {
            # Approve this batch
            $result = npx tsx scripts/generate-sat-questions.ts approve --batch $batch.batchId 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                $approved++
                Write-Host "  ✓ $($batch.batchId): $($batch.totalValid) questions" -ForegroundColor Green
            } else {
                $errors++
                Write-Host "  ✗ $($batch.batchId): Error during approval" -ForegroundColor Red
            }
        } else {
            $skipped++
            Write-Host "  ⊘ $($batch.batchId): Skipped (0 valid questions)" -ForegroundColor Yellow
        }
    } catch {
        $errors++
        Write-Host "  ✗ $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Approval Complete ===" -ForegroundColor Cyan
Write-Host "Approved: $approved batches" -ForegroundColor Green
Write-Host "Skipped: $skipped empty batches" -ForegroundColor Yellow
Write-Host "Errors: $errors" -ForegroundColor $(if($errors -gt 0){'Red'}else{'Green'})
Write-Host "`nReady for database import!" -ForegroundColor Green
