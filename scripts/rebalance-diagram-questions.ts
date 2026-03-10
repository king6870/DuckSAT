/**
 * Rebalance Diagram Questions Across Modules
 * 
 * Redistributes questions with imageData/chartData evenly across
 * same-type module pairs (RW: 0↔1, Math: 2↔3) for all published
 * practice tests.
 * 
 * Usage: npx tsx scripts/rebalance-diagram-questions.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MODULE_COUNTS = {
  0: 27, // RW-1
  1: 27, // RW-2
  2: 22, // Math-1
  3: 22, // Math-2
} as const

type ModuleIndex = 0 | 1 | 2 | 3
type ModulePair = [ModuleIndex, ModuleIndex]

const MODULE_PAIRS: ModulePair[] = [
  [0, 1], // Reading-Writing pair
  [2, 3], // Math pair
]

interface QuestionRow {
  id: string // PracticeTestQuestion.id
  questionId: string
  moduleIndex: number
  orderIndex: number
  hasDiagram: boolean
}

async function rebalanceTest(testId: string, testName: string): Promise<void> {
  // Fetch all practice test question rows with diagram info
  const rows = await prisma.practiceTestQuestion.findMany({
    where: { practiceTestId: testId },
    include: {
      question: {
        select: {
          id: true,
          moduleType: true,
          imageData: true,
          chartData: true,
        },
      },
    },
    orderBy: { orderIndex: 'asc' },
  })

  const questionRows: QuestionRow[] = rows.map((r) => ({
    id: r.id,
    questionId: r.questionId,
    moduleIndex: r.moduleIndex,
    orderIndex: r.orderIndex,
    hasDiagram: r.question.imageData !== null || r.question.chartData !== null,
  }))

  let totalSwaps = 0

  for (const [modA, modB] of MODULE_PAIRS) {
    const questionsA = questionRows.filter((q) => q.moduleIndex === modA)
    const questionsB = questionRows.filter((q) => q.moduleIndex === modB)

    const diagramsInA = questionsA.filter((q) => q.hasDiagram)
    const diagramsInB = questionsB.filter((q) => q.hasDiagram)
    const totalDiagrams = diagramsInA.length + diagramsInB.length

    if (totalDiagrams === 0) {
      console.log(`  [${testName}] Modules ${modA}↔${modB}: no diagram questions, skipping`)
      continue
    }

    // Target: ~equal split (e.g., 7 total → 4 in modA, 3 in modB or 3,4)
    const targetA = Math.ceil(totalDiagrams / 2)
    const targetB = totalDiagrams - targetA

    console.log(`  [${testName}] Modules ${modA}↔${modB}: diagrams=${diagramsInA.length}/${diagramsInB.length}, target=${targetA}/${targetB}`)

    if (diagramsInA.length === targetA) {
      console.log(`  [${testName}] Modules ${modA}↔${modB}: already balanced`)
      continue
    }

    // Determine which direction to move diagrams
    if (diagramsInA.length < targetA) {
      // Need to move some diagram questions FROM modB TO modA
      const moveCount = targetA - diagramsInA.length
      const diagramsToMove = diagramsInB.slice(0, moveCount)
      const nonDiagramsInA = questionsA.filter((q) => !q.hasDiagram)
      const nonDiagramsToSwap = nonDiagramsInA.slice(0, moveCount)

      if (nonDiagramsToSwap.length < moveCount) {
        console.warn(`  [${testName}] Modules ${modA}↔${modB}: not enough non-diagram questions in module ${modA} to swap (need ${moveCount}, have ${nonDiagramsToSwap.length})`)
        continue
      }

      // Swap: diagram from modB goes to modA, non-diagram from modA goes to modB
      for (let i = 0; i < moveCount; i++) {
        const diagramQ = diagramsToMove[i]
        const nonDiagramQ = nonDiagramsToSwap[i]

        // Swap their moduleIndex values
        diagramQ.moduleIndex = modA
        nonDiagramQ.moduleIndex = modB
        totalSwaps++
      }
    } else {
      // Need to move some diagram questions FROM modA TO modB
      const moveCount = diagramsInA.length - targetA
      const diagramsToMove = diagramsInA.slice(0, moveCount)
      const nonDiagramsInB = questionsB.filter((q) => !q.hasDiagram)
      const nonDiagramsToSwap = nonDiagramsInB.slice(0, moveCount)

      if (nonDiagramsToSwap.length < moveCount) {
        console.warn(`  [${testName}] Modules ${modA}↔${modB}: not enough non-diagram questions in module ${modB} to swap (need ${moveCount}, have ${nonDiagramsToSwap.length})`)
        continue
      }

      for (let i = 0; i < moveCount; i++) {
        const diagramQ = diagramsToMove[i]
        const nonDiagramQ = nonDiagramsToSwap[i]

        diagramQ.moduleIndex = modB
        nonDiagramQ.moduleIndex = modA
        totalSwaps++
      }
    }
  }

  if (totalSwaps === 0) {
    console.log(`  [${testName}] No swaps needed.`)
    return
  }

  // Rebuild orderIndex: group by moduleIndex, sort within each module, assign sequential orderIndex
  const byModule: Record<number, QuestionRow[]> = { 0: [], 1: [], 2: [], 3: [] }
  for (const q of questionRows) {
    byModule[q.moduleIndex].push(q)
  }

  const orderedEntries: Array<{ practiceTestId: string; questionId: string; moduleIndex: number; orderIndex: number }> = []
  let orderIndex = 0

  for (const modIdx of [0, 1, 2, 3]) {
    const moduleQuestions = byModule[modIdx]
    const expectedCount = MODULE_COUNTS[modIdx as ModuleIndex]
    if (moduleQuestions.length !== expectedCount) {
      throw new Error(`[${testName}] Module ${modIdx}: expected ${expectedCount} questions, got ${moduleQuestions.length}`)
    }
    for (const q of moduleQuestions) {
      orderedEntries.push({
        practiceTestId: testId,
        questionId: q.questionId,
        moduleIndex: modIdx,
        orderIndex: orderIndex++,
      })
    }
  }

  // Apply in transaction
  await prisma.$transaction(async (tx) => {
    await tx.practiceTestQuestion.deleteMany({
      where: { practiceTestId: testId },
    })

    await tx.practiceTestQuestion.createMany({
      data: orderedEntries,
    })
  })

  // Verify diagram distribution
  for (const [modA, modB] of MODULE_PAIRS) {
    const diagA = orderedEntries.filter((e) => e.moduleIndex === modA).length
    const diagB = orderedEntries.filter((e) => e.moduleIndex === modB).length
    console.log(`  [${testName}] Module ${modA}: ${diagA} questions, Module ${modB}: ${diagB} questions`)
  }

  console.log(`  [${testName}] Applied ${totalSwaps} swaps, total rows: ${orderedEntries.length}`)
}

async function main(): Promise<void> {
  console.log('[rebalance] Starting diagram question rebalance...\n')

  const publishedTests = await prisma.practiceTest.findMany({
    where: { isPublished: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  if (publishedTests.length === 0) {
    console.log('[rebalance] No published practice tests found.')
    return
  }

  console.log(`[rebalance] Found ${publishedTests.length} published test(s)\n`)

  for (const test of publishedTests) {
    console.log(`[rebalance] Processing: ${test.name} (${test.id})`)
    await rebalanceTest(test.id, test.name)
    console.log()
  }

  console.log('[rebalance] Done.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
