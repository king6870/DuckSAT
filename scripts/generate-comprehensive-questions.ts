import { PrismaClient } from '@prisma/client'
import { getAllSubtopics } from '../src/data/sat-topics'
import { aiQuestionService } from '../src/services/aiQuestionService'

const prisma = new PrismaClient()

async function generateComprehensiveQuestions() {
  console.log('🚀 Starting comprehensive SAT question generation...')
  console.log('📊 Target: 100 questions per subtopic across 32 subtopics = 3,200 total questions')
  
  try {
    const allSubtopics = getAllSubtopics()
    console.log(`📝 Found ${allSubtopics.length} subtopics to process`)
    
    let totalGenerated = 0
    let totalAccepted = 0
    
    for (let i = 0; i < allSubtopics.length; i++) {
      const subtopic = allSubtopics[i]
      console.log(`\n🎯 Processing subtopic ${i + 1}/${allSubtopics.length}: ${subtopic.name}`)
      console.log(`📋 Module: ${subtopic.moduleType} | Target: ${subtopic.targetQuestions} questions`)
      
      // Check existing questions for this subtopic
      const existingCount = await prisma.question.count({
        where: {
          subtopic: subtopic.name,
          isActive: true
        }
      })
      
      const needed = subtopic.targetQuestions - existingCount
      console.log(`📈 Existing: ${existingCount} | Needed: ${needed}`)
      
      if (needed <= 0) {
        console.log('✅ Subtopic already has enough questions, skipping...')
        continue
      }
      
      // Generate questions in batches of 10 to avoid overwhelming the API
      const batchSize = 10
      const batches = Math.ceil(needed / batchSize)
      
      for (let batch = 1; batch <= batches; batch++) {
        const questionsInBatch = Math.min(batchSize, needed - ((batch - 1) * batchSize))
        console.log(`\n🔄 Batch ${batch}/${batches}: Generating ${questionsInBatch} questions...`)
        
        try {
          // Use your existing AI service to generate questions for this specific subtopic
          const result = await aiQuestionService.generateQuestionsForSubtopic(
            subtopic,
            questionsInBatch
          )
          
          console.log(`✅ Generated: ${result.generated} | Accepted: ${result.accepted} | Rejected: ${result.rejected}`)
          
          totalGenerated += result.generated
          totalAccepted += result.accepted
          
          // Add delay between batches to respect API limits
          if (batch < batches) {
            console.log('⏳ Waiting 30 seconds before next batch...')
            await new Promise(resolve => setTimeout(resolve, 30000))
          }
          
        } catch (error) {
          console.error(`❌ Batch ${batch} failed:`, error)
          console.log('⏳ Waiting 60 seconds before retrying...')
          await new Promise(resolve => setTimeout(resolve, 60000))
          
          // Retry the batch once
          try {
            const result = await aiQuestionService.generateQuestionsForSubtopic(
              subtopic,
              questionsInBatch
            )
            console.log(`✅ Retry successful: ${result.generated} | Accepted: ${result.accepted}`)
            totalGenerated += result.generated
            totalAccepted += result.accepted
          } catch (retryError) {
            console.error(`❌ Retry failed for batch ${batch}:`, retryError)
          }
        }
      }
      
      // Progress update
      const progress = ((i + 1) / allSubtopics.length * 100).toFixed(1)
      console.log(`\n📊 Overall Progress: ${progress}% (${i + 1}/${allSubtopics.length} subtopics)`)
      console.log(`📈 Total Generated: ${totalGenerated} | Total Accepted: ${totalAccepted}`)
      
      // Longer delay between subtopics
      if (i < allSubtopics.length - 1) {
        console.log('⏳ Waiting 2 minutes before next subtopic...')
        await new Promise(resolve => setTimeout(resolve, 120000))
      }
    }
    
    // Final summary
    console.log('\n🎉 COMPREHENSIVE GENERATION COMPLETE!')
    console.log('=' .repeat(50))
    console.log(`📊 Final Statistics:`)
    console.log(`   • Subtopics Processed: ${allSubtopics.length}`)
    console.log(`   • Total Questions Generated: ${totalGenerated}`)
    console.log(`   • Total Questions Accepted: ${totalAccepted}`)
    console.log(`   • Acceptance Rate: ${((totalAccepted / totalGenerated) * 100).toFixed(1)}%`)
    
    // Database summary
    const finalCount = await prisma.question.count({ where: { isActive: true } })
    console.log(`   • Total Questions in Database: ${finalCount}`)
    console.log(`   • Target Achievement: ${((finalCount / 3200) * 100).toFixed(1)}%`)
    
    // Breakdown by module
    const mathCount = await prisma.question.count({ 
      where: { moduleType: 'math', isActive: true } 
    })
    const readingCount = await prisma.question.count({ 
      where: { moduleType: 'reading-writing', isActive: true } 
    })
    
    console.log(`\n📚 Module Breakdown:`)
    console.log(`   • Math Questions: ${mathCount}`)
    console.log(`   • Reading/Writing Questions: ${readingCount}`)
    
  } catch (error) {
    console.error('❌ Comprehensive generation failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the generation
generateComprehensiveQuestions()
  .then(() => {
    console.log('🏁 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
