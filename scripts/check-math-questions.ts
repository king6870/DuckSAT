import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMathQuestions() {
  try {
    const mathQuestions = await prisma.question.findMany({
      where: { moduleType: 'math' },
      select: {
        id: true,
        category: true,
        difficulty: true,
        question: true,
        chartData: true,
        source: true
      }
    })

    console.log(`📊 Found ${mathQuestions.length} math questions in database`)
    
    if (mathQuestions.length > 0) {
      console.log('\n📋 Sample questions:')
      mathQuestions.slice(0, 5).forEach((q, i) => {
        console.log(`${i + 1}. [${q.difficulty}] ${q.category}`)
        console.log(`   Question: ${q.question.substring(0, 80)}...`)
        console.log(`   Has Chart: ${q.chartData ? '✅' : '❌'}`)
        console.log(`   Source: ${q.source}`)
        console.log('')
      })
    }

    // Check categories
    const categories = await prisma.question.groupBy({
      by: ['category'],
      where: { moduleType: 'math' },
      _count: { category: true }
    })

    console.log('📈 Categories:')
    categories.forEach(cat => {
      console.log(`   ${cat.category}: ${cat._count.category} questions`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMathQuestions()
