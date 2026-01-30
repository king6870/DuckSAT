import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.question.count()
  const math = await prisma.question.count({ where: { moduleType: 'math' } })
  const reading = await prisma.question.count({ where: { moduleType: 'reading-writing' } })
  const dummy = await prisma.question.count({ where: { tags: { has: 'DUMMY_QUESTION_REMOVABLE' } } })
  
  console.log('📊 Database Stats:')
  console.log('  Total Questions:', total)
  console.log('  Math:', math)
  console.log('  Reading:', reading)
  console.log('  Dummy (removable):', dummy)
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
