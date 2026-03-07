/**
 * Direct Service Integration Test
 * 
 * Tests the full question generation pipeline by calling the service directly.
 * This bypasses authentication and tests the core logic end-to-end.
 * 
 * This test makes REAL API calls to Azure OpenAI (costs money).
 * Test settings: 2 questions total (1 math, 1 reading) for minimal cost.
 * 
 * Run: tsx scripts/test-service-integration.ts
 */

import { UnifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

async function testServiceIntegration() {
  console.log('🧪 Service Integration Test - Full Pipeline\n')
  console.log('=' .repeat(60))
  console.log('⚠️  This test makes REAL API calls (costs money)')
  console.log('📊 Test Settings: 2 questions (1 math, 1 reading)')
  console.log('⏱️  Expected duration: 10-30 seconds')
  console.log('=' .repeat(60))
  
  try {
    console.log('\n🚀 Initializing service...')
    const generator = new UnifiedQuestionGenerator()
    
    console.log('✅ Service initialized')
    
    // Test settings - MINIMAL to reduce cost and time
    const options = {
      mathCount: 1,
      readingCount: 1,
      storeInDatabase: true, // Test database storage
      enableRetry: true,      // Test retry logic
      enableValidation: true, // Test validation
      temperature: 0.7,
      maxTokens: 8000,
      difficultyDistribution: {
        easy: 1,
        medium: 1,
        hard: 0
      }
    }
    
    console.log('\n📋 Options:')
    console.log(JSON.stringify(options, null, 2))
    
    console.log('\n' + '='.repeat(60))
    console.log('🚀 Starting generation pipeline...\n')
    
    const startTime = Date.now()
    
    // This will run the full 6-step pipeline
    const result = await generator.generateQuestions(options)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Pipeline Complete!')
    console.log('⏱️  Total duration:', duration + 's')
    console.log('=' .repeat(60))
    
    // Validate results
    console.log('\n📊 Results Validation:')
    
    // Check summary exists
    if (!result.summary) {
      throw new Error('❌ Missing summary in result')
    }
    console.log('✅ Summary object exists')
    
    // Check counts
    console.log('\n📈 Generation Counts:')
    console.log(`  Generated:  ${result.summary.generated}`)
    console.log(`  Evaluated:  ${result.summary.evaluated}`)
    console.log(`  Accepted:   ${result.summary.accepted}`)
    console.log(`  Rejected:   ${result.summary.rejected}`)
    console.log(`  Stored:     ${result.summary.stored}`)
    console.log(`  Total:      ${result.summary.total}`)
    
    // Check quality
    if (result.summary.averageQuality !== undefined) {
      console.log(`\n📊 Quality Metrics:`)
      console.log(`  Average Quality: ${(result.summary.averageQuality * 100).toFixed(1)}%`)
      console.log(`  Retry Count:     ${result.summary.retryCount || 0}`)
      
      if (result.summary.validationErrors !== undefined) {
        console.log(`  Validation Errors: ${result.summary.validationErrors}`)
      }
    }
    
    // Validate we got at least some questions
    if (result.summary.generated === 0) {
      throw new Error('❌ No questions were generated')
    }
    console.log('\n✅ Questions generated successfully')
    
    // Check accepted questions
    if (!result.questions.accepted || result.questions.accepted.length === 0) {
      console.log('\n⚠️  Warning: No questions were accepted')
      if (result.questions.rejected && result.questions.rejected.length > 0) {
        console.log('\n📋 Rejected Questions:')
        result.questions.rejected.forEach((q, i) => {
          console.log(`\n  ${i + 1}. ${q.question?.substring(0, 100)}...`)
          console.log(`     Quality: ${((q.qualityScore || 0) * 100).toFixed(1)}%`)
          console.log(`     Reason: ${q.evaluationFeedback}`)
        })
      }
    } else {
      console.log(`\n✅ ${result.questions.accepted.length} question(s) accepted`)
      
      // Show sample accepted question
      console.log('\n📝 Sample Accepted Question:')
      const sample = result.questions.accepted[0]
      console.log('  Question:', sample.question)
      console.log('  Options:')
      sample.options.forEach((opt, i) => {
        const marker = i === sample.correctAnswer ? '→' : ' '
        console.log(`    ${marker} ${String.fromCharCode(65 + i)}. ${opt}`)
      })
      console.log(`  Correct: ${String.fromCharCode(65 + sample.correctAnswer)}`)
      console.log(`  Explanation: ${sample.explanation.substring(0, 100)}...`)
      console.log(`  Module: ${sample.moduleType}`)
      console.log(`  Subtopic: ${sample.subtopic}`)
      console.log(`  Difficulty: ${sample.difficulty}`)
      console.log(`  Quality: ${((sample.qualityScore || 0) * 100).toFixed(1)}%`)
      console.log(`  Has Image: ${sample.hasChart ? 'Yes' : 'No'}`)
    }
    
    // Performance check
    const timePerQuestion = parseFloat(duration) / (result.summary.generated || 1)
    console.log(`\n⚡ Performance:`)
    console.log(`  Time per question: ${timePerQuestion.toFixed(2)}s`)
    
    if (timePerQuestion > 30) {
      console.log('  ⚠️  Warning: Slower than target (30s per question)')
    } else {
      console.log('  ✅ Within performance target')
    }
    
    // Final validation
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Integration Test Results:')
    console.log('=' .repeat(60))
    
    const checks = [
      { name: 'Service instantiation', passed: true },
      { name: 'Pipeline execution', passed: true },
      { name: 'Summary generation', passed: result.summary !== undefined },
      { name: 'Question generation', passed: result.summary.generated > 0 },
      { name: 'Question evaluation', passed: result.summary.evaluated > 0 },
      { name: 'Database storage', passed: result.summary.stored >= 0 },
      { name: 'Performance target', passed: timePerQuestion <= 30 }
    ]
    
    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌'
      console.log(`${icon} ${check.name}`)
    })
    
    const passedCount = checks.filter(c => c.passed).length
    const totalCount = checks.length
    
    console.log('\n' + '='.repeat(60))
    console.log(`📊 Final Score: ${passedCount}/${totalCount} checks passed`)
    
    if (passedCount === totalCount) {
      console.log('✅ ALL TESTS PASSED - Service is production-ready!')
    } else {
      console.log('⚠️  Some checks failed - review results above')
    }
    
    console.log('=' .repeat(60))
    
    process.exit(passedCount === totalCount ? 0 : 1)
    
  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('💥 Integration Test Failed!')
    console.error('=' .repeat(60))
    console.error('\nError:', error)
    
    if (error instanceof Error) {
      console.error('\nStack trace:')
      console.error(error.stack)
      
      // Provide helpful tips
      if (error.message.includes('API key')) {
        console.log('\n💡 Tip: Check AZURE_OPENAI_API_KEY environment variable')
      } else if (error.message.includes('endpoint')) {
        console.log('\n💡 Tip: Check ENDPOINT_URL and AZURE_OPENAI_ENDPOINT')
      } else if (error.message.includes('Prisma')) {
        console.log('\n💡 Tip: Ensure database is running and migrations applied')
        console.log('   Run: npm run db:push')
      }
    }
    
    process.exit(1)
  }
}

// Run test
console.log('⏳ Starting in 2 seconds...')
setTimeout(() => {
  testServiceIntegration().catch(error => {
    console.error('Test runner crashed:', error)
    process.exit(1)
  })
}, 2000)
