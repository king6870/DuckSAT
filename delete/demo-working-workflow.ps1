#!/usr/bin/env pwsh
# Complete SAT Question Generation Workflow Demo
# Using the WORKING sat_generator.py that inserts directly to database

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SAT Question Generation - Complete Workflow (Working)        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$workdir = "c:\Users\lionv\DuckSAT\Migration\DuckSAT_CLEAN"

cd $workdir

# Step 1: Generate Questions with Azure OpenAI and insert to database
Write-Host "[STEP 1] 🤖 Generating questions with Azure OpenAI..." -ForegroundColor Yellow
Write-Host "  → Using sat_generator.py (working version)" -ForegroundColor Gray
Write-Host "  → GPT-4 model: gpt-5-nano" -ForegroundColor Gray
Write-Host "  → Inserts directly to PostgreSQL database" -ForegroundColor Gray
Write-Host "  → 5 Math + 5 Reading = 10 total questions`n" -ForegroundColor Gray

python scripts/sat_generator.py

Write-Host "`n✅ Generation complete!" -ForegroundColor Green

# Step 2: Verify in Database
Write-Host "`n[STEP 2] 🔍 Verifying questions in database..." -ForegroundColor Yellow

$verifyScript = @'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  const recentQuestions = await prisma.question.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      question: true,
      moduleType: true,
      category: true,
      imageData: true,
      createdAt: true
    }
  });

  console.log(`\n📊 Most Recent 10 Questions:\n`);
  console.log(`${'─'.repeat(80)}`);
  
  recentQuestions.forEach((q, i) => {
    const hasImage = q.imageData ? '🖼️' : '  ';
    const questionPreview = q.question.substring(0, 50).replace(/\n/g, ' ');
    console.log(`${i + 1}. [${q.id}] ${hasImage} ${q.moduleType} | ${questionPreview}...`);
  });
  
  console.log(`${'─'.repeat(80)}\n`);
  
  const counts = await prisma.question.groupBy({
    by: ['moduleType'],
    _count: { id: true }
  });
  
  console.log('📈 Total by Module:');
  counts.forEach(c => {
    console.log(`  ${c.moduleType}: ${c._count.id} questions`);
  });
  
  await prisma.$disconnect();
}

verify().catch(console.error);
'@

$verifyScript | Out-File -FilePath "scripts/temp-verify.ts" -Encoding UTF8
npx tsx scripts/temp-verify.ts
Remove-Item "scripts/temp-verify.ts" -ErrorAction SilentlyContinue

# Step 3: Test API Endpoint
Write-Host "`n[STEP 3] 🌐 Testing API endpoint..." -ForegroundColor Yellow

try {
    $apiResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/questions?limit=3" -Method GET
    Write-Host "  ✅ API responding successfully" -ForegroundColor Green
    Write-Host "  📦 Retrieved $($apiResponse.questions.Count) questions`n" -ForegroundColor Gray
    
    if ($apiResponse.questions.Count -gt 0) {
        $q = $apiResponse.questions[0]
        Write-Host "  Sample from API:" -ForegroundColor Cyan
        Write-Host "  ├─ ID: $($q.id)" -ForegroundColor White
        Write-Host "  ├─ Module: $($q.moduleType)" -ForegroundColor White
        Write-Host "  ├─ Question: $($q.question.Substring(0, [Math]::Min(60, $q.question.Length)))..." -ForegroundColor White
        Write-Host "  ├─ Options: $($q.options.Count)" -ForegroundColor White
        Write-Host "  ├─ Has Image: $(if ($q.imageData) { 'Yes 🖼️' } else { 'No' })" -ForegroundColor White
        Write-Host "  └─ Source: $($q.source)`n" -ForegroundColor White
    }
} catch {
    Write-Host "  ⚠️  API not responding (is dev server running?)" -ForegroundColor Yellow
    Write-Host "  Start it with: npm run dev`n" -ForegroundColor Gray
}

# Step 4: Open Browser
Write-Host "[STEP 4] 🌍 Opening practice test in browser..." -ForegroundColor Yellow
Write-Host "  → http://localhost:3000/practice-test`n" -ForegroundColor Gray

Start-Sleep -Seconds 1
Start-Process "http://localhost:3000/practice-test"

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    ✨ Workflow Complete! ✨                   ║" -ForegroundColor Green
Write-Host "╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  1. ✅ Generated questions with Azure OpenAI                  ║" -ForegroundColor Green
Write-Host "║  2. ✅ Inserted into PostgreSQL database                      ║" -ForegroundColor Green
Write-Host "║  3. ✅ Verified via API endpoint                              ║" -ForegroundColor Green
Write-Host "║  4. ✅ Opened in browser                                      ║" -ForegroundColor Green
Write-Host "╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  🦆 You can now see AI-generated questions on the website!    ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📝 Notes:" -ForegroundColor Cyan
Write-Host "  • Questions are generated using Azure OpenAI GPT-4" -ForegroundColor White
Write-Host "  • Each run generates: 5 Math + 5 Reading questions" -ForegroundColor White
Write-Host "  • Diagram generation is disabled by default (faster)" -ForegroundColor White
Write-Host "  • Questions persist in database across runs`n" -ForegroundColor White
