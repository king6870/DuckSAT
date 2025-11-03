import { aiQuestionService } from '@/services/aiQuestionService'
import { getAllSubtopics } from '@/data/sat-topics'
import { prisma } from '@/lib/prisma'

interface GenerationStats {
  subtopic: string
  moduleType: string
  generated: number
  accepted: number
  rejected: number
}

async function generateBulkQuestions() {
  console.log('🚀 Starting bulk question generation for all subtopics...')
  
  const allSubtopics = getAllSubtopics()
  const stats: GenerationStats[] = []
  
  for (const subtopic of allSubtopics) {
    console.log(`\n📚 Generating questions for: ${subtopic.name} (${subtopic.moduleType})`)
    
    // Check existing questions for this subtopic
    const existingCount = await prisma.question.count({
      where: {
        subtopic: subtopic.name,
        moduleType: subtopic.moduleType,
        isActive: true
      }
    })
    
    console.log(`   Existing questions: ${existingCount}`)
    
    const targetQuestions = 100
    const questionsNeeded = Math.max(0, targetQuestions - existingCount)
    
    if (questionsNeeded === 0) {
      console.log(`   ✅ Already has ${existingCount} questions - skipping`)
      continue
    }
    
    console.log(`   🎯 Need to generate: ${questionsNeeded} questions`)
    
    let totalGenerated = 0
    let totalAccepted = 0
    let totalRejected = 0
    
    // Generate in batches of 5 (GPT-5 generates 5 at a time)
    const batches = Math.ceil(questionsNeeded / 5)
    
    for (let batch = 0; batch < batches; batch++) {
      console.log(`   📦 Batch ${batch + 1}/${batches}`)
      
      try {
        // Generate 5 questions for this subtopic
        const questions = await aiQuestionService.generateQuestions()
        
        // Filter questions for this specific subtopic
        const subtopicQuestions = questions.filter(q => 
          q.subtopic === subtopic.name && q.moduleType === subtopic.moduleType
        )
        
        if (subtopicQuestions.length === 0) {
          console.log(`   ⚠️  No questions generated for this subtopic in batch ${batch + 1}`)
          continue
        }
        
        // Evaluate questions
        const evaluatedQuestions = await aiQuestionService.evaluateQuestions(subtopicQuestions)
        
        // Store accepted questions
        const acceptedQuestions = evaluatedQuestions.filter(q => q.isAccepted)
        const rejectedQuestions = evaluatedQuestions.filter(q => !q.isAccepted)
        
        for (const question of acceptedQuestions) {
          await aiQuestionService.storeQuestion(question)
        }
        
        totalGenerated += subtopicQuestions.length
        totalAccepted += acceptedQuestions.length
        totalRejected += rejectedQuestions.length
        
        console.log(`   ✅ Batch ${batch + 1}: Generated ${subtopicQuestions.length}, Accepted ${acceptedQuestions.length}, Rejected ${rejectedQuestions.length}`)
        
        // Stop if we have enough questions
        if (totalAccepted >= questionsNeeded) {
          console.log(`   🎉 Target reached for ${subtopic.name}`)
          break
        }
        
        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`   ❌ Error in batch ${batch + 1}:`, error)
        continue
      }
    }
    
    stats.push({
      subtopic: subtopic.name,
      moduleType: subtopic.moduleType,
      generated: totalGenerated,
      accepted: totalAccepted,
      rejected: totalRejected
    })
    
    console.log(`   📊 Final stats for ${subtopic.name}: Generated ${totalGenerated}, Accepted ${totalAccepted}, Rejected ${totalRejected}`)
  }
  
  // Print final summary
  console.log('\n🎉 BULK GENERATION COMPLETE!')
  console.log('\n📊 FINAL STATISTICS:')
  console.log('=' .repeat(80))
  
  const mathStats = stats.filter(s => s.moduleType === 'math')
  const readingStats = stats.filter(s => s.moduleType === 'reading-writing')
  
  console.log('\n📐 MATH SUBTOPICS:')
  mathStats.forEach(stat => {
    console.log(`   ${stat.subtopic}: ${stat.accepted}/${stat.generated} accepted (${Math.round(stat.accepted/stat.generated*100)}% success rate)`)
  })
  
  console.log('\n📚 READING SUBTOPICS:')
  readingStats.forEach(stat => {
    console.log(`   ${stat.subtopic}: ${stat.accepted}/${stat.generated} accepted (${Math.round(stat.accepted/stat.generated*100)}% success rate)`)
  })
  
  const totalGenerated = stats.reduce((sum, s) => sum + s.generated, 0)
  const totalAccepted = stats.reduce((sum, s) => sum + s.accepted, 0)
  const totalRejected = stats.reduce((sum, s) => sum + s.rejected, 0)
  
  console.log('\n🎯 OVERALL TOTALS:')
  console.log(`   Generated: ${totalGenerated}`)
  console.log(`   Accepted: ${totalAccepted}`)
  console.log(`   Rejected: ${totalRejected}`)
  console.log(`   Success Rate: ${Math.round(totalAccepted/totalGenerated*100)}%`)
  
  // Final database count
  const finalCount = await prisma.question.count({ where: { isActive: true } })
  console.log(`\n📈 Total questions in database: ${finalCount}`)
}

// Run the bulk generation
generateBulkQuestions().catch(console.error)
