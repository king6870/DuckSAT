$mathTotal = 0
$readingTotal = 0

Get-ChildItem generated-batches\*.json -Exclude generation-state.json | ForEach-Object {
    $batch = Get-Content $_.FullName | ConvertFrom-Json
    if ($batch.moduleType -eq 'math') {
        $mathTotal += $batch.totalValid
    } else {
        $readingTotal += $batch.totalValid
    }
}

Write-Output "Math: $mathTotal / 330"
Write-Output "Reading: $readingTotal / 41"
Write-Output "Total: $($mathTotal + $readingTotal) / 371"
Write-Output "---"
Write-Output "Status: $(if ($mathTotal + $readingTotal -ge 371) { 'COMPLETE' } else { 'IN PROGRESS' })"
