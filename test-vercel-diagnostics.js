// Test Vercel deployment - check what environment variables are visible
// Run this in browser console at https://kiroducksat.vercel.app/admin/question-generation

async function testDiagnostics() {
  console.log('🔍 Testing question generation endpoint...');
  
  try {
    const response = await fetch('/api/admin/enhanced-generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        llmModel: 'gpt-4o',
        questionCount: 1,
        mathCount: 1,
        readingCount: 0,
        temperature: 1,
        maxTokens: 4000,
        includeCharts: false,
        includePassages: false
      })
    });
    
    const data = await response.json();
    console.log('📊 Response:', data);
    
    if (data.diagnostics) {
      console.log('\n🩺 DIAGNOSTICS:');
      console.log('Has Azure API Key:', data.diagnostics.hasAzureApiKey);
      console.log('Has Endpoint URL:', data.diagnostics.hasEndpointUrl);
      console.log('Environment:', data.diagnostics.nodeEnv);
      
      if (!data.diagnostics.hasAzureApiKey) {
        console.error('❌ AZURE_OPENAI_API_KEY is NOT set in Vercel!');
      }
      if (!data.diagnostics.hasEndpointUrl) {
        console.error('❌ ENDPOINT_URL or AZURE_OPENAI_ENDPOINT is NOT set in Vercel!');
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the test
testDiagnostics();
