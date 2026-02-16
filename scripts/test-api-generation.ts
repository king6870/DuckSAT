/**
 * API Integration Test for Question Generation
 * 
 * This script tests the full API endpoint with a real HTTP request.
 * 
 * Prerequisites:
 * 1. Server running: npm run dev
 * 2. Valid session/auth token
 * 3. Database accessible
 * 
 * Run: tsx scripts/test-api-generation.ts
 */

interface GenerationSettings {
  llmModel: string
  questionCount: number
  mathCount: number
  readingCount: number
  temperature: number
  maxTokens: number
  includeCharts: boolean
  includePassages: boolean
}

async function testAPIGeneration() {
  console.log('🧪 Testing API Question Generation Endpoint\n')
  console.log('=' .repeat(60))
  
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const endpoint = `${apiUrl}/api/admin/enhanced-generate-questions`
  
  console.log(`📡 Target: ${endpoint}`)
  
  // Test settings - MINIMAL to avoid long wait times
  const settings: GenerationSettings = {
    llmModel: 'gpt-4o',
    questionCount: 2, // Just 2 questions for fast test
    mathCount: 1,
    readingCount: 1,
    temperature: 0.7,
    maxTokens: 8000,
    includeCharts: false, // Disable to speed up test
    includePassages: true
  }
  
  console.log('\n📊 Test Settings:')
  console.log(JSON.stringify(settings, null, 2))
  
  try {
    console.log('\n🚀 Sending request...')
    const startTime = Date.now()
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need to include auth cookies/session
      },
      body: JSON.stringify(settings)
    })
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`⏱️  Response time: ${duration}s`)
    
    console.log(`📥 Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('\n❌ Request Failed:')
      console.error(errorText)
      
      if (response.status === 403) {
        console.log('\n💡 Tip: This endpoint requires admin authentication.')
        console.log('   If testing locally, ensure you\'re logged in as admin.')
      }
      
      process.exit(1)
    }
    
    const data = await response.json()
    
    console.log('\n✅ Request Successful!')
    console.log('\n📊 Response Summary:')
    console.log(`  Generated: ${data.summary?.generated || 0}`)
    console.log(`  Evaluated: ${data.summary?.evaluated || 0}`)
    console.log(`  Accepted:  ${data.summary?.accepted || 0}`)
    console.log(`  Rejected:  ${data.summary?.rejected || 0}`)
    console.log(`  Stored:    ${data.summary?.stored || 0}`)
    
    if (data.summary?.retryCount !== undefined) {
      console.log(`  Retries:   ${data.summary.retryCount}`)
    }
    if (data.summary?.validationErrors !== undefined) {
      console.log(`  Validation Errors: ${data.summary.validationErrors}`)
    }
    
    // Show sample questions
    if (data.questions?.accepted?.length > 0) {
      console.log('\n📝 Sample Accepted Question:')
      const sample = data.questions.accepted[0]
      console.log(`  Question: ${sample.question?.substring(0, 80)}...`)
      console.log(`  Module: ${sample.moduleType}`)
      console.log(`  Difficulty: ${sample.difficulty}`)
      console.log(`  Quality: ${(sample.qualityScore * 100).toFixed(1)}%`)
      console.log(`  Subtopic: ${sample.subtopic}`)
    }
    
    if (data.questions?.rejected?.length > 0) {
      console.log('\n⚠️  Rejected Questions:')
      data.questions.rejected.forEach((q: any, i: number) => {
        console.log(`  ${i + 1}. ${q.question?.substring(0, 60)}...`)
        console.log(`     Reason: ${q.evaluationFeedback}`)
      })
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ API Integration Test Passed!')
    
  } catch (error) {
    console.error('\n💥 Test Failed:')
    console.error(error)
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Tip: Server not running. Start with: npm run dev')
      } else if (error.message.includes('fetch')) {
        console.log('\n💡 Tip: Ensure server is accessible at', apiUrl)
      }
    }
    
    process.exit(1)
  }
}

// Run test
testAPIGeneration().catch(error => {
  console.error('Test runner crashed:', error)
  process.exit(1)
})
