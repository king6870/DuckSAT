// Seed script for SAT topics and subtopics
import { PrismaClient } from '@prisma/client'
import { SAT_TOPICS } from '../src/data/sat-topics'

const prisma = new PrismaClient()

async function seedTopicsAndSubtopics() {
  console.log('🌱 Seeding SAT topics and subtopics...')

  try {
    // Clear existing topics and subtopics (optional - be careful in production)
    console.log('Clearing existing topics and subtopics...')
    await prisma.question.updateMany({
      data: { subtopicId: null }
    })
    await prisma.subtopic.deleteMany()
    await prisma.topic.deleteMany()

    // Seed topics and subtopics
    for (const topicData of SAT_TOPICS) {
      console.log(`Creating topic: ${topicData.name} (${topicData.moduleType})`)
      
      const topic = await prisma.topic.create({
        data: {
          name: topicData.name,
          moduleType: topicData.moduleType,
          description: topicData.description,
          isActive: true
        }
      })

      // Create subtopics for this topic
      for (const subtopicData of topicData.subtopics) {
        console.log(`  Creating subtopic: ${subtopicData.name}`)
        
        await prisma.subtopic.create({
          data: {
            topicId: topic.id,
            name: subtopicData.name,
            description: subtopicData.description,
            targetQuestions: subtopicData.targetQuestions,
            currentCount: 0,
            isActive: true
          }
        })
      }
    }

    console.log('✅ Topics and subtopics seeded successfully!')
    
    // Print summary
    const topicCount = await prisma.topic.count()
    const subtopicCount = await prisma.subtopic.count()
    const totalTargetQuestions = await prisma.subtopic.aggregate({
      _sum: { targetQuestions: true }
    })
    
    console.log(`📊 Summary:`)
    console.log(`   Topics created: ${topicCount}`)
    console.log(`   Subtopics created: ${subtopicCount}`)
    console.log(`   Total target questions: ${totalTargetQuestions._sum.targetQuestions}`)
    
    // Print breakdown by module
    const readingWritingTopics = await prisma.topic.count({
      where: { moduleType: 'reading-writing' }
    })
    const mathTopics = await prisma.topic.count({
      where: { moduleType: 'math' }
    })
    
    const readingWritingSubtopics = await prisma.subtopic.count({
      where: { topic: { moduleType: 'reading-writing' } }
    })
    const mathSubtopics = await prisma.subtopic.count({
      where: { topic: { moduleType: 'math' } }
    })
    
    console.log(`   Reading & Writing: ${readingWritingTopics} topics, ${readingWritingSubtopics} subtopics`)
    console.log(`   Math: ${mathTopics} topics, ${mathSubtopics} subtopics`)

    // Show detailed breakdown
    console.log('\n📋 Detailed Breakdown:')
    const topicsWithSubtopics = await prisma.topic.findMany({
      include: {
        subtopics: true
      },
      orderBy: { moduleType: 'asc' }
    })

    for (const topic of topicsWithSubtopics) {
      console.log(`\n${topic.name} (${topic.moduleType}):`)
      for (const subtopic of topic.subtopics) {
        console.log(`  - ${subtopic.name} (target: ${subtopic.targetQuestions} questions)`)
      }
    }

  } catch (error) {
    console.error('❌ Error seeding topics and subtopics:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedTopicsAndSubtopics()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedTopicsAndSubtopics }
