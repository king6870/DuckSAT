import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findIssues() {
  console.log('🔍 Finding problematic questions...\n')

  // Find math questions with passages
  const mathWithPassage = await prisma.question.findMany({
    where: { 
      moduleType: 'math',
      passage: { not: null }
    },
    select: {
      id: true,
      question: true,
      passage: true,
      category: true,
      subtopic: true
    }
  })
  
  if (mathWithPassage.length > 0) {
    console.log(`📊 Math questions with passages (${mathWithPassage.length}):`)
    mathWithPassage.forEach((q, i) => {
      console.log(`${i + 1}. [${q.category}/${q.subtopic}] ${q.question.substring(0, 60)}...`)
      console.log(`   Passage: ${q.passage?.substring(0, 80)}...`)
    })
    console.log()
  }
  
  // Find reading questions without passages
  const readingWithoutPassage = await prisma.question.findMany({
    where: { 
      moduleType: 'reading-writing',
      passage: null
    },
    select: {
      id: true,
      question: true,
      category: true,
      subtopic: true
    }
  })
  
  if (readingWithoutPassage.length > 0) {
    console.log(`📖 Reading questions without passages (${readingWithoutPassage.length}):`)
    readingWithoutPassage.forEach((q, i) => {
      console.log(`${i + 1}. [${q.category}/${q.subtopic}] ${q.question.substring(0, 80)}...`)
    })
    console.log()
  }
  
  console.log('✅ Investigation complete!')
}

findIssues()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
