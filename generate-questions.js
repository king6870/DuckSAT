#!/usr/bin/env node
/**
 * Unified Question Generation CLI
 * 
 * A streamlined, all-in-one script for generating SAT questions with comprehensive options.
 * 
 * Usage:
 *   node generate-questions.js
 *   
 * Configuration via environment variables:
 *   BASE_URL              - Server URL (default: http://localhost:3000)
 *   ADMIN_API_KEY         - Optional API key for authentication
 *   MATH_COUNT            - Number of math questions per batch (default: 5)
 *   READING_COUNT         - Number of reading questions per batch (default: 5)
 *   BATCH_COUNT           - Number of batches to run (default: 1)
 *   DELAY_MS              - Delay between batches in milliseconds (default: 15000)
 *   TEMPERATURE           - AI temperature 0-2 (default: 0.7)
 *   MAX_TOKENS            - Max response tokens (default: 4000)
 *   INCLUDE_CHARTS        - Include charts for math (default: true)
 *   INCLUDE_PASSAGES      - Include passages for reading (default: true)
 *   STORE_IN_DATABASE     - Store accepted questions (default: true)
 *   SKIP_EVALUATION       - Skip quality evaluation (default: false)
 *   MODULE_TYPE           - Filter by 'math' or 'reading-writing'
 *   DIFFICULTY            - Filter by 'easy', 'medium', or 'hard'
 *   TOPIC_ID              - Filter by specific topic UUID
 *   SUBTOPIC_ID           - Filter by specific subtopic UUID
 *   RETRY_ATTEMPTS        - Number of retry attempts on failure (default: 3)
 *   RETRY_DELAY_MS        - Delay between retries in milliseconds (default: 5000)
 * 
 * Examples:
 *   # Basic usage (generates 10 questions, stores in DB)
 *   node generate-questions.js
 *   
 *   # Generate 30 math questions across 3 batches
 *   MATH_COUNT=10 READING_COUNT=0 BATCH_COUNT=3 node generate-questions.js
 *   
 *   # Generate hard difficulty questions only
 *   DIFFICULTY=hard node generate-questions.js
 *   
 *   # Production mode with API key
 *   BASE_URL=https://your-domain.com ADMIN_API_KEY=your-key node generate-questions.js
 */

// Configuration
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  adminApiKey: process.env.ADMIN_API_KEY || null,
  mathCount: parseInt(process.env.MATH_COUNT || '5', 10),
  readingCount: parseInt(process.env.READING_COUNT || '5', 10),
  batchCount: parseInt(process.env.BATCH_COUNT || '1', 10),
  delayMs: parseInt(process.env.DELAY_MS || '15000', 10),
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.MAX_TOKENS || '4000', 10),
  includeCharts: process.env.INCLUDE_CHARTS !== 'false',
  includePassages: process.env.INCLUDE_PASSAGES !== 'false',
  storeInDatabase: process.env.STORE_IN_DATABASE !== 'false',
  skipEvaluation: process.env.SKIP_EVALUATION === 'true',
  moduleType: process.env.MODULE_TYPE || null,
  difficulty: process.env.DIFFICULTY || null,
  topicId: process.env.TOPIC_ID || null,
  subtopicId: process.env.SUBTOPIC_ID || null,
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '5000', 10),
}

// Validation
function validateConfig() {
  const errors = []

  if (config.mathCount < 0 || config.mathCount > 50) {
    errors.push('MATH_COUNT must be between 0 and 50')
  }

  if (config.readingCount < 0 || config.readingCount > 50) {
    errors.push('READING_COUNT must be between 0 and 50')
  }

  if (config.mathCount + config.readingCount === 0) {
    errors.push('Must generate at least one question (MATH_COUNT + READING_COUNT > 0)')
  }

  if (config.batchCount < 1) {
    errors.push('BATCH_COUNT must be at least 1')
  }

  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('TEMPERATURE must be between 0 and 2')
  }

  if (config.maxTokens < 1000 || config.maxTokens > 8000) {
    errors.push('MAX_TOKENS must be between 1000 and 8000')
  }

  if (config.moduleType && !['math', 'reading-writing'].includes(config.moduleType)) {
    errors.push('MODULE_TYPE must be "math" or "reading-writing"')
  }

  if (config.difficulty && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
    errors.push('DIFFICULTY must be "easy", "medium", or "hard"')
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:')
    errors.forEach(err => console.error(`   - ${err}`))
    process.exit(1)
  }
}

