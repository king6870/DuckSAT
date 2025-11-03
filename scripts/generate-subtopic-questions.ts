import { aiQuestionService } from '@/services/aiQuestionService'
import { getAllSubtopics } from '@/data/sat-topics'
import { prisma } from '@/lib/prisma'

// Configuration - Edit these to target specific subtopics
const TARGET_SUBTOPICS = [
  'Geometry and Trigonometry',
  'Reading Comprehension', 
  'Algebra',
  'Statistics and Probability'
]

const QUESTIONS_PER_SUBTOPIC = 100

async function generateSubtopicQuestions() {
  console.log('🎯 Starting targeted subtopic question generation...')
  console.log(`📋 Target subtopics: ${TARGET_SUBTOPICS.join(', ')}`)
  console.log(`🎯 Questions per subtopic: ${QUESTIONS_PER_SUBTOPIC}`)
  
  const allSubtopics = getAllSubtopics()
  
  for (const subtopicName of TARGET_SUBTOPICS) {
    console.log(`\n🔍 Processing: ${subtopicName}`)
    
    // Find the subtopic
    const subtopic = allSubtopics.find(s => 
      s.name.includes(subtopicName) || 
      s.topicName.includes(subtopicName)
    )
    
    if (!subtopic) {
      console.log(`   ❌ Subtopic not found: ${subtopicName}`)
      continue
    }
    
    console.log(`   ✅ Found: ${subtopic.name} (${subtopic.moduleType})`)
    
    // Check existing questions
    const existingCount = await prisma.question.count({
      where: {
        subtopic: {
          name: subtopic.name
        },
        isActive: true
      }
    })
    
    console.log(`   📊 Existing questions: ${existingCount}`)
    
    const questionsNeeded = Math.max(0, QUESTIONS_PER_SUBTOPIC - existingCount)
    
    if (questionsNeeded === 0) {
      console.log(`   ✅ Already has enough questions - skipping`)
      continue
    }
    
    console.log(`   🎯 Generating ${questionsNeeded} questions...`)
    
    let generated = 0
    let accepted = 0
    
    // Generate in batches
    const batches = Math.ceil(questionsNeeded / 5)
    
    for (let i = 0; i < batches; i++) {
      console.log(`   📦 Batch ${i + 1}/${batches}`)
      
      try {
        // Create a custom prompt for this specific subtopic
        const customSubtopics = Array(5).fill(subtopic)
        
        // Generate questions using the AI service
        const questions = await aiQuestionService.generateQuestions()
        
        // Filter for this subtopic
        const relevantQuestions = questions.filter(q => 
          q.subtopic === subtopic.name || 
          q.category === subtopic.topicName
        )
        
        if (relevantQuestions.length === 0) {
          console.log(`   ⚠️  No relevant questions in batch ${i + 1}`)
          continue
        }
        
        // Evaluate questions
        const evaluated = await aiQuestionService.evaluateQuestions(relevantQuestions)
        const acceptedQuestions = evaluated.filter(q => q.isAccepted)
        
        // Store accepted questions
        for (const question of acceptedQuestions) {
          await aiQuestionService.storeQuestion(question)
        }
        
        generated += relevantQuestions.length
        accepted += acceptedQuestions.length
        
        console.log(`   ✅ Batch ${i + 1}: ${acceptedQuestions.length}/${relevantQuestions.length} accepted`)
        
        if (accepted >= questionsNeeded) {
          console.log(`   🎉 Target reached!`)
          break
        }
        
        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, 3000))
        
      } catch (error) {
        console.error(`   ❌ Error in batch ${i + 1}:`, error)
      }
    }
    
    console.log(`   📊 Final: ${accepted}/${generated} questions accepted`)
  }
  
  console.log('\n🎉 Targeted generation complete!')
}

// Run if called directly
if (require.main === module) {
  generateSubtopicQuestions().catch(console.error)
}

export { generateSubtopicQuestions }
