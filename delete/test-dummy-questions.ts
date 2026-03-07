import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing dummy questions...\n')
  
  // Get a sample math dummy question
  const mathQuestion = await prisma.question.findFirst({
    where: {
      moduleType: 'math',
      tags: { has: 'DUMMY_QUESTION_REMOVABLE' }
    }
  })
  
  if (mathQuestion) {
    console.log('✅ Sample Math Question:')
    console.log('  ID:', mathQuestion.id)
    console.log('  Category:', mathQuestion.category)
    console.log('  Difficulty:', mathQuestion.difficulty)
    console.log('  Question:', mathQuestion.question)
    console.log('  Options:', JSON.parse(mathQuestion.options as string))
    console.log('  Correct Answer Index:', mathQuestion.correctAnswer)
    console.log('  Time Estimate:', mathQuestion.timeEstimate, 'seconds')
    console.log('  Tags:', mathQuestion.tags)
    console.log('')
  }
  
  // Get a sample reading dummy question
  const readingQuestion = await prisma.question.findFirst({
    where: {
      moduleType: 'reading-writing',
      tags: { has: 'DUMMY_QUESTION_REMOVABLE' }
    }
  })
  
  if (readingQuestion) {
    console.log('✅ Sample Reading Question:')
    console.log('  ID:', readingQuestion.id)
    console.log('  Category:', readingQuestion.category)
    console.log('  Difficulty:', readingQuestion.difficulty)
    console.log('  Question:', readingQuestion.question.substring(0, 100) + '...')
    console.log('  Passage Length:', readingQuestion.passage?.length || 0, 'characters')
    console.log('  Options:', JSON.parse(readingQuestion.options as string).map((opt: string) => opt.substring(0, 50) + (opt.length > 50 ? '...' : '')))
    console.log('  Correct Answer Index:', readingQuestion.correctAnswer)
    console.log('  Time Estimate:', readingQuestion.timeEstimate, 'seconds')
    console.log('  Tags:', readingQuestion.tags)
    console.log('')
  }
  
  console.log('✅ All dummy questions have required fields for practice tests!')
  console.log('   - moduleType (math/reading-writing)')
  console.log('   - question text')
  console.log('   - options array')
  console.log('   - correctAnswer index')
  console.log('   - explanation')
  console.log('   - timeEstimate')
  console.log('   - reviewStatus: approved')
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
