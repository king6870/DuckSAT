import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REQUIRED_MODULE_COUNTS: Record<number, number> = {
  0: 27,
  1: 27,
  2: 22,
  3: 22,
}

const REQUIRED_TOTAL = 98

async function main() {
  const tests = await prisma.practiceTest.findMany({
    select: { id: true, name: true, isPublished: true },
    orderBy: { createdAt: 'asc' },
  })

  if (tests.length === 0) {
    console.log('[verify-integrity] No practice tests found.')
    return
  }

  let failures = 0

  for (const test of tests) {
    const rows = await prisma.practiceTestQuestion.findMany({
      where: { practiceTestId: test.id },
      select: {
        moduleIndex: true,
        questionId: true,
      },
    })

    const moduleCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
    const seenQuestionIds = new Set<string>()
    const duplicateQuestionIds = new Set<string>()

    for (const row of rows) {
      moduleCounts[row.moduleIndex] = (moduleCounts[row.moduleIndex] || 0) + 1
      if (seenQuestionIds.has(row.questionId)) {
        duplicateQuestionIds.add(row.questionId)
      }
      seenQuestionIds.add(row.questionId)
    }

    const issues: string[] = []

    if (rows.length !== REQUIRED_TOTAL) {
      issues.push(`total=${rows.length}, required=${REQUIRED_TOTAL}`)
    }

    for (const moduleIndex of [0, 1, 2, 3]) {
      const actual = moduleCounts[moduleIndex] || 0
      const required = REQUIRED_MODULE_COUNTS[moduleIndex]
      if (actual !== required) {
        issues.push(`module ${moduleIndex}: ${actual}/${required}`)
      }
    }

    if (duplicateQuestionIds.size > 0) {
      issues.push(`duplicates=${duplicateQuestionIds.size}`)
    }

    if (issues.length > 0) {
      failures += 1
      console.log(`[verify-integrity] FAIL ${test.name} published=${test.isPublished} :: ${issues.join(' | ')}`)
    }
  }

  if (failures > 0) {
    throw new Error(`[verify-integrity] FAILED: ${failures}/${tests.length} practice tests have missing questions or duplicates.`)
  }

  console.log(`[verify-integrity] PASS: ${tests.length}/${tests.length} practice tests have exact 27/27/22/22 counts and zero duplicates.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
