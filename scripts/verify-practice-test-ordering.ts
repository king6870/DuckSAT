import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tests = await prisma.practiceTest.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' }
  })

  if (tests.length === 0) {
    console.log('[verify-order] No practice tests found.')
    return
  }

  let totalViolations = 0

  for (const test of tests) {
    const rows = await prisma.practiceTestQuestion.findMany({
      where: { practiceTestId: test.id },
      select: {
        id: true,
        moduleIndex: true,
        orderIndex: true,
        question: { select: { moduleType: true } },
      },
      orderBy: { orderIndex: 'asc' }
    })

    const expectedTypeByModule: Record<number, 'reading-writing' | 'math'> = {
      0: 'reading-writing',
      1: 'reading-writing',
      2: 'math',
      3: 'math',
    }

    const moduleTypeViolations = rows.filter(
      row => expectedTypeByModule[row.moduleIndex] && expectedTypeByModule[row.moduleIndex] !== row.question.moduleType
    )

    let previousOrderIndex = -1
    const orderIndexViolations = rows.filter((row) => {
      const violated = row.orderIndex <= previousOrderIndex
      previousOrderIndex = row.orderIndex
      return violated
    })

    let previousModuleIndex = -1
    const moduleSequenceViolations = rows.filter((row) => {
      const violated = row.moduleIndex < previousModuleIndex
      previousModuleIndex = row.moduleIndex
      return violated
    })

    const violations = moduleTypeViolations.length + orderIndexViolations.length + moduleSequenceViolations.length
    totalViolations += violations

    const moduleCounts = rows.reduce<Record<number, number>>((acc, row) => {
      acc[row.moduleIndex] = (acc[row.moduleIndex] || 0) + 1
      return acc
    }, {})

    console.log(`[verify-order] ${test.name}: rows=${rows.length} moduleCounts=${JSON.stringify(moduleCounts)} violations=${violations}`)

    if (moduleTypeViolations.length > 0) {
      console.error(`[verify-order] ${test.name}: moduleTypeViolations=${moduleTypeViolations.length}`)
    }
    if (orderIndexViolations.length > 0) {
      console.error(`[verify-order] ${test.name}: orderIndexViolations=${orderIndexViolations.length}`)
    }
    if (moduleSequenceViolations.length > 0) {
      console.error(`[verify-order] ${test.name}: moduleSequenceViolations=${moduleSequenceViolations.length}`)
    }
  }

  if (totalViolations > 0) {
    throw new Error(`[verify-order] FAILED with ${totalViolations} ordering violations`)
  }

  console.log('[verify-order] PASS: Practice test ordering is consistent (reading modules first, then math).')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
