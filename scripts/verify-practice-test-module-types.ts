import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const expectedTypeByModule: Record<number, 'reading-writing' | 'math'> = {
  0: 'reading-writing',
  1: 'reading-writing',
  2: 'math',
  3: 'math'
}

async function main() {
  const tests = await prisma.practiceTest.findMany({
    select: { id: true, name: true, isPublished: true },
    orderBy: { createdAt: 'asc' }
  })

  if (tests.length === 0) {
    console.log('[verify] No practice tests found.')
    return
  }

  let mismatchCount = 0

  for (const test of tests) {
    const rows = await prisma.practiceTestQuestion.findMany({
      where: { practiceTestId: test.id },
      select: {
        id: true,
        moduleIndex: true,
        orderIndex: true,
        questionId: true,
        question: { select: { moduleType: true } }
      },
      orderBy: [{ orderIndex: 'asc' }]
    })

    const mismatches = rows.filter(
      row => expectedTypeByModule[row.moduleIndex] !== row.question.moduleType
    )

    mismatchCount += mismatches.length

    const moduleCounts = rows.reduce<Record<number, number>>((acc, row) => {
      acc[row.moduleIndex] = (acc[row.moduleIndex] || 0) + 1
      return acc
    }, {})

    console.log(
      `[verify] ${test.name} (${test.id}) published=${test.isPublished} rows=${rows.length} mismatches=${mismatches.length} moduleCounts=${JSON.stringify(moduleCounts)}`
    )

    if (mismatches.length > 0) {
      for (const mismatch of mismatches.slice(0, 10)) {
        console.error(
          `[verify] mismatch ptqId=${mismatch.id} questionId=${mismatch.questionId} moduleIndex=${mismatch.moduleIndex} expected=${expectedTypeByModule[mismatch.moduleIndex]} actual=${mismatch.question.moduleType} orderIndex=${mismatch.orderIndex}`
        )
      }
      if (mismatches.length > 10) {
        console.error(`[verify] ... ${mismatches.length - 10} more mismatches in ${test.name}`)
      }
    }
  }

  if (mismatchCount > 0) {
    throw new Error(`[verify] FAILED: Found ${mismatchCount} practice-test moduleType/moduleIndex mismatches.`)
  }

  console.log('[verify] PASS: No practice-test moduleType/moduleIndex mismatches found.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
