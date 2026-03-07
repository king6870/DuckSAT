import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const latest = await prisma.question.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      moduleType: true,
      subtopic: true,
      subtopicId: true
    }
  })

  console.log(JSON.stringify(latest, null, 2))
  await prisma.$disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
