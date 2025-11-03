import { aiQuestionService } from '@/services/aiQuestionService'

async function testImagesAndEvaluation() {
  console.log('🧪 Testing image generation and evaluation...')
  
  try {
    // Generate a few questions with images
    console.log('📊 Generating math questions with images...')
    const questions = await aiQuestionService.generateQuestions()
    
    console.log(`✅ Generated ${questions.length} questions`)
    
    // Check for images and evaluation
    questions.forEach((q, i) => {
      console.log(`\n📝 Question ${i + 1}:`)
      console.log(`   Type: ${q.moduleType}`)
      console.log(`   Subtopic: ${q.subtopic}`)
      console.log(`   Has Chart: ${q.hasChart ? 'YES' : 'NO'}`)
      console.log(`   Has Image: ${q.imageUrl ? 'YES' : 'NO'}`)
      console.log(`   Difficulty: ${q.difficulty}`)
      console.log(`   Quality Score: ${q.qualityScore}`)
      console.log(`   Accepted: ${q.isAccepted ? 'YES' : 'NO'}`)
      console.log(`   Feedback: ${q.evaluationFeedback}`)
      
      if (q.imageUrl) {
        console.log(`   🖼️  Image URL: ${q.imageUrl.substring(0, 50)}...`)
      }
      
      if (q.chartDescription) {
        console.log(`   📊 Chart: ${q.chartDescription.substring(0, 100)}...`)
      }
    })
    
    // Test storing one question
    const acceptedQuestions = questions.filter(q => q.isAccepted)
    if (acceptedQuestions.length > 0) {
      console.log(`\n💾 Testing question storage...`)
      await aiQuestionService.storeQuestion(acceptedQuestions[0])
      console.log('✅ Question stored successfully')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testImagesAndEvaluation()
