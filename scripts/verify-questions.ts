import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyQuestions() {
  try {
    console.log('🔍 Verifying question database...\n')
    
    // Get total counts
    const totalQuestions = await prisma.question.count()
    const mathQuestions = await prisma.question.count({ where: { moduleType: 'math' } })
    const readingQuestions = await prisma.question.count({ where: { moduleType: 'reading-writing' } })
    
    console.log('📊 QUESTION COUNTS:')
    console.log(`   Total: ${totalQuestions}`)
    console.log(`   Math: ${mathQuestions}`)
    console.log(`   Reading/Writing: ${readingQuestions}\n`)
    
    // Math categories
    const mathCategories = await prisma.question.groupBy({
      by: ['category'],
      where: { moduleType: 'math' },
      _count: { category: true }
    })
    
    console.log('🔢 MATH CATEGORIES:')
    mathCategories.forEach(cat => {
      console.log(`   ${cat.category}: ${cat._count.category} questions`)
    })
    
    // Reading categories
    const readingCategories = await prisma.question.groupBy({
      by: ['category'],
      where: { moduleType: 'reading-writing' },
      _count: { category: true }
    })
    
    console.log('\n📚 READING CATEGORIES:')
    readingCategories.forEach(cat => {
      console.log(`   ${cat.category}: ${cat._count.category} questions`)
    })
    
    // Difficulty distribution
    const difficulties = await prisma.question.groupBy({
      by: ['difficulty', 'moduleType'],
      _count: { difficulty: true }
    })
    
    console.log('\n🎯 DIFFICULTY DISTRIBUTION:')
    difficulties.forEach(diff => {
      console.log(`   ${diff.moduleType} - ${diff.difficulty}: ${diff._count.difficulty} questions`)
    })
    
    // Check for geometry/shapes (should be 0)
    const geometryQuestions = await prisma.question.count({
      where: {
        OR: [
          { question: { contains: 'triangle', mode: 'insensitive' } },
          { question: { contains: 'circle', mode: 'insensitive' } },
          { question: { contains: 'angle', mode: 'insensitive' } },
          { question: { contains: 'polygon', mode: 'insensitive' } },
          { question: { contains: 'rectangle', mode: 'insensitive' } },
          { question: { contains: 'square', mode: 'insensitive' } },
          { category: { contains: 'geometry', mode: 'insensitive' } }
        ]
      }
    })
    
    console.log(`\n🚫 GEOMETRY CHECK: ${geometryQuestions} questions contain geometry terms`)
    
    // Sample questions
    console.log('\n📋 SAMPLE MATH QUESTIONS:')
    const sampleMath = await prisma.question.findMany({
      where: { moduleType: 'math' },
      select: { category: true, question: true, difficulty: true },
      take: 3
    })
    
    sampleMath.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.difficulty}] ${q.category}`)
      console.log(`      ${q.question.substring(0, 60)}...`)
    })
    
    console.log('\n📋 SAMPLE READING QUESTIONS:')
    const sampleReading = await prisma.question.findMany({
      where: { moduleType: 'reading-writing' },
      select: { category: true, question: true, difficulty: true },
      take: 3
    })
    
    sampleReading.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.difficulty}] ${q.category}`)
      console.log(`      ${q.question.substring(0, 60)}...`)
    })
    
    console.log('\n✅ Verification complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyQuestions()