// Print configuration
function printConfig() {
  console.log('📋 Configuration:')
  console.log(`   Server: ${config.baseUrl}`)
  console.log(`   API Key: ${config.adminApiKey ? '***' + config.adminApiKey.slice(-4) : 'Not set (using session)'}`)
  console.log(`   Questions per batch: ${config.mathCount} math + ${config.readingCount} reading`)
  console.log(`   Batch count: ${config.batchCount}`)
  console.log(`   Delay between batches: ${config.delayMs}ms`)
  console.log(`   Module filter: ${config.moduleType || 'Both'}`)
  console.log(`   Difficulty filter: ${config.difficulty || 'All'}`)
  console.log(`   Topic ID: ${config.topicId || 'Not specified'}`)
  console.log(`   Subtopic ID: ${config.subtopicId || 'Not specified'}`)
  console.log(`   Temperature: ${config.temperature}`)
  console.log(`   Max tokens: ${config.maxTokens}`)
  console.log(`   Include charts: ${config.includeCharts}`)
  console.log(`   Include passages: ${config.includePassages}`)
  console.log(`   Store in database: ${config.storeInDatabase}`)
  console.log(`   Skip evaluation: ${config.skipEvaluation}`)
  console.log(`   Retry attempts: ${config.retryAttempts}`)
  console.log()
}

// Test connection
async function testConnection() {
  console.log('🔍 Testing server connection...')

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (config.adminApiKey) {
      headers['Authorization'] = `Bearer ${config.adminApiKey}`
    }

    const response = await fetch(`${config.baseUrl}/api/admin/unified-generate`, { 
      method: 'GET',
      headers 
    })

    if (response.status === 401 || response.status === 403) {
      console.log('⚠️  Authentication required. Make sure you are logged in or have set ADMIN_API_KEY.')
      return false
    }

    if (!response.ok) {
      console.log(`⚠️  Server responded with status ${response.status}`)
      return false
    }

    console.log('✅ Server is accessible')
    return true
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message)
    console.log(`   Make sure the server is running at ${config.baseUrl}`)
    console.log('   Start with: npm run dev')
    return false
  }
}

// Generate questions with retry logic
async function generateQuestions(attempt = 1) {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (config.adminApiKey) {
      headers['Authorization'] = `Bearer ${config.adminApiKey}`
    }

    const requestBody = {
      mathCount: config.mathCount,
      readingCount: config.readingCount,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      includeCharts: config.includeCharts,
      includePassages: config.includePassages,
      storeInDatabase: config.storeInDatabase,
      skipEvaluation: config.skipEvaluation,
      ...(config.moduleType && { moduleType: config.moduleType }),
      ...(config.difficulty && { difficulty: config.difficulty }),
      ...(config.topicId && { topicId: config.topicId }),
      ...(config.subtopicId && { subtopicId: config.subtopicId }),
    }

    const response = await fetch(`${config.baseUrl}/api/admin/unified-generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const result = await response.json()
    return { success: true, data: result }
  } catch (error) {
    if (attempt < config.retryAttempts) {
      console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`)
      console.log(`   🔄 Retrying in ${config.retryDelayMs / 1000}s... (attempt ${attempt + 1}/${config.retryAttempts})`)
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs))
      return generateQuestions(attempt + 1)
    }

    return { success: false, error: error.message }
  }
}

