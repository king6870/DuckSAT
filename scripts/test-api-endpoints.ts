/**
 * Test script to verify API endpoints return questions correctly
 * Run with: npx tsx scripts/test-api-endpoints.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testEndpoint(name: string, url: string) {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`   ❌ API Error: ${data.error}`);
      return false;
    }
    
    // Handle different response formats
    const questions = data.questions || data.data?.questions || [];
    const count = questions.length;
    
    console.log(`   ✅ Success: ${count} questions returned`);
    
    if (count > 0) {
      const sample = questions[0];
      console.log(`   📝 Sample: ${sample.question?.substring(0, 60)}...`);
      console.log(`   🎯 Has diagram: ${sample.imageData ? 'YES' : 'NO'}`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 API Endpoint Testing\n');
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const tests = [
    {
      name: 'Get all questions (first 10)',
      url: `${API_BASE_URL}/api/questions?limit=10`
    },
    {
      name: 'Get math questions',
      url: `${API_BASE_URL}/api/questions?moduleType=math&limit=10`
    },
    {
      name: 'Get reading questions',
      url: `${API_BASE_URL}/api/questions?moduleType=reading-writing&limit=5`
    },
    {
      name: 'Practice API - Math questions',
      url: `${API_BASE_URL}/api/questions/practice?moduleType=math&count=10`
    },
    {
      name: 'Practice API - Math with geometry visual type',
      url: `${API_BASE_URL}/api/questions/practice?moduleType=math&visualType=geometry&count=5`
    },
    {
      name: 'Practice API - Medium difficulty',
      url: `${API_BASE_URL}/api/questions/practice?moduleType=math&difficulty=medium&count=10`
    },
    {
      name: 'Get v3-test tagged questions',
      url: `${API_BASE_URL}/api/questions?search=v3-test&limit=10`
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url);
    result ? passed++ : failed++;
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All API endpoints working correctly!');
    console.log('   Your questions are accessible on the website.');
  } else {
    console.log('\n⚠️  Some endpoints failed.');
    console.log('   Make sure the development server is running: npm run dev');
  }
}

// Run tests
runTests().catch(console.error);
