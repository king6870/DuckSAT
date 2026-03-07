import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAPI() {
  console.log('🧪 Simulating API question fetch...\n')

  // Simulate fetching math questions
  const mathQuestions = await prisma.question.findMany({
    where: { moduleType: 'math', isActive: true },
    take: 5
  })

  console.log(`📊 Fetched ${mathQuestions.length} math questions:`)
  mathQuestions.forEach((q, i) => {
    console.log(`${i + 1}. [${q.difficulty}] ${q.question.substring(0, 60)}...`)
    console.log(`   ✓ Has options: ${Array.isArray(q.options)}`)
    console.log(`   ✓ Has explanation: ${!!q.explanation}`)
    console.log(`   ✓ No passage: ${q.passage === null}`)
  })
  console.log()

  // Simulate fetching reading questions
  const readingQuestions = await prisma.question.findMany({
    where: { moduleType: 'reading-writing', isActive: true },
    take: 5
  })

  console.log(`📖 Fetched ${readingQuestions.length} reading questions:`)
  readingQuestions.forEach((q, i) => {
    console.log(`${i + 1}. [${q.difficulty}] ${q.question.substring(0, 60)}...`)
    console.log(`   ✓ Has options: ${Array.isArray(q.options)}`)
    console.log(`   ✓ Has explanation: ${!!q.explanation}`)
    console.log(`   ✓ Has passage: ${!!q.passage}`)
    console.log(`   ✓ Passage length: ${q.passage?.length || 0} chars`)
  })
  console.log()

  console.log('✅ API simulation complete! Questions are ready to be served.')
}

testAPI()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
