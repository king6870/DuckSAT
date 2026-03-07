import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const tests = await prisma.practiceTest.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      name: true,
      questions: {
        select: {
          moduleIndex: true,
          question: {
            select: {
              moduleType: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const expectedModuleIndexes = [0, 1, 2, 3]
  const expectedModuleTypes: Record<number, 'reading-writing' | 'math'> = {
    0: 'reading-writing',
    1: 'reading-writing',
    2: 'math',
    3: 'math',
  }

  for (const test of tests) {
    const moduleCounts = new Map<number, number>()
    const issues: string[] = []

    for (const assignment of test.questions) {
      moduleCounts.set(assignment.moduleIndex, (moduleCounts.get(assignment.moduleIndex) || 0) + 1)

      if (!expectedModuleIndexes.includes(assignment.moduleIndex)) {
        issues.push(`Unexpected module index ${assignment.moduleIndex}`)
        continue
      }

      const expectedType = expectedModuleTypes[assignment.moduleIndex]
      if (assignment.question.moduleType !== expectedType) {
        issues.push(`Module ${assignment.moduleIndex} expects ${expectedType} but found ${assignment.question.moduleType}`)
      }
    }

    for (const index of expectedModuleIndexes) {
      if (!moduleCounts.has(index) || (moduleCounts.get(index) || 0) === 0) {
        issues.push(`Module ${index} missing or empty`)
      }
    }

    console.log(`\n${test.name} (${test.id})`)
    console.log(`moduleCounts=${JSON.stringify(Object.fromEntries([...moduleCounts.entries()].sort((a, b) => a[0] - b[0])))}`)
    if (issues.length > 0) {
      console.log('status=BLOCKED')
      for (const issue of issues) {
        console.log(`- ${issue}`)
      }
    } else {
      console.log('status=READY')
    }
  }

  await prisma.$disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
