/**
 * Seed Practice Tests 11–50 (incremental — preserves existing tests 1–10)
 *
 * Creates 40 new tests (SAT Practice Test 11 through SAT Practice Test 50) using
 * questions that are NOT already reserved. Does NOT touch tests 1–10 or their
 * question assignments, so user attempt history is fully preserved.
 *
 * Three difficulty tiers:
 *   Tests 11–25 (15 tests)  → "standard"
 *   Tests 26–50 (25 tests)  → "advanced"
 *   Tests  1–10 (existing)  → left as-is (currently "standard" from prior seeder)
 *
 * Each test: 98 questions = 27 RW-mod1 + 27 RW-mod2 + 22 Math-mod1 + 22 Math-mod2
 *
 * RW module difficulty mixes (per 27 slots):
 *   standard   5 easy, 15 medium,  7 hard
 *   advanced   3 easy, 12 medium, 12 hard
 *
 * Math module difficulty mixes (per 22 slots):
 *   standard   4 easy, 12 medium,  6 hard
 *   advanced   2 easy, 10 medium, 10 hard
 *
 * Pre-flight: checks that enough unreserved questions exist.
 * Post-run:   marks all new question assignments as isReserved = true.
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-50-practice-tests.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TESTS_TO_CREATE = Array.from({ length: 40 }, (_, i) => ({
  number: i + 11,                              // 11–50
  name: `SAT Practice Test ${i + 11}`,
  tier: i + 11 <= 25 ? 'standard' : 'advanced' as 'standard' | 'advanced',
}))

// Question counts per module
const RW_PER_MODULE = 27  // modules 0 & 1
const MATH_PER_MODULE = 22 // modules 2 & 3

// Difficulty mixes per tier
const MIX: Record<'standard' | 'advanced', {
  rw: { easy: number; medium: number; hard: number }
  math: { easy: number; medium: number; hard: number }
}> = {
  standard: {
    rw:   { easy: 5,  medium: 15, hard: 7 },   // = 27
    math: { easy: 4,  medium: 12, hard: 6 },   // = 22
  },
  advanced: {
    rw:   { easy: 3,  medium: 12, hard: 12 },  // = 27
    math: { easy: 2,  medium: 10, hard: 10 },  // = 22
  },
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionRow {
  id: string
  moduleType: string
  difficulty: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick `mix.easy + mix.medium + mix.hard` questions from `pool`,
 * excluding any already in `used`.
 * Questions within the selected set are sorted easy → medium → hard.
 */
function pickFromPool(
  pool: QuestionRow[],
  mix: { easy: number; medium: number; hard: number },
  used: Set<string>,
): QuestionRow[] {
  const totalNeeded = mix.easy + mix.medium + mix.hard
  const available = shuffle(pool.filter(q => !used.has(q.id)))
  const byDiff: Record<string, QuestionRow[]> = { easy: [], medium: [], hard: [] }

  for (const q of available) {
    if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q)
  }

  const picked: QuestionRow[] = []

  // Fill each tier
  for (const [diff, count] of Object.entries(mix)) {
    const tier = byDiff[diff] ?? []
    picked.push(...tier.slice(0, count))
  }

  // Fill shortfalls from any remaining available question
  if (picked.length < totalNeeded) {
    const pickedIds = new Set(picked.map(q => q.id))
    const overflow = available.filter(q => !pickedIds.has(q.id))
    const shortfall = totalNeeded - picked.length
    picked.push(...overflow.slice(0, shortfall))
  }

  if (picked.length < totalNeeded) {
    throw new Error(
      `Not enough questions: needed ${totalNeeded} but only got ${picked.length}.\n` +
      `  pool size: ${pool.length}, available (not used): ${available.length}\n` +
      `  mix: ${JSON.stringify(mix)}\n` +
      `  by difficulty: easy=${byDiff.easy.length}, medium=${byDiff.medium.length}, hard=${byDiff.hard.length}`
    )
  }

  // Sort easy → medium → hard inside the picked set
  const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
  picked.sort((a, b) => (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1))

  return picked.slice(0, totalNeeded)
}

// ---------------------------------------------------------------------------
// Pre-flight capacity check
// ---------------------------------------------------------------------------

