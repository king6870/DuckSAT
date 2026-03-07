import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const tests = await prisma.practiceTest.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      name: true,
      _count: { select: { questions: true } }
    },
    orderBy: { name: 'asc' }
  })

  console.log('Published practice tests:')
  for (const test of tests) {
    const byModule = await prisma.practiceTestQuestion.groupBy({
      by: ['moduleIndex'],
      where: { practiceTestId: test.id },
      _count: { _all: true },
      orderBy: { moduleIndex: 'asc' }
    })

    console.log(`\n${test.name} (${test.id})`)
    console.log(`- linked questions count: ${test._count.questions}`)
    console.log(`- module counts: ${JSON.stringify(byModule)}`)
  }

  await prisma.$disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
