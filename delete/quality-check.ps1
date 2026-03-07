# Quick Quality Check on All Batches
$batches = Get-ChildItem generated-batches\*.json -Exclude generation-state.json

$stats = @{
    Total = 0
    Valid = 0
    Invalid = 0
    EmptyBatches = 0
}

$issues = @()

foreach ($file in $batches) {
    $batch = Get-Content $file.FullName | ConvertFrom-Json
    
    $stats.Total += $batch.totalGenerated
    $stats.Valid += $batch.totalValid
    $stats.Invalid += $batch.totalInvalid
    
    if ($batch.totalValid -eq 0) {
        $stats.EmptyBatches++
        $issues += $batch.batchId
    }
}

Write-Host "`n=== Quality Check Results ===" -ForegroundColor Cyan
Write-Host "Total batches: $($batches.Count)"
Write-Host "Total questions generated: $($stats.Total)"
Write-Host "Valid questions: $($stats.Valid)"
Write-Host "Invalid questions: $($stats.Invalid)"
Write-Host "Empty batches (0 valid): $($stats.EmptyBatches)"

if ($stats.EmptyBatches -gt 0) {
    Write-Host "`nBatches with no valid questions:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" }
}

Write-Host "`nQuality: $(if ($stats.Valid -gt 350) { '✅ EXCELLENT' } elseif ($stats.Valid -gt 300) { '✓ GOOD' } else { '⚠️ NEEDS REVIEW' })" -ForegroundColor Green
Write-Host "Ready for approval: $(if ($stats.EmptyBatches -eq 0) { 'YES ✓' } else { "NO - $($stats.EmptyBatches) empty batches" })`n"
