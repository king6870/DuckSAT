import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGETS = {
  readingTotal: 54,
  mathTotal: 44,
  module0: 27,
  module1: 27,
  module2: 22,
  module3: 22,
} as const

async function pickAdditionalQuestionIds(
  moduleType: 'reading-writing' | 'math',
  needed: number,
  excludeQuestionIds: Set<string>
): Promise<string[]> {
  if (needed <= 0) return []

  const pool = await prisma.question.findMany({
    where: {
      moduleType,
      isActive: true,
      isReserved: false,
      id: {
        notIn: [...excludeQuestionIds],
      },
    },
    orderBy: [
      { questionIndex: 'asc' },
      { createdAt: 'asc' },
    ],
    select: { id: true },
    take: needed,
  })

  return pool.map((q) => q.id)
}

async function repairPublishedTest(testId: string, name: string): Promise<void> {
  const rows = await prisma.practiceTestQuestion.findMany({
    where: { practiceTestId: testId },
    include: {
      question: {
        select: {
          id: true,
          moduleType: true,
        },
      },
    },
    orderBy: { orderIndex: 'asc' },
  })

  const existingRw = rows.filter((r) => r.question.moduleType === 'reading-writing').map((r) => r.questionId)
  const existingMath = rows.filter((r) => r.question.moduleType === 'math').map((r) => r.questionId)

  const selectedRw = existingRw.slice(0, TARGETS.readingTotal)
  const selectedMath = existingMath.slice(0, TARGETS.mathTotal)

  const excludeForRw = new Set<string>([...rows.map((r) => r.questionId), ...selectedRw, ...selectedMath])
  const addRwNeeded = TARGETS.readingTotal - selectedRw.length
  const additionalRw = await pickAdditionalQuestionIds('reading-writing', addRwNeeded, excludeForRw)

  if (additionalRw.length < addRwNeeded) {
    throw new Error(`[repair-canonical] ${name}: not enough reading-writing questions available (needed ${addRwNeeded}, got ${additionalRw.length})`)
  }

  const excludeForMath = new Set<string>([
    ...rows.map((r) => r.questionId),
    ...selectedRw,
    ...selectedMath,
    ...additionalRw,
  ])
  const addMathNeeded = TARGETS.mathTotal - selectedMath.length
  const additionalMath = await pickAdditionalQuestionIds('math', addMathNeeded, excludeForMath)

  if (additionalMath.length < addMathNeeded) {
    throw new Error(`[repair-canonical] ${name}: not enough math questions available (needed ${addMathNeeded}, got ${additionalMath.length})`)
  }

  const finalRw = [...selectedRw, ...additionalRw]
  const finalMath = [...selectedMath, ...additionalMath]

  const module0 = finalRw.slice(0, TARGETS.module0)
  const module1 = finalRw.slice(TARGETS.module0, TARGETS.module0 + TARGETS.module1)
  const module2 = finalMath.slice(0, TARGETS.module2)
  const module3 = finalMath.slice(TARGETS.module2, TARGETS.module2 + TARGETS.module3)

  const orderedEntries: Array<{ questionId: string; moduleIndex: number; orderIndex: number }> = []
  let orderIndex = 0

  for (const questionId of module0) orderedEntries.push({ questionId, moduleIndex: 0, orderIndex: orderIndex++ })
  for (const questionId of module1) orderedEntries.push({ questionId, moduleIndex: 1, orderIndex: orderIndex++ })
  for (const questionId of module2) orderedEntries.push({ questionId, moduleIndex: 2, orderIndex: orderIndex++ })
  for (const questionId of module3) orderedEntries.push({ questionId, moduleIndex: 3, orderIndex: orderIndex++ })

  await prisma.$transaction(async (tx) => {
    await tx.practiceTestQuestion.deleteMany({
      where: { practiceTestId: testId },
    })

    await tx.practiceTestQuestion.createMany({
      data: orderedEntries.map((entry) => ({
        practiceTestId: testId,
        questionId: entry.questionId,
        moduleIndex: entry.moduleIndex,
        orderIndex: entry.orderIndex,
      })),
    })
  })

  console.log(`[repair-canonical] ${name}: rows=${orderedEntries.length} rw=${finalRw.length} math=${finalMath.length}`)
  console.log(`[repair-canonical] ${name}: moduleCounts={0:${module0.length},1:${module1.length},2:${module2.length},3:${module3.length}}`)
}

async function syncReservedFlagsToPublishedTests() {
  const publishedRows = await prisma.practiceTestQuestion.findMany({
    where: {
      practiceTest: {
        isPublished: true,
      },
    },
    select: {
      questionId: true,
    },
  })

  const publishedQuestionIds = [...new Set(publishedRows.map((row) => row.questionId))]

  await prisma.$transaction(async (tx) => {
    if (publishedQuestionIds.length > 0) {
      await tx.question.updateMany({
        where: { id: { in: publishedQuestionIds } },
        data: { isReserved: true },
      })
    }

    await tx.question.updateMany({
      where: {
        isReserved: true,
        id: {
          notIn: publishedQuestionIds,
        },
      },
      data: { isReserved: false },
    })
  })

  console.log(`[repair-canonical] Reserved flag sync complete. publishedReservedCount=${publishedQuestionIds.length}`)
}

async function main() {
  const publishedTests = await prisma.practiceTest.findMany({
    where: { isPublished: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  if (publishedTests.length === 0) {
    console.log('[repair-canonical] No published practice tests found. Nothing to repair.')
    return
  }

  for (const test of publishedTests) {
    await repairPublishedTest(test.id, test.name)
  }

  await syncReservedFlagsToPublishedTests()
  console.log('[repair-canonical] Completed canonical repair for all published practice tests.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
