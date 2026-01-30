#!/usr/bin/env pwsh
# Complete SAT Question Generation Workflow Demo
# From Azure OpenAI → Database → Website

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SAT Question Generation - Complete Workflow Demonstration    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$workdir = "c:\Users\lionv\DuckSAT\Migration\DuckSAT_CLEAN"

# Step 1: Generate Questions with Azure OpenAI
Write-Host "[STEP 1] 🤖 Generating questions with Azure OpenAI..." -ForegroundColor Yellow
Write-Host "  → Calling sat_unified_generator_v3.py" -ForegroundColor Gray
Write-Host "  → Using GPT-4 model for real question generation" -ForegroundColor Gray

cd $workdir
python scripts/sat_unified_generator_v3.py --count 3 --output generated-questions/demo_questions.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error generating questions" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Questions generated successfully!" -ForegroundColor Green
Write-Host "  📁 Saved to: generated-questions/demo_questions.json`n" -ForegroundColor Gray

# Step 2: Show generated JSON
Write-Host "[STEP 2] 📄 Viewing generated question structure..." -ForegroundColor Yellow
$json = Get-Content "generated-questions/demo_questions.json" | ConvertFrom-Json
$firstQuestion = $json[0]

Write-Host "  Sample Question:" -ForegroundColor Cyan
Write-Host "  ├─ Question: $($firstQuestion.question.Substring(0, [Math]::Min(60, $firstQuestion.question.Length)))..." -ForegroundColor White
Write-Host "  ├─ Choices: $($firstQuestion.choices.Count) options" -ForegroundColor White
Write-Host "  ├─ Correct: $($firstQuestion.correct_answer)" -ForegroundColor White
Write-Host "  ├─ Has Diagram: $(if ($firstQuestion.diagram_description) { 'Yes ✓' } else { 'No' })" -ForegroundColor White
Write-Host "  └─ Has Explanation: $(if ($firstQuestion.explanation) { 'Yes ✓' } else { 'No' })`n" -ForegroundColor White

# Step 3: Import to Database
Write-Host "[STEP 3] 💾 Importing questions to PostgreSQL database..." -ForegroundColor Yellow
Write-Host "  → Connecting to Prisma" -ForegroundColor Gray
Write-Host "  → Transforming JSON to database schema" -ForegroundColor Gray

npx tsx scripts/import-questions-demo.ts generated-questions/demo_questions.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error importing to database" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Questions imported to database!" -ForegroundColor Green

# Step 4: Verify in Database
Write-Host "`n[STEP 4] 🔍 Verifying questions in database..." -ForegroundColor Yellow
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      question: true,
      moduleType: true,
      category: true,
      imageData: true,
      createdAt: true
    }
  });
  
  console.log('  Latest questions in database:');
  questions.forEach((q, i) => {
    console.log(\`  \${i+1}. [\${q.moduleType}] \${q.question.substring(0, 50)}...\`);
    console.log(\`     └─ Has diagram: \${q.imageData ? 'Yes ✓' : 'No'}\`);
  });
  
  await prisma.\$disconnect();
})();
"

Write-Host "`n✅ Database verification complete!" -ForegroundColor Green

# Step 5: Test API Endpoint
Write-Host "`n[STEP 5] 🌐 Testing API endpoint..." -ForegroundColor Yellow
Write-Host "  → Fetching questions via /api/questions" -ForegroundColor Gray

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/questions?limit=3" -Method Get
$apiQuestions = $response.questions

Write-Host "  API Response:" -ForegroundColor Cyan
Write-Host "  ├─ Total questions: $($response.pagination.total)" -ForegroundColor White
Write-Host "  ├─ Returned: $($apiQuestions.Count)" -ForegroundColor White
Write-Host "  └─ Questions have imageData: $(($apiQuestions | Where-Object { $_.imageData }).Count)`n" -ForegroundColor White

Write-Host "✅ API endpoint working!" -ForegroundColor Green

# Step 6: View on Website
Write-Host "`n[STEP 6] 🌍 Opening practice test in browser..." -ForegroundColor Yellow
Write-Host "  → URL: http://localhost:3000/practice-test" -ForegroundColor Gray

Start-Process "http://localhost:3000/practice-test"

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  ✅ WORKFLOW COMPLETE! ✅                     ║" -ForegroundColor Cyan
Write-Host "╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  The complete question generation workflow has been executed: ║" -ForegroundColor Cyan
Write-Host "║                                                               ║" -ForegroundColor Cyan
Write-Host "║  1. ✓ Generated questions with Azure OpenAI (GPT-4)          ║" -ForegroundColor Green
Write-Host "║  2. ✓ Saved to JSON file                                     ║" -ForegroundColor Green
Write-Host "║  3. ✓ Imported to PostgreSQL database                        ║" -ForegroundColor Green
Write-Host "║  4. ✓ Verified database storage                              ║" -ForegroundColor Green
Write-Host "║  5. ✓ Tested API endpoint                                    ║" -ForegroundColor Green
Write-Host "║  6. ✓ Opened website to view questions                       ║" -ForegroundColor Green
Write-Host "║                                                               ║" -ForegroundColor Cyan
Write-Host "║  🎉 Questions are now live on http://localhost:3000!         ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
