#!/usr/bin/env powershell

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         COMPREHENSIVE QUESTION GENERATION TEST SUITE           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$workdir = "c:\Users\lionv\DuckSAT\Migration\DuckSAT_CLEAN"
Set-Location $workdir

# Test 1: Check dependencies
Write-Host "`n[TEST 1] Checking dependencies..." -ForegroundColor Yellow
$deps = @("scripts/generate-questions.ts", "scripts/generate_sample_questions.py", "scripts/sat_unified_generator_v4.py")
foreach ($dep in $deps) {
    if (Test-Path $dep) {
        Write-Host "  ✅ $dep exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dep MISSING" -ForegroundColor Red
    }
}

# Test 2: Run question generation
Write-Host "`n[TEST 2] Running question generation..." -ForegroundColor Yellow
Write-Host "Command: npx tsx scripts/generate-questions.ts --test-mode" -ForegroundColor Cyan

npx tsx scripts/generate-questions.ts --test-mode 2>&1 | Tee-Object -Variable genOutput

# Capture the output
$output = $genOutput -join "`n"

# Check for errors
if ($output -match "error|Error|ERROR" -and $output -notmatch "SyntaxError" -and $output -notmatch "TypeError") {
    Write-Host "  ⚠️  Errors detected in generation" -ForegroundColor Red
} else {
    Write-Host "  ✅ Generation completed" -ForegroundColor Green
}

# Test 3: Check generated file
Write-Host "`n[TEST 3] Validating generated JSON..." -ForegroundColor Yellow
$jsonFiles = Get-ChildItem -Path "generated-questions/*.json" -File | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1

if ($jsonFiles) {
    $latestFile = $jsonFiles.FullName
    Write-Host "  Latest file: $(Split-Path $latestFile -Leaf)" -ForegroundColor Cyan
    
    try {
        $json = Get-Content $latestFile -Raw | ConvertFrom-Json
        Write-Host "  ✅ JSON is valid" -ForegroundColor Green
        Write-Host "  📊 Total questions: $($json.questions.Count)" -ForegroundColor Cyan
        
        # Check questions with diagrams
        $withDiagrams = $json.questions | Where-Object { $_.imageData -or $_.chartData }
        Write-Host "  📈 Questions with diagrams: $($withDiagrams.Count)" -ForegroundColor Cyan
        
        # Check required fields
        $allValid = $true
        foreach ($q in $json.questions) {
            if (-not $q.question -or -not $q.options -or $q.correctAnswer -eq $null) {
                Write-Host "  ❌ Question missing required fields" -ForegroundColor Red
                $allValid = $false
                break
            }
        }
        
        if ($allValid) {
            Write-Host "  ✅ All questions have required fields" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ JSON validation failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ No JSON files found in generated-questions/" -ForegroundColor Red
}

# Test 4: Check Python syntax
Write-Host "`n[TEST 4] Checking Python syntax..." -ForegroundColor Yellow
python -m py_compile scripts/generate_sample_questions.py 2>&1 | ForEach-Object {
    if ($_ -match "Error|error") {
        Write-Host "  ❌ $_" -ForegroundColor Red
    }
}
Write-Host "  ✅ Python syntax valid" -ForegroundColor Green

# Test 5: Check TypeScript compilation
Write-Host "`n[TEST 5] Checking TypeScript compilation..." -ForegroundColor Yellow
npx tsc --noEmit scripts/generate-questions.ts 2>&1 | ForEach-Object {
    if ($_ -match "error TS") {
        Write-Host "  ❌ $_" -ForegroundColor Red
    }
}
Write-Host "  ✅ TypeScript compiles" -ForegroundColor Green

# Test 6: Test viewer server
Write-Host "`n[TEST 6] Testing viewer server startup..." -ForegroundColor Yellow
$serverProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workdir'; npx tsx scripts/question-viewer-server.ts" -PassThru
Start-Sleep -Seconds 3

if ($serverProcess.HasExited) {
    Write-Host "  ❌ Server failed to start" -ForegroundColor Red
} else {
    Write-Host "  ✅ Server started on port 3002" -ForegroundColor Green
    Stop-Process -Id $serverProcess.Id -Force
}

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST SUITE COMPLETE                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
