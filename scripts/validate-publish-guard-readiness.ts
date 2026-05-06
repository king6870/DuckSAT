import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REQUIRED_MODULE_COUNTS: Record<number, number> = {
  0: 27,
  1: 27,
  2: 22,
  3: 22,
}

const REQUIRED_TOTAL = 98

async function run() {
  const tests = await prisma.practiceTest.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      name: true,
      questions: {
        select: {
          moduleIndex: true,
          questionId: true,
          question: {
            select: {
              id: true,
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

  let blockedCount = 0

  for (const test of tests) {
    const moduleCounts = new Map<number, number>()
    const issues: string[] = []
    const seenQuestionIds = new Set<string>()
    const duplicateQuestionIds = new Set<string>()

    for (const assignment of test.questions) {
      moduleCounts.set(assignment.moduleIndex, (moduleCounts.get(assignment.moduleIndex) || 0) + 1)

      const questionId = assignment.questionId || assignment.question.id
      if (questionId) {
        if (seenQuestionIds.has(questionId)) {
          duplicateQuestionIds.add(questionId)
        }
        seenQuestionIds.add(questionId)
      }

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
      const actual = moduleCounts.get(index) || 0
      const required = REQUIRED_MODULE_COUNTS[index]
      if (actual !== required) {
        issues.push(`Module ${index} has ${actual} questions (required ${required})`)
      }
    }

    const totalAssignments = test.questions.length
    if (totalAssignments !== REQUIRED_TOTAL) {
      issues.push(`Total assigned questions is ${totalAssignments} (required ${REQUIRED_TOTAL})`)
    }

    if (duplicateQuestionIds.size > 0) {
      issues.push(`Duplicate question IDs found: ${duplicateQuestionIds.size}`)
    }

    console.log(`\n${test.name} (${test.id})`)
    console.log(`moduleCounts=${JSON.stringify(Object.fromEntries([...moduleCounts.entries()].sort((a, b) => a[0] - b[0])))}`)
    if (issues.length > 0) {
      console.log('status=BLOCKED')
      blockedCount += 1
      for (const issue of issues) {
        console.log(`- ${issue}`)
      }
    } else {
      console.log('status=READY')
    }
  }

  if (blockedCount > 0) {
    throw new Error(`[publish-guard] BLOCKED: ${blockedCount} published tests failed required-count or duplicate checks.`)
  }

  console.log('[publish-guard] PASS: All published tests have required 27/27/22/22 counts and zero duplicates.')

  await prisma.$disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
