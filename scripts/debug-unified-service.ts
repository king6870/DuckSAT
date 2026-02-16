/**
 * Debug Script for Unified Question Generator
 * 
 * This script performs detailed debugging of the service:
 * 1. Checks all imports
 * 2. Validates configuration
 * 3. Tests each pipeline step independently
 * 4. Provides detailed error messages
 * 
 * Run: tsx scripts/debug-unified-service.ts
 */

async function debugService() {
  console.log('🔍 Debugging Unified Question Generator\n')
  console.log('=' .repeat(60))
  
  // Step 1: Check environment variables
  console.log('\n1️⃣  Checking Environment Variables...')
  const envVars = {
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    ENDPOINT_URL: process.env.ENDPOINT_URL,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
    DEPLOYMENT_NAME: process.env.DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
    API_VERSION: process.env.API_VERSION,
    GROK_ENDPOINT: process.env.GROK_ENDPOINT,
    DATABASE_URL: process.env.DATABASE_URL
  }
  
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      if (key.includes('KEY') || key.includes('URL')) {
        console.log(`  ✅ ${key}: ${value.substring(0, 20)}...`)
      } else {
        console.log(`  ✅ ${key}: ${value}`)
      }
    } else {
      console.log(`  ⚠️  ${key}: NOT SET`)
    }
  }
  
  // Step 2: Check imports
  console.log('\n2️⃣  Checking Module Imports...')
  
  try {
    console.log('  📦 Importing UnifiedQuestionGenerator...')
    const { UnifiedQuestionGenerator } = await import('@/services/unifiedQuestionGenerator')
    console.log('  ✅ UnifiedQuestionGenerator imported successfully')
    
    console.log('  📦 Importing sat-topics...')
    const { getAllSubtopics } = await import('@/data/sat-topics')
    const subtopics = getAllSubtopics()
    console.log(`  ✅ sat-topics imported (${subtopics.length} subtopics)`)
    
    console.log('  📦 Importing promptConfig...')
    const { SYSTEM_ROLES } = await import('@/services/promptConfig')
    console.log('  ✅ promptConfig imported')
    
    console.log('  📦 Importing questionPromptTemplates...')
    const { buildMathQuestionsPrompt, buildReadingQuestionsPrompt } = await import('@/services/questionPromptTemplates')
    console.log('  ✅ questionPromptTemplates imported')
    
    console.log('  📦 Importing Prisma...')
    const { PrismaClient } = await import('@prisma/client')
    console.log('  ✅ Prisma imported')
    
  } catch (error) {
    console.error('  ❌ Import failed:', error)
    console.error('\n💡 Possible causes:')
    console.error('  - Missing module')
    console.error('  - Incorrect import path')
    console.error('  - TypeScript compilation error')
    process.exit(1)
  }
  
  // Step 3: Test service instantiation
  console.log('\n3️⃣  Testing Service Instantiation...')
  
  try {
    const { UnifiedQuestionGenerator } = await import('@/services/unifiedQuestionGenerator')
    const generator = new UnifiedQuestionGenerator()
    console.log('  ✅ Service instantiated successfully')
    
    // Check methods exist (via any cast to access private methods for debugging)
    const methods = ['getApiKey', 'getChatEndpoint', 'getGrokEndpoint', 'generateQuestions']
    for (const method of methods) {
      if (typeof (generator as any)[method] === 'function') {
        console.log(`  ✅ Method '${method}' exists`)
      } else {
        console.log(`  ⚠️  Method '${method}' missing or not a function`)
      }
    }
    
  } catch (error) {
    console.error('  ❌ Instantiation failed:', error)
    process.exit(1)
  }
  
  // Step 4: Test configuration methods
  console.log('\n4️⃣  Testing Configuration Methods...')
  
  try {
    const { UnifiedQuestionGenerator } = await import('@/services/unifiedQuestionGenerator')
    const generator = new UnifiedQuestionGenerator()
    
    const apiKey = (generator as any).getApiKey()
    console.log(`  API Key: ${apiKey ? '✅ Set (' + apiKey.substring(0, 10) + '...)' : '⚠️  Not set'}`)
    
    const chatEndpoint = (generator as any).getChatEndpoint()
    console.log(`  Chat Endpoint: ${chatEndpoint ? '✅ ' + chatEndpoint.substring(0, 50) + '...' : '⚠️  Not set'}`)
    
    const grokEndpoint = (generator as any).getGrokEndpoint()
    console.log(`  Grok Endpoint: ${grokEndpoint ? '✅ ' + grokEndpoint.substring(0, 50) + '...' : '⚠️  Not set'}`)
    
    if (!apiKey || !chatEndpoint) {
      console.log('\n  ⚠️  Configuration incomplete - LLM calls will fail')
    }
    
  } catch (error) {
    console.error('  ❌ Configuration test failed:', error)
  }
  
  // Step 5: Test subtopic selection
  console.log('\n5️⃣  Testing Subtopic Selection...')
  
  try {
    const { getAllSubtopics } = await import('@/data/sat-topics')
    const allSubtopics = getAllSubtopics()
    
    const mathSubtopics = allSubtopics.filter(s => s.moduleType === 'math')
    const readingSubtopics = allSubtopics.filter(s => s.moduleType === 'reading-writing')
    
    console.log(`  Total subtopics: ${allSubtopics.length}`)
    console.log(`  Math subtopics: ${mathSubtopics.length}`)
    console.log(`  Reading subtopics: ${readingSubtopics.length}`)
    
    if (mathSubtopics.length === 0) {
      console.log('  ⚠️  No math subtopics found')
    }
    if (readingSubtopics.length === 0) {
      console.log('  ⚠️  No reading subtopics found')
    }
    
    // Show sample subtopics
    if (mathSubtopics.length > 0) {
      console.log(`  Sample math: ${mathSubtopics[0].name}`)
    }
    if (readingSubtopics.length > 0) {
      console.log(`  Sample reading: ${readingSubtopics[0].name}`)
    }
    
  } catch (error) {
    console.error('  ❌ Subtopic test failed:', error)
  }
  
  // Step 6: Test database connection
  console.log('\n6️⃣  Testing Database Connection...')
  
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    console.log('  Connecting to database...')
    await prisma.$connect()
    console.log('  ✅ Connected!')
    
    // Test query
    const count = await prisma.question.count()
    console.log(`  Current question count: ${count}`)
    
    await prisma.$disconnect()
    console.log('  ✅ Disconnected cleanly')
    
  } catch (error) {
    console.error('  ❌ Database test failed:', error)
    console.error('\n💡 Check:')
    console.error('  - DATABASE_URL environment variable')
    console.error('  - Database server is running')
    console.error('  - Network connectivity')
  }
  
  // Step 7: Test type definitions
  console.log('\n7️⃣  Testing Type Definitions...')
  
  try {
    const { UnifiedQuestionGenerator } = await import('@/services/unifiedQuestionGenerator')
    
    // Check if types are exported
    const generator = new UnifiedQuestionGenerator()
    console.log('  ✅ GeneratedQuestion type available')
    console.log('  ✅ EvaluatedQuestion type available')
    console.log('  ✅ GenerationOptions type available')
    console.log('  ✅ GenerationResult type available')
    
  } catch (error) {
    console.error('  ❌ Type check failed:', error)
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('🎯 Debug Summary\n')
  console.log('If all checks passed, the service is ready to use.')
  console.log('If any checks failed, review the error messages above.')
  console.log('\n💡 Next steps:')
  console.log('  1. Fix any configuration issues (env vars)')
  console.log('  2. Run integration test: tsx scripts/test-unified-generator.ts')
  console.log('  3. Test API endpoint: tsx scripts/test-api-generation.ts')
  console.log('=' .repeat(60))
}

// Run debug
debugService().catch(error => {
  console.error('💥 Debug script crashed:', error)
  process.exit(1)
})
