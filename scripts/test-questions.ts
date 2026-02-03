import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testQuestions() {
  console.log('🔍 Testing database questions...\n')

  // Count total questions
  const totalQuestions = await prisma.question.count()
  console.log(`Total questions: ${totalQuestions}`)

  // Count by module type
  const mathCount = await prisma.question.count({ where: { moduleType: 'math' } })
  const readingCount = await prisma.question.count({ where: { moduleType: 'reading-writing' } })
  console.log(`Math questions: ${mathCount}`)
  console.log(`Reading/Writing questions: ${readingCount}\n`)

  // Get a sample math question
  const mathQuestion = await prisma.question.findFirst({
    where: { moduleType: 'math' }
  })
  
  if (mathQuestion) {
    console.log('📊 Sample Math Question:')
    console.log(`Category: ${mathQuestion.category}`)
    console.log(`Subtopic: ${mathQuestion.subtopic}`)
    console.log(`Question: ${mathQuestion.question}`)
    console.log(`Options: ${JSON.stringify(mathQuestion.options)}`)
    console.log(`Correct Answer: ${mathQuestion.correctAnswer}`)
    console.log(`Has Passage: ${mathQuestion.passage ? 'Yes (ERROR!)' : 'No (Correct!)'}`)
    console.log()
  }

  // Get a sample reading question
  const readingQuestion = await prisma.question.findFirst({
    where: { moduleType: 'reading-writing' }
  })
  
  if (readingQuestion) {
    console.log('📖 Sample Reading Question:')
    console.log(`Category: ${readingQuestion.category}`)
    console.log(`Subtopic: ${readingQuestion.subtopic}`)
    console.log(`Question: ${readingQuestion.question}`)
    console.log(`Options: ${JSON.stringify(readingQuestion.options)}`)
    console.log(`Correct Answer: ${readingQuestion.correctAnswer}`)
    console.log(`Has Passage: ${readingQuestion.passage ? 'Yes (Correct!)' : 'No (ERROR!)'}`)
    console.log(`Passage Length: ${readingQuestion.passage?.length || 0} chars`)
    console.log()
  }

  // Check for any issues
  console.log('🔎 Checking for issues...')
  
  const mathWithPassage = await prisma.question.count({
    where: { 
      moduleType: 'math',
      passage: { not: null }
    }
  })
  
  const readingWithoutPassage = await prisma.question.count({
    where: { 
      moduleType: 'reading-writing',
      passage: null
    }
  })
  
  if (mathWithPassage > 0) {
    console.log(`⚠️ WARNING: ${mathWithPassage} math questions have passages (should be null)`)
  } else {
    console.log('✅ All math questions have no passages')
  }
  
  if (readingWithoutPassage > 0) {
    console.log(`⚠️ WARNING: ${readingWithoutPassage} reading questions missing passages`)
  } else {
    console.log('✅ All reading questions have passages')
  }
  
  console.log('\n✅ Database test complete!')
}

testQuestions()
  .catch((e) => {
    console.error('❌ Error testing questions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