async function preflightCheck(rwPool: QuestionRow[], mathPool: QuestionRow[]): Promise<void> {
  console.log('\n--- Pre-flight capacity check ---')

  // RW needed for tests 11–25 (15 × standard) + tests 26–50 (25 × advanced)
  const rwNeeded =
    15 * RW_PER_MODULE * 2 * 1 +  // 15 standard tests × 54 RW questions
    25 * RW_PER_MODULE * 2 * 1    // 25 advanced tests × 54 RW questions
  // = 15*54 + 25*54 = 810 + 1350 = 2160

  // Math needed
  const mathNeeded =
    15 * MATH_PER_MODULE * 2 * 1 +
    25 * MATH_PER_MODULE * 2 * 1
  // = 15*44 + 25*44 = 660 + 1100 = 1760

  console.log(`  Unreserved RW questions:   ${rwPool.length} (need ${rwNeeded})`)
  console.log(`  Unreserved Math questions: ${mathPool.length} (need ${mathNeeded})`)

  if (rwPool.length < rwNeeded) {
    throw new Error(
      `INSUFFICIENT RW questions: have ${rwPool.length}, need ${rwNeeded}. ` +
      `Run scripts/generate-rw-batch.ts first.`
    )
  }
  if (mathPool.length < mathNeeded) {
    throw new Error(
      `INSUFFICIENT Math questions: have ${mathPool.length}, need ${mathNeeded}. ` +
      `Unexpected — math should have plenty.`
    )
  }

  console.log('  ✓ Capacity check passed')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Seed SAT Practice Tests 11–50 (incremental) ===\n')

  // 1. Load unreserved questions (tests 1–10 questions are reserved → we skip them)
  console.log('Loading unreserved question pool...')
  const allFree = await prisma.question.findMany({
    where: { isActive: true, isReserved: false },
    select: { id: true, moduleType: true, difficulty: true },
  })

  const rwPool   = allFree.filter(q => q.moduleType === 'reading-writing')
  const mathPool = allFree.filter(q => q.moduleType === 'math')
  console.log(`  R&W pool : ${rwPool.length}`)
  console.log(`  Math pool: ${mathPool.length}`)

  // 2. Pre-flight check
  await preflightCheck(rwPool, mathPool)

  // 3. Check which tests already exist (skip if already seeded)
  const existingTests = await prisma.practiceTest.findMany({
    where: { name: { in: TESTS_TO_CREATE.map(t => t.name) } },
    select: { name: true },
  })
  const existingNames = new Set(existingTests.map(t => t.name))
  if (existingNames.size > 0) {
    console.log(`\nAlready seeded: ${existingNames.size} tests (${[...existingNames].slice(0,3).join(', ')}${existingNames.size > 3 ? '…' : ''})`)
    console.log('These will be SKIPPED to preserve integrity.')
  }

  // 4. Track used IDs across all tests in this run
  const usedInThisRun = new Set<string>()

  let totalCreated = 0
  let totalSkipped = 0

  for (const testDef of TESTS_TO_CREATE) {
    if (existingNames.has(testDef.name)) {
      totalSkipped++
      continue
    }

    const tier = testDef.tier
    const mix = MIX[tier]

    // Pick questions for 4 modules
    let rwMod1: QuestionRow[]
    let rwMod2: QuestionRow[]
    let mathMod1: QuestionRow[]
    let mathMod2: QuestionRow[]

    try {
      rwMod1   = pickFromPool(rwPool,   mix.rw,   usedInThisRun)
      for (const q of rwMod1) usedInThisRun.add(q.id)

      rwMod2   = pickFromPool(rwPool,   mix.rw,   usedInThisRun)
      for (const q of rwMod2) usedInThisRun.add(q.id)

      mathMod1 = pickFromPool(mathPool, mix.math, usedInThisRun)
      for (const q of mathMod1) usedInThisRun.add(q.id)

      mathMod2 = pickFromPool(mathPool, mix.math, usedInThisRun)
      for (const q of mathMod2) usedInThisRun.add(q.id)
    } catch (err) {
      console.error(`\nFATAL: Failed to pick questions for ${testDef.name}:`, err)
      throw err
    }

    // Create PracticeTest record
    const practiceTest = await prisma.practiceTest.create({
      data: {
        name: testDef.name,
        description: `Full-length SAT practice test (${tier} difficulty). 98 questions across 4 modules.`,
        difficulty: tier,
        isPublished: true,
      },
    })

    // Build question assignment records
    const records: Array<{
      practiceTestId: string
      questionId: string
      moduleIndex: number
      orderIndex: number
    }> = []

    let orderIndex = 0
    for (const [modIndex, moduleQs] of [
      [0, rwMod1],
      [1, rwMod2],
      [2, mathMod1],
      [3, mathMod2],
    ] as [number, QuestionRow[]][]) {
      for (const q of moduleQs) {
        records.push({
          practiceTestId: practiceTest.id,
          questionId: q.id,
          moduleIndex: modIndex,
          orderIndex,
        })
        orderIndex++
      }
    }

    // Insert all question assignments
    await prisma.practiceTestQuestion.createMany({ data: records })

    totalCreated++
    console.log(
      `[${testDef.name}] ✓  ${rwMod1.length}+${rwMod2.length} RW + ${mathMod1.length}+${mathMod2.length} Math = ${records.length} questions  (${tier})`
    )
  }

  // 5. Mark all newly used questions as reserved (chunk to avoid SQL Server 2100-param limit)
  if (usedInThisRun.size > 0) {
    const ids = [...usedInThisRun]
    const CHUNK = 500
    console.log(`\nMarking ${ids.length} questions as reserved (in chunks of ${CHUNK})...`)
    for (let i = 0; i < ids.length; i += CHUNK) {
      await prisma.question.updateMany({
        where: { id: { in: ids.slice(i, i + CHUNK) } },
        data: { isReserved: true },
      })
    }
    console.log('  ✓ Done')
  }

  // 6. Final summary
  console.log('\n=== Results ===')
  console.log(`  Created : ${totalCreated} new tests`)
  console.log(`  Skipped : ${totalSkipped} (already existed)`)

  const totalPublished = await prisma.practiceTest.count({ where: { isPublished: true } })
  console.log(`  Total published practice tests: ${totalPublished}`)

  // Verify no duplicate question assignments
  const dupes = await prisma.$queryRaw<{ questionId: string; cnt: number }[]>`
    SELECT questionId, COUNT(*) as cnt
    FROM practice_test_questions
    GROUP BY questionId
    HAVING COUNT(*) > 1
  `
  if (dupes.length > 0) {
    console.error(`\n⚠️  WARNING: ${dupes.length} questions appear in more than one test!`)
    dupes.slice(0, 5).forEach(d => console.error(`    questionId=${d.questionId} appears ${d.cnt} times`))
  } else {
    console.log('  ✓ No duplicate question assignments across all tests')
  }
}

main()
  .catch(e => { console.error('\nFATAL ERROR:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
