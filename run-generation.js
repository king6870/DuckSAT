async function runGeneration() {
  console.log('🚀 Starting question generation...');
  
  // Test server connection first
  try {
    const testResponse = await fetch('http://localhost:3000/api/admin/questions');
    if (!testResponse.ok) {
      console.log('❌ Server not responding. Please start the dev server with: npm run dev');
      return;
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Cannot connect to server. Please start with: npm run dev');
    return;
  }
  
  let totalGenerated = 0;
  let totalAccepted = 0;
  
  // Run 10 generations to start
  for (let i = 1; i <= 10; i++) {
    console.log(`\n🔄 Generation ${i}/10...`);
    
    try {
      const response = await fetch('http://localhost:3000/api/admin/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Generated: ${result.generated || 0}, Accepted: ${result.accepted || 0}`);
        totalGenerated += result.generated || 0;
        totalAccepted += result.accepted || 0;
      } else {
        const error = await response.text();
        console.log(`❌ Failed: ${response.status} - ${error.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Wait 15 seconds between generations
    if (i < 10) {
      console.log('⏳ Waiting 15 seconds...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  console.log(`\n🎉 Completed! Generated: ${totalGenerated}, Accepted: ${totalAccepted}`);
}

// Add fetch if not available
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

runGeneration().catch(console.error);
