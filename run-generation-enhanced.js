#!/usr/bin/env node
// Enhanced admin batch generation script for DuckSAT
// Usage: set env vars and run with `node run-generation-enhanced.js`
// Config via environment variables:
// BASE_URL (default http://localhost:3000)
// ADMIN_API_KEY (optional) -> sent as Authorization: Bearer 
// QUESTION_COUNT (default 10)
// BATCH_SIZE (default 5)
// BATCH_COUNT (default 1)
// DELAY_BETWEEN_BATCHES (default 15000 ms)
// MODULE_TYPE (optional: 'math' | 'reading-writing')
// DIFFICULTY (optional: 'easy' | 'medium' | 'hard')
// TOPIC_ID (optional)
// SUBTOPIC_ID (optional)
// TEMPERATURE (default 0.7)
// MAX_TOKENS (default 4000)
// INCLUDE_CHARTS (default true for math)
// INCLUDE_PASSAGES (default true for reading)

// Note: This script requires Node.js 18+ for native fetch support
// For older Node versions, install node-fetch: npm install node-fetch

// Configuration from environment variables
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  adminApiKey: process.env.ADMIN_API_KEY || null,
  questionCount: parseInt(process.env.QUESTION_COUNT || '10', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '5', 10),
  batchCount: parseInt(process.env.BATCH_COUNT || '1', 10),
  delayBetweenBatches: parseInt(process.env.DELAY_BETWEEN_BATCHES || '15000', 10),
  moduleType: process.env.MODULE_TYPE || null,
  difficulty: process.env.DIFFICULTY || null,
  topicId: process.env.TOPIC_ID || null,
  subtopicId: process.env.SUBTOPIC_ID || null,
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.MAX_TOKENS || '4000', 10),
  includeCharts: process.env.INCLUDE_CHARTS !== 'false',
  includePassages: process.env.INCLUDE_PASSAGES !== 'false',
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10),
};

// Validate configuration
function validateConfig() {
  const errors = [];
  
  if (config.questionCount < 1 || config.questionCount > 50) {
    errors.push('QUESTION_COUNT must be between 1 and 50');
  }
  
  if (config.batchSize < 1 || config.batchSize > 10) {
    errors.push('BATCH_SIZE must be between 1 and 10');
  }
  
  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('TEMPERATURE must be between 0 and 2');
  }
  
  if (config.maxTokens < 1000 || config.maxTokens > 8000) {
    errors.push('MAX_TOKENS must be between 1000 and 8000');
  }
  
  if (config.moduleType && !['math', 'reading-writing'].includes(config.moduleType)) {
    errors.push('MODULE_TYPE must be "math" or "reading-writing"');
  }
  
  if (config.difficulty && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
    errors.push('DIFFICULTY must be "easy", "medium", or "hard"');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    process.exit(1);
  }
}

