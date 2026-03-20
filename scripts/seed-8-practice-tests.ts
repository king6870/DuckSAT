/**
 * Seed 10 Fixed SAT Practice Tests
 * 
 * Creates 10 practice tests with 98 unique questions each (980 total).
 * Wipes all existing assignments and re-seeds from scratch.
 * 
 * Run: npx dotenv -e .env.local -- npx tsx scripts/seed-8-practice-tests.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Module structure per SAT test
const MODULES = [
  { index: 0, type: 'reading-writing', count: 27 }, // RW Module 1
  { index: 1, type: 'reading-writing', count: 27 }, // RW Module 2
  { index: 2, type: 'math',            count: 22 }, // Math Module 1
  { index: 3, type: 'math',            count: 22 }, // Math Module 2
]

// Difficulty targets per module (approximate)
const RW_MIX = { easy: 8, medium: 14, hard: 5 }   // = 27
const MATH_MIX = { easy: 7, medium: 11, hard: 4 }  // = 22

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface QuestionRow {
  id: string
  moduleType: string
  difficulty: string
}

function pickFromPool(
  pool: QuestionRow[],
  mix: { easy: number; medium: number; hard: number },
  used: Set<string>
): QuestionRow[] {
  const available = pool.filter(q => !used.has(q.id))
  const byDiff: Record<string, QuestionRow[]> = { easy: [], medium: [], hard: [] }
  for (const q of shuffle(available)) {
    if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q)
  }

  const picked: QuestionRow[] = []
  const totalNeeded = mix.easy + mix.medium + mix.hard

  // Pick target amounts from each tier
  for (const [diff, count] of Object.entries(mix)) {
    const tier = byDiff[diff] || []
    const take = Math.min(count, tier.length)
    picked.push(...tier.slice(0, take))
  }

  // If any tier was short, fill from others
  if (picked.length < totalNeeded) {
    const pickedIds = new Set(picked.map(q => q.id))
    const remaining = available.filter(q => !pickedIds.has(q.id) && !used.has(q.id))
    const shortfall = totalNeeded - picked.length
    picked.push(...shuffle(remaining).slice(0, shortfall))
  }

  if (picked.length < totalNeeded) {
    throw new Error(`Not enough questions: needed ${totalNeeded}, got ${picked.length}`)
  }

  // Sort: easy → medium → hard within the picked set
  const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
  picked.sort((a, b) => (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1))

  return picked.slice(0, totalNeeded)
}

async function main() {
  console.log('=== Seed 10 Practice Tests ===\n')

  // 1. Load all active questions
  const allQuestions = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true, moduleType: true, difficulty: true }
  })

  const rwPool = allQuestions.filter(q => q.moduleType === 'reading-writing')
  const mathPool = allQuestions.filter(q => q.moduleType === 'math')
  console.log(`Question pool: ${rwPool.length} R&W, ${mathPool.length} Math (${allQuestions.length} total)`)

  // 2. Find or create all 10 practice tests
  const testNames = Array.from({ length: 10 }, (_, i) => `SAT Practice Test ${i + 1}`)
  const tests: Array<{ id: string; name: string; isNew: boolean; questionCount: number }> = []

  for (const name of testNames) {
    let test = await prisma.practiceTest.findUnique({
      where: { name },
      include: { _count: { select: { questions: true } } }
    })

    if (!test) {
      test = await prisma.practiceTest.create({
        data: {
          name,
          description: `Full-length SAT practice test with 98 questions across 4 modules.`,
          difficulty: 'standard',
          isPublished: true,
        },
        include: { _count: { select: { questions: true } } }
      })
      tests.push({ id: test.id, name, isNew: true, questionCount: 0 })
    } else {
      tests.push({ id: test.id, name, isNew: false, questionCount: test._count.questions })
    }
  }

  // 3. Wipe ALL existing assignments and re-seed everything for guaranteed uniqueness
  const usedQuestionIds = new Set<string>()
  const allTestIds = tests.map(t => t.id)

  // Clear all existing question assignments
  const deleted = await prisma.practiceTestQuestion.deleteMany({
    where: { practiceTestId: { in: allTestIds } }
  })
  console.log(`Cleared ${deleted.count} existing question assignments across all tests`)

  // Reset isReserved on all questions (we'll re-reserve the ones we pick)
  await prisma.question.updateMany({
    where: { isReserved: true },
    data: { isReserved: false }
  })
  console.log(`Reset all isReserved flags\n`)

  // 4. Seed each test
  let totalCreated = 0

  for (const test of tests) {

    // Pick questions for this test
    const rwQuestions = pickFromPool(rwPool, { easy: RW_MIX.easy * 2, medium: RW_MIX.medium * 2, hard: RW_MIX.hard * 2 }, usedQuestionIds)
    const mathQuestions = pickFromPool(mathPool, { easy: MATH_MIX.easy * 2, medium: MATH_MIX.medium * 2, hard: MATH_MIX.hard * 2 }, usedQuestionIds)

    // Split into modules
    const rwMod1 = rwQuestions.slice(0, 27)   // moduleIndex 0
    const rwMod2 = rwQuestions.slice(27, 54)  // moduleIndex 1
    const mathMod1 = mathQuestions.slice(0, 22) // moduleIndex 2
    const mathMod2 = mathQuestions.slice(22, 44) // moduleIndex 3

    // Build PracticeTestQuestion records
    const records: Array<{ practiceTestId: string; questionId: string; moduleIndex: number; orderIndex: number }> = []
    let orderIndex = 0

    for (const mod of [
      { questions: rwMod1, moduleIndex: 0 },
      { questions: rwMod2, moduleIndex: 1 },
      { questions: mathMod1, moduleIndex: 2 },
      { questions: mathMod2, moduleIndex: 3 },
    ]) {
      for (const q of mod.questions) {
        records.push({
          practiceTestId: test.id,
          questionId: q.id,
          moduleIndex: mod.moduleIndex,
          orderIndex,
        })
        orderIndex++
      }
    }

    // Insert all at once
    await prisma.practiceTestQuestion.createMany({ data: records })

    // Mark questions as reserved
    const questionIds = records.map(r => r.questionId)
    await prisma.question.updateMany({
      where: { id: { in: questionIds } },
      data: { isReserved: true }
    })

    // Track used questions
    for (const id of questionIds) usedQuestionIds.add(id)

    // Publish if not already
    await prisma.practiceTest.update({
      where: { id: test.id },
      data: { isPublished: true }
    })

    totalCreated++
    console.log(`[${test.name}] CREATED: ${rwMod1.length + rwMod2.length} R&W + ${mathMod1.length + mathMod2.length} Math = ${records.length} questions`)
  }

  // 5. Verification
  console.log('\n=== Verification ===')

  const allAssignments = await prisma.practiceTestQuestion.findMany({
    where: { practiceTestId: { in: tests.map(t => t.id) } },
    select: { practiceTestId: true, questionId: true }
  })

  const allQIds = allAssignments.map(a => a.questionId)
  const uniqueQIds = new Set(allQIds)

  // Per-test counts
  const perTest: Record<string, number> = {}
  for (const a of allAssignments) {
    perTest[a.practiceTestId] = (perTest[a.practiceTestId] || 0) + 1
  }

  let allPass = true
  for (const test of tests) {
    const count = perTest[test.id] || 0
    const status = count === 98 ? '✅' : '❌'
    if (count !== 98) allPass = false
    console.log(`  ${status} ${test.name}: ${count} questions`)
  }

  console.log(`\n  Total questions assigned: ${allQIds.length}`)
  console.log(`  Unique question IDs: ${uniqueQIds.size}`)
  console.log(`  Duplicates: ${allQIds.length - uniqueQIds.size}`)

  if (allQIds.length === 980 && uniqueQIds.size === 980 && allPass) {
    console.log('\n✅ All 10 practice tests seeded successfully — 980 unique questions, zero duplicates!')
  } else {
    console.log('\n❌ Verification FAILED — check output above')
  }
}

main()
  .catch(err => { console.error('Fatal error:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
