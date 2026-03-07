/**
 * Test Practice Tests API Endpoints
 * Verifies that API routes return correct data
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing Practice Tests API Endpoints\n');

  try {
    // Test 1: List all practice tests
    console.log('1️⃣  GET /api/practice-tests');
    const listResponse = await fetch(`${BASE_URL}/api/practice-tests`);
    
    if (!listResponse.ok) {
      console.log(`   ❌ Failed: ${listResponse.status} ${listResponse.statusText}`);
      return;
    }

    const response = await listResponse.json();
    const tests = response.tests || [];
    console.log(`   ✅ Success: Found ${tests.length} tests`);
    tests.forEach((test: any) => {
      console.log(`      - ${test.name} (${test.questionCount} questions)`);
    });
    console.log('');

    // Test 2: Fetch Practice Test 1 details
    if (tests.length > 0) {
      const firstTestId = tests[0].id;
      console.log(`2️⃣  GET /api/practice-tests/${firstTestId}`);
      
      const detailResponse = await fetch(`${BASE_URL}/api/practice-tests/${firstTestId}`);
      
      if (!detailResponse.ok) {
        console.log(`   ❌ Failed: ${detailResponse.status} ${detailResponse.statusText}`);
        return;
      }

      const testDetail = await detailResponse.json();
      console.log(`   ✅ Success: ${testDetail.name}`);
      console.log(`      Modules: ${testDetail.modules.length}`);
      testDetail.modules.forEach((mod: any, idx: number) => {
        console.log(`        Module ${idx}: ${mod.name} (${mod.questions.length} questions, ${mod.timeLimit}m)`);
      });
      console.log('');

      // Test 3: Verify question order is preserved
      console.log('3️⃣  Verifying question order consistency');
      const secondFetch = await fetch(`${BASE_URL}/api/practice-tests/${firstTestId}`);
      const secondDetail = await secondFetch.json();

      let orderPreserved = true;
      for (let m = 0; m < testDetail.modules.length; m++) {
        const module1 = testDetail.modules[m];
        const module2 = secondDetail.modules[m];
        
        if (module1.questions.length !== module2.questions.length) {
          orderPreserved = false;
          break;
        }

        for (let q = 0; q < module1.questions.length; q++) {
          if (module1.questions[q].id !== module2.questions[q].id) {
            orderPreserved = false;
            break;
          }
        }
      }

      if (orderPreserved) {
        console.log('   ✅ Question order is consistent (fixed test behavior)');
      } else {
        console.log('   ❌ Question order changed between fetches (should be fixed!)');
      }
      console.log('');
    }

    console.log('✅ All API endpoint tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    
    if (error.cause?.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Make sure dev server is running: npm run dev');
    }
  }
}

testEndpoints();