// Print configuration
function printConfig() {
  console.log('📋 Configuration:');
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Admin API Key: ${config.adminApiKey ? '***' + config.adminApiKey.slice(-4) : 'Not set (using session auth)'}`);
  console.log(`   Question Count: ${config.questionCount} per batch`);
  console.log(`   Batch Size: ${config.batchSize} questions per request`);
  console.log(`   Batch Count: ${config.batchCount} batches`);
  console.log(`   Delay Between Batches: ${config.delayBetweenBatches}ms`);
  console.log(`   Module Type: ${config.moduleType || 'Both'}`);
  console.log(`   Difficulty: ${config.difficulty || 'All'}`);
  console.log(`   Topic ID: ${config.topicId || 'Not specified'}`);
  console.log(`   Subtopic ID: ${config.subtopicId || 'Not specified'}`);
  console.log(`   Temperature: ${config.temperature}`);
  console.log(`   Max Tokens: ${config.maxTokens}`);
  console.log(`   Include Charts: ${config.includeCharts}`);
  console.log(`   Include Passages: ${config.includePassages}`);
  console.log(`   Retry Attempts: ${config.retryAttempts}`);
  console.log();
}

// Test server connection
async function testConnection() {
  console.log('🔍 Testing server connection...');
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (config.adminApiKey) {
      headers['Authorization'] = `Bearer ${config.adminApiKey}`;
    }
    
    const response = await fetch(`${config.baseUrl}/api/admin/questions`, { headers });
    
    if (response.status === 401 || response.status === 403) {
      console.log('⚠️  Authentication required. Make sure you are logged in or have set ADMIN_API_KEY.');
      return false;
    }
    
    if (!response.ok) {
      console.log(`⚠️  Server responded with status ${response.status}`);
      return false;
    }
    
    console.log('✅ Server is running and accessible');
    return true;
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message);
    console.log(`   Make sure the server is running at ${config.baseUrl}`);
    console.log('   Start with: npm run dev');
    return false;
  }
}

// Generate questions with retry logic
async function generateQuestions(requestBody, attempt = 1) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (config.adminApiKey) {
      headers['Authorization'] = `Bearer ${config.adminApiKey}`;
    }
    
    const response = await fetch(`${config.baseUrl}/api/admin/enhanced-generate-questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
    
  } catch (error) {
    if (attempt < config.retryAttempts) {
      console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`);
      console.log(`   🔄 Retrying in ${config.retryDelay / 1000}s... (attempt ${attempt + 1}/${config.retryAttempts})`);
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return generateQuestions(requestBody, attempt + 1);
    }
    
    return { success: false, error: error.message };
  }
}

// Format time duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Run batch generation
async function runBatchGeneration() {
  console.log('🚀 Starting enhanced batch question generation...\n');
  
  validateConfig();
  printConfig();
  
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Cannot proceed without server connection');
    process.exit(1);
  }
  
  console.log();
  
  const startTime = Date.now();
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
    errors: []
  };
  
  // Calculate counts
  const totalQuestions = config.questionCount;
  const mathCount = config.moduleType === 'reading-writing' ? 0 : Math.ceil(totalQuestions / 2);
  const readingCount = config.moduleType === 'math' ? 0 : totalQuestions - mathCount;
  
  // Run batches
  for (let i = 1; i <= config.batchCount; i++) {
    const batchStartTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 Batch ${i}/${config.batchCount}`);
    console.log(`${'='.repeat(80)}\n`);
    
    stats.totalBatches++;
    
    const requestBody = {
      llmModel: 'gpt-5',
      questionCount: totalQuestions,
      mathCount: mathCount,
      readingCount: readingCount,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      includeCharts: config.includeCharts,
      includePassages: config.includePassages,
      ...(config.topicId && { topicId: config.topicId }),
      ...(config.subtopicId && { subtopicId: config.subtopicId }),
      ...(config.moduleType && { moduleType: config.moduleType }),
      ...(config.difficulty && { difficulty: config.difficulty })
    };
    
    console.log(`🔄 Generating ${totalQuestions} questions (Math: ${mathCount}, Reading: ${readingCount})...`);
    
    const result = await generateQuestions(requestBody);
    
    if (result.success) {
      stats.successfulBatches++;
      const data = result.data;
      
      if (data.summary) {
        stats.totalGenerated += data.summary.generated || 0;
        stats.totalEvaluated += data.summary.evaluated || 0;
        stats.totalAccepted += data.summary.accepted || 0;
        stats.totalRejected += data.summary.rejected || 0;
        stats.totalStored += data.summary.stored || 0;
        stats.totalNeedsReview += data.summary.needsReview || 0;
        
        console.log('\n✅ Batch completed successfully!');
        console.log(`   Generated: ${data.summary.generated}`);
        console.log(`   Evaluated: ${data.summary.evaluated}`);
        console.log(`   Accepted: ${data.summary.accepted}`);
        console.log(`   Rejected: ${data.summary.rejected}`);
        console.log(`   Stored: ${data.summary.stored}`);
        console.log(`   Needs Review: ${data.summary.needsReview}`);
      }
      
      const batchDuration = Date.now() - batchStartTime;
      console.log(`   Duration: ${formatDuration(batchDuration)}`);
      
    } else {
      stats.failedBatches++;
      stats.errors.push(`Batch ${i}: ${result.error}`);
      console.log(`\n❌ Batch failed: ${result.error}`);
    }
    
    // Wait between batches (except after the last batch)
    if (i < config.batchCount) {
      const waitSeconds = config.delayBetweenBatches / 1000;
      console.log(`\n⏳ Waiting ${waitSeconds}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
    }
  }
  
  // Print final summary
  const totalDuration = Date.now() - startTime;
  
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('🎉 BATCH GENERATION COMPLETE!');
  console.log(`${'='.repeat(80)}\n`);
  
  console.log('📊 Final Statistics:');
  console.log(`   Total Batches: ${stats.totalBatches}`);
  console.log(`   Successful: ${stats.successfulBatches} ✅`);
  console.log(`   Failed: ${stats.failedBatches} ❌`);
  console.log();
  console.log(`   Questions Generated: ${stats.totalGenerated}`);
  console.log(`   Questions Evaluated: ${stats.totalEvaluated}`);
  console.log(`   Questions Accepted: ${stats.totalAccepted}`);
  console.log(`   Questions Rejected: ${stats.totalRejected}`);
  console.log(`   Questions Stored: ${stats.totalStored}`);
  console.log(`   Questions Needing Review: ${stats.totalNeedsReview}`);
  
  if (stats.totalGenerated > 0) {
    const acceptanceRate = ((stats.totalAccepted / stats.totalGenerated) * 100).toFixed(1);
    const storageRate = ((stats.totalStored / stats.totalAccepted) * 100).toFixed(1);
    console.log();
    console.log(`   Acceptance Rate: ${acceptanceRate}%`);
    console.log(`   Storage Success Rate: ${storageRate}%`);
  }
  
  console.log();
  console.log(`   Total Duration: ${formatDuration(totalDuration)}`);
  
  if (stats.totalStored > 0) {
    const avgTimePerQuestion = Math.round(totalDuration / stats.totalStored);
    console.log(`   Average Time Per Stored Question: ${formatDuration(avgTimePerQuestion)}`);
  }
  
  // Print errors if any
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Print warnings
  if (stats.totalNeedsReview > 0) {
    console.log('\n⚠️  Warning: Some questions need manual review!');
    console.log(`   ${stats.totalNeedsReview} questions were flagged for review.`);
    console.log('   Review them at: /admin/questions?reviewStatus=pending');
  }
  
  console.log();
  
  // Exit with appropriate code
  if (stats.failedBatches > 0) {
    console.log('❌ Generation completed with errors');
    process.exit(1);
  } else {
    console.log('✅ Generation completed successfully');
    process.exit(0);
  }
}

// Handle errors and interruptions
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Generation interrupted by user');
  process.exit(130);
});

// Run the generation
runBatchGeneration().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
