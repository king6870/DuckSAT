import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.question.count({ where: { isActive: true } })
  const rw = await prisma.question.count({ where: { isActive: true, moduleType: 'reading-writing' } })
  const math = await prisma.question.count({ where: { isActive: true, moduleType: 'math' } })
  const reserved = await prisma.question.count({ where: { isActive: true, isReserved: true } })
  const unreservedRw = await prisma.question.count({ where: { isActive: true, isReserved: false, moduleType: 'reading-writing' } })
  const unreservedMath = await prisma.question.count({ where: { isActive: true, isReserved: false, moduleType: 'math' } })

  const byDifficulty = await prisma.question.groupBy({
    by: ['moduleType', 'difficulty'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { moduleType: 'asc' }
  })

  const tests = await prisma.practiceTest.findMany({
    include: { _count: { select: { questions: true } } }
  })

  console.log(JSON.stringify({
    total, rw, math, reserved,
    unreservedRw, unreservedMath,
    byDifficulty: byDifficulty.map(d => ({ module: d.moduleType, difficulty: d.difficulty, count: d._count.id })),
    tests: tests.map(t => ({ id: t.id, name: t.name, published: t.isPublished, questions: t._count.questions }))
  }, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
