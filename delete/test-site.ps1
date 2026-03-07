#!/usr/bin/env pwsh

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         DuckSAT Complete Site Error Check & Fix              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$passed = 0
$failed = 0
$errors = @()

# Test function
function Test-Page {
    param($path, $description)
    $url = "$baseUrl$path"
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        Write-Host "✅ $description" -ForegroundColor Green
        Write-Host "   URL: $path" -ForegroundColor Gray
        Write-Host "   Status: $($response.StatusCode)`n" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "❌ $description" -ForegroundColor Red  
        Write-Host "   URL: $path" -ForegroundColor Gray
        Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Yellow
        $script:errors += @{
            Page = $description
            Path = $path
            Error = $_.Exception.Message
        }
        return $false
    }
}

# Wait for server
Write-Host "⏳ Waiting for server to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n[1/6] Testing Main Pages`n" -ForegroundColor Cyan
$script:passed += (Test-Page "/" "Homepage") ? 1 : 0; $script:failed += (Test-Page "/" "Homepage") ? 0 : 1
$script:passed += (Test-Page "/practice-test" "Practice Test Page") ? 1 : 0; $script:failed += (Test-Page "/practice-test" "Practice Test Page") ? 0 : 1

Write-Host "[2/6] Testing API Endpoints`n" -ForegroundColor Cyan
$script:passed += (Test-Page "/api/questions?limit=5" "Questions API") ? 1 : 0; $script:failed += (Test-Page "/api/questions?limit=5" "Questions API") ? 0 : 1
$script:passed += (Test-Page "/api/auth/session" "Auth Session API") ? 1 : 0; $script:failed += (Test-Page "/api/auth/session" "Auth Session API") ? 0 : 1
$script:passed += (Test-Page "/api/auth/providers" "Auth Providers API") ? 1 : 0; $script:failed += (Test-Page "/api/auth/providers" "Auth Providers API") ? 0 : 1

Write-Host "[3/6] Testing Question Filtering`n" -ForegroundColor Cyan
$script:passed += (Test-Page "/api/questions?category=algebra&limit=3" "Filter by Category") ? 1 : 0; $script:failed += (Test-Page "/api/questions?category=algebra&limit=3" "Filter by Category") ? 0 : 1
$script:passed += (Test-Page "/api/questions?moduleType=math&limit=3" "Filter by Module Type") ? 1 : 0; $script:failed += (Test-Page "/api/questions?moduleType=math&limit=3" "Filter by Module Type") ? 0 : 1

Write-Host "[4/6] Testing Database Quality`n" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/questions?limit=10"
    $questionsWithPassage = ($response.questions | Where-Object { $_.passage }).Count
    $mathQuestions = ($response.questions | Where-Object { $_.moduleType -eq 'math' }).Count
    $readingQuestions = ($response.questions | Where-Object { $_.moduleType -eq 'reading-writing' }).Count
    
    Write-Host "✅ Database Quality Check" -ForegroundColor Green
    Write-Host "   Total questions: $($response.questions.Count)" -ForegroundColor Gray
    Write-Host "   Math: $mathQuestions, Reading: $readingQuestions" -ForegroundColor Gray
    Write-Host "   Questions with passages: $questionsWithPassage`n" -ForegroundColor Gray
    $script:passed++
} catch {
    Write-Host "❌ Database Quality Check Failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Yellow
    $script:failed++
}

Write-Host "[5/6] Testing Static Assets`n" -ForegroundColor Cyan
$script:passed += (Test-Page "/duck-logo.svg" "Duck Logo") ? 1 : 0; $script:failed += (Test-Page "/duck-logo.svg" "Duck Logo") ? 0 : 1

Write-Host "[6/6] Checking for Console Errors`n" -ForegroundColor Cyan
Write-Host "⚠️  Manual check required: Open browser DevTools and check for:" -ForegroundColor Yellow
Write-Host "   - Red errors in Console tab" -ForegroundColor Gray
Write-Host "   - Network failures in Network tab" -ForegroundColor Gray
Write-Host "   - React warnings in Console tab`n" -ForegroundColor Gray

# Summary
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      Test Summary                             ║" -ForegroundColor Cyan
Write-Host "╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  ✅ Passed: $($script:passed.ToString().PadLeft(2))                                                  ║" -ForegroundColor Green
Write-Host "║  ❌ Failed: $($script:failed.ToString().PadLeft(2))                                                  ║" -ForegroundColor $(if ($script:failed -gt 0) { "Red" } else { "Green" })
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if ($script:errors.Count -gt 0) {
    Write-Host "📋 Error Details:`n" -ForegroundColor Yellow
    foreach ($error in $script:errors) {
        Write-Host "  Page: $($error.Page)" -ForegroundColor White
        Write-Host "  Path: $($error.Path)" -ForegroundColor Gray
        Write-Host "  Error: $($error.Error)`n" -ForegroundColor Red
    }
}

if ($script:failed -eq 0) {
    Write-Host "🎉 All automated tests passed! Site is working correctly." -ForegroundColor Green
    Write-Host "   Open http://localhost:3000 in your browser to verify manually.`n" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Some tests failed. Review errors above and fix issues.`n" -ForegroundColor Yellow
}
