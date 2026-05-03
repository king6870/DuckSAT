/**
 * Generate non-diagram questions until DB approved count reaches target.
 *
 * Passing definition here = reviewStatus === 'approved'.
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-approved-until-target.ts
 */

import { PrismaClient } from '@prisma/client'
import { UnifiedQuestionGenerator } from '../src/services/unifiedQuestionGenerator'

if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

const prisma = new PrismaClient()

const TARGET_APPROVED_TOTAL = Math.max(
  1,
  Number.parseInt(process.env.PASS_TARGET_APPROVED_TOTAL || '7000', 10) || 7000,
)
const BATCH_SIZE = Math.max(1, Number.parseInt(process.env.PASS_TARGET_BATCH_SIZE || '10', 10) || 10)
const DELAY_MS = Math.max(0, Number.parseInt(process.env.PASS_TARGET_DELAY_MS || '1000', 10) || 1000)
const MAX_CALLS = Math.max(1, Number.parseInt(process.env.PASS_TARGET_MAX_CALLS || '500', 10) || 500)

type Target = {
  label: string
  moduleType: 'math' | 'reading-writing'
  specificTopics: string[]
}

const READING_TARGETS: Target[] = [
  { label: 'reading-comprehension', moduleType: 'reading-writing', specificTopics: ['Reading Comprehension'] },
  { label: 'writing-language', moduleType: 'reading-writing', specificTopics: ['Writing and Language'] },
  { label: 'vocabulary', moduleType: 'reading-writing', specificTopics: ['Reading Comprehension'] },
  { label: 'grammar', moduleType: 'reading-writing', specificTopics: ['Writing and Language'] },
]

const MATH_TARGETS: Target[] = [
  { label: 'algebra', moduleType: 'math', specificTopics: ['Algebra'] },
  { label: 'advanced-math', moduleType: 'math', specificTopics: ['Advanced Math'] },
  { label: 'geometry', moduleType: 'math', specificTopics: ['Geometry and Trigonometry'] },
  { label: 'problem-solving-data-analysis', moduleType: 'math', specificTopics: ['Statistics and Probability'] },
]

const INCLUDE_MATH = String(process.env.PASS_TARGET_INCLUDE_MATH || 'false').toLowerCase() === 'true'
const TARGETS: Target[] = INCLUDE_MATH ? [...READING_TARGETS, ...MATH_TARGETS] : READING_TARGETS

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getApprovedCountTotal(): Promise<number> {
  return prisma.question.count({ where: { reviewStatus: 'approved' } })
}

async function getActiveApprovedByCategory(): Promise<Array<{ category: string; approved: number }>> {
  const rows = await prisma.question.groupBy({
    by: ['category'],
    where: {
      isActive: true,
      reviewStatus: 'approved',
    },
    _count: { _all: true },
    orderBy: { category: 'asc' },
  })

  return rows.map((row) => ({ category: row.category, approved: row._count._all }))
}

async function generateOneBatch(
  generator: UnifiedQuestionGenerator,
  target: Target,
  count: number,
): Promise<number> {
  try {
    const result = await generator.generateQuestions({
      moduleType: target.moduleType,
      mathCount: target.moduleType === 'math' ? count : 0,
      readingCount: target.moduleType === 'reading-writing' ? count : 0,
      specificTopics: target.specificTopics,
      difficulty: 'mixed',
      includeImages: false,
      includePassages: true,
      storeInDatabase: true,
      skipEvaluation: true,
      enableRetry: false,
      enableValidation: false,
      temperature: 0.7,
    })

    return result.summary.accepted
  } catch (error) {
    console.error(`  ERROR generating ${target.label}:`, error)
    return 0
  }
}

async function main(): Promise<void> {
  const generator = new UnifiedQuestionGenerator()
  const startApproved = await getApprovedCountTotal()

  console.log('=== Generate Approved Until Target ===')
  console.log(`Approved at start: ${startApproved}`)
  console.log(`Target approved total: ${TARGET_APPROVED_TOTAL}`)
  console.log(`Batch size per call: ${BATCH_SIZE}`)
  console.log(`Include math targets: ${INCLUDE_MATH}`)

  if (startApproved >= TARGET_APPROVED_TOTAL) {
    console.log('Target already satisfied. No generation needed.')
    return
  }

  let currentApproved = startApproved
  let calls = 0
  let totalAccepted = 0
  let zeroAcceptedStreak = 0

  while (currentApproved < TARGET_APPROVED_TOTAL && calls < MAX_CALLS) {
    const needed = TARGET_APPROVED_TOTAL - currentApproved
    console.log(`\nNeed +${needed} approved more...`)

    for (const target of TARGETS) {
      if (currentApproved >= TARGET_APPROVED_TOTAL || calls >= MAX_CALLS) break

      calls += 1
      const batchCount = Math.min(BATCH_SIZE, Math.max(1, needed))
      const accepted = await generateOneBatch(generator, target, batchCount)
      totalAccepted += accepted

      if (accepted === 0) {
        zeroAcceptedStreak += 1
      } else {
        zeroAcceptedStreak = 0
      }

      currentApproved = await getApprovedCountTotal()
      const remaining = Math.max(0, TARGET_APPROVED_TOTAL - currentApproved)

      console.log(
        `  [${target.label}] call ${calls}: accepted=${accepted}, approvedTotal=${currentApproved}, remaining=${remaining}`,
      )

      if (zeroAcceptedStreak >= 12) {
        console.warn('Too many zero-accepted calls in a row. Stopping early to avoid infinite loop.')
        break
      }

      if (currentApproved < TARGET_APPROVED_TOTAL) {
        await sleep(DELAY_MS)
      }
    }

    if (zeroAcceptedStreak >= 12) {
      break
    }
  }

  const finalApproved = await getApprovedCountTotal()
  const activeByCategory = await getActiveApprovedByCategory()

  console.log('\n=== Final Summary ===')
  console.log(`Start approved: ${startApproved}`)
  console.log(`Generated accepted (this run): ${totalAccepted}`)
  console.log(`Final approved: ${finalApproved}`)
  console.log(`Target met: ${finalApproved >= TARGET_APPROVED_TOTAL}`)
  console.log(`Calls used: ${calls}/${MAX_CALLS}`)
  console.log('\nActive approved by category:')
  console.table(activeByCategory)
}

main()
  .catch((error) => {
    console.error('FATAL:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