// Format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Main execution
async function main() {
  console.log('🚀 Unified Question Generation CLI')
  console.log('=' .repeat(80))
  console.log()

  validateConfig()
  printConfig()

  const connected = await testConnection()
  if (!connected) {
    console.log('❌ Cannot proceed without server connection')
    process.exit(1)
  }

  console.log()

  const startTime = Date.now()
  const stats = {
    totalBatches: 0,
    successfulBatches: 0,
    failedBatches: 0,
    totalGenerated: 0,
    totalEvaluated: 0,
    totalAccepted: 0,
    totalRejected: 0,
    totalStored: 0,
    totalNeedsReview: 0,
    errors: [],
  }

  // Run batches
  for (let i = 1; i <= config.batchCount; i++) {
    const batchStartTime = Date.now()
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📦 Batch ${i}/${config.batchCount}`)
    console.log(`${'='.repeat(80)}\n`)

    stats.totalBatches++

    console.log(`🔄 Generating ${config.mathCount} math + ${config.readingCount} reading questions...`)

    const result = await generateQuestions()

    if (result.success) {
      stats.successfulBatches++
      const data = result.data

      if (data.summary) {
        stats.totalGenerated += data.summary.generated || 0
        stats.totalEvaluated += data.summary.evaluated || 0
        stats.totalAccepted += data.summary.accepted || 0
        stats.totalRejected += data.summary.rejected || 0
        stats.totalStored += data.summary.stored || 0
        stats.totalNeedsReview += data.summary.needsReview || 0

        console.log('\n✅ Batch completed successfully!')
        console.log(`   Generated: ${data.summary.generated}`)
        console.log(`   Evaluated: ${data.summary.evaluated}`)
        console.log(`   Accepted: ${data.summary.accepted}`)
        console.log(`   Rejected: ${data.summary.rejected}`)
        console.log(`   Stored: ${data.summary.stored}`)
        console.log(`   Needs Review: ${data.summary.needsReview}`)
      }

      const batchDuration = Date.now() - batchStartTime
      console.log(`   Duration: ${formatDuration(batchDuration)}`)
    } else {
      stats.failedBatches++
      stats.errors.push(`Batch ${i}: ${result.error}`)
      console.log(`\n❌ Batch failed: ${result.error}`)
    }

    // Wait between batches (except after last)
    if (i < config.batchCount) {
      const waitSeconds = config.delayMs / 1000
      console.log(`\n⏳ Waiting ${waitSeconds}s before next batch...`)
      await new Promise(resolve => setTimeout(resolve, config.delayMs))
    }
  }

  // Print final summary
  const totalDuration = Date.now() - startTime

  console.log(`\n\n${'='.repeat(80)}`)
  console.log('🎉 GENERATION COMPLETE!')
  console.log(`${'='.repeat(80)}\n`)

  console.log('📊 Final Statistics:')
  console.log(`   Total Batches: ${stats.totalBatches}`)
  console.log(`   Successful: ${stats.successfulBatches} ✅`)
  console.log(`   Failed: ${stats.failedBatches} ❌`)
  console.log()
  console.log(`   Questions Generated: ${stats.totalGenerated}`)
  console.log(`   Questions Evaluated: ${stats.totalEvaluated}`)
  console.log(`   Questions Accepted: ${stats.totalAccepted}`)
  console.log(`   Questions Rejected: ${stats.totalRejected}`)
  console.log(`   Questions Stored: ${stats.totalStored}`)
  console.log(`   Questions Needing Review: ${stats.totalNeedsReview}`)

  if (stats.totalGenerated > 0) {
    const acceptanceRate = ((stats.totalAccepted / stats.totalGenerated) * 100).toFixed(1)
    console.log()
    console.log(`   Acceptance Rate: ${acceptanceRate}%`)
    if (stats.totalStored > 0) {
      const storageRate = ((stats.totalStored / stats.totalAccepted) * 100).toFixed(1)
      console.log(`   Storage Success Rate: ${storageRate}%`)
    }
  }

  console.log()
  console.log(`   Total Duration: ${formatDuration(totalDuration)}`)

  if (stats.totalStored > 0) {
    const avgTimePerQuestion = Math.round(totalDuration / stats.totalStored)
    console.log(`   Average Time Per Stored Question: ${formatDuration(avgTimePerQuestion)}`)
  }

  // Print errors if any
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`)
    })
  }

  // Print warnings
  if (stats.totalNeedsReview > 0) {
    console.log('\n⚠️  Warning: Some questions need manual review!')
    console.log(`   ${stats.totalNeedsReview} questions were flagged for review.`)
    console.log(`   Review them at: ${config.baseUrl}/admin/questions?reviewStatus=pending`)
  }

  console.log()

  // Exit with appropriate code
  if (stats.failedBatches > 0) {
    console.log('❌ Generation completed with errors')
    process.exit(1)
  } else {
    console.log('✅ Generation completed successfully')
    process.exit(0)
  }
}

// Handle errors and interruptions
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Generation interrupted by user')
  process.exit(130)
})

// Run
main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
