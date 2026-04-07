/**
 * Top-up generation: 600 high-quality RW questions to fill the pool gap.
 *
 * Post-dedup unreserved RW: 1,815. Need 2,160. Gap: 345.
 * Generating 600 (255 buffer) using the two topic names that work:
 *   Reading Comprehension : 360 (easy 25% / medium 50% / hard 25%)
 *   Writing and Language  : 240 (easy 30% / medium 45% / hard 25%)
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-topup.ts
 */

import { UnifiedQuestionGenerator } from '../src/services/unifiedQuestionGenerator'
import { PrismaClient } from '@prisma/client'

if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

const prisma = new PrismaClient()
const POOL_TARGET = 2160
const BATCH_SIZE = 10
const DELAY_MS = 1000

const TARGETS = [
  {
    label: 'reading-comprehension',
    specificTopics: ['Reading Comprehension'],
    difficultyMix: [
      { difficulty: 'easy'   as const, count: 90  },
      { difficulty: 'medium' as const, count: 180 },
      { difficulty: 'hard'   as const, count: 90  },
    ],
  },
  {
    label: 'writing-language',
    specificTopics: ['Writing and Language'],
    difficultyMix: [
      { difficulty: 'easy'   as const, count: 72  },
      { difficulty: 'medium' as const, count: 108 },
      { difficulty: 'hard'   as const, count: 60  },
    ],
  },
]

const TOTAL_TARGET = TARGETS.reduce((s, t) => s + t.difficultyMix.reduce((ss, d) => ss + d.count, 0), 0)

function bar(done: number, total: number, width = 20): string {
  const filled = Math.round((done / total) * width)
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']'
}

function eta(startMs: number, done: number, total: number): string {
  if (done === 0) return '--:--'
  const elapsed = (Date.now() - startMs) / 1000
  const rate = done / elapsed
  const remaining = (total - done) / rate
  const m = Math.floor(remaining / 60)
  const s = Math.floor(remaining % 60)
  return `${m}m${s.toString().padStart(2, '0')}s`
}

function silence<T>(fn: () => Promise<T>): Promise<T> {
  const origLog = console.log
  const origWarn = console.warn
  const origError = console.error
  console.log = () => {}
  console.warn = () => {}
  console.error = () => {}
  return fn().finally(() => {
    console.log = origLog
    console.warn = origWarn
    console.error = origError
  })
}

async function getPoolCount(): Promise<number> {
  return prisma.question.count({ where: { isActive: true, isReserved: false, moduleType: 'reading-writing' } })
}

async function generateBatch(
  generator: UnifiedQuestionGenerator,
  specificTopics: string[],
  difficulty: 'easy' | 'medium' | 'hard',
  batchCount: number,
): Promise<number> {
  const result = await silence(() => generator.generateQuestions({
    moduleType: 'reading-writing',
    readingCount: batchCount,
    mathCount: 0,
    difficulty,
    specificTopics,
    storeInDatabase: true,
    skipEvaluation: true,
    enableRetry: false,
    enableValidation: false,
    includePassages: true,
    temperature: 0.7,
  }))
  return result.summary.accepted
}

async function main() {
  const startMs = Date.now()
  const startPool = await getPoolCount()

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║       DuckSAT RW Question Top-Up Generation          ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`  Pool at start : ${startPool} unreserved RW (need ${POOL_TARGET})`)
  console.log(`  Gap to fill   : ${Math.max(0, POOL_TARGET - startPool)}`)
  console.log(`  Generating    : ${TOTAL_TARGET} questions (${POOL_TARGET - startPool + (TOTAL_TARGET - (POOL_TARGET - startPool))} buffer)\n`)

  const generator = new UnifiedQuestionGenerator()
  let grandTotal = 0

  for (const target of TARGETS) {
    const targetTotal = target.difficultyMix.reduce((s, d) => s + d.count, 0)
    let categoryTotal = 0

    console.log(`\n┌─ ${target.label.toUpperCase()} (${targetTotal} questions) ─────────────────────────`)

    for (const { difficulty, count } of target.difficultyMix) {
      let generated = 0
      let remaining = count

      while (remaining > 0) {
        const batchCount = Math.min(BATCH_SIZE, remaining)

        try {
          const accepted = await generateBatch(generator, target.specificTopics, difficulty, batchCount)
          generated += accepted
          remaining -= accepted
          categoryTotal += accepted
          grandTotal += accepted

          const pool = startPool + grandTotal
          const pct = Math.round((grandTotal / TOTAL_TARGET) * 100)
          const poolPct = Math.min(100, Math.round((pool / POOL_TARGET) * 100))

          process.stdout.write(
            `\r│  ${difficulty.padEnd(6)} ${bar(generated, count)} ${generated}/${count}` +
            `  │  Overall ${bar(grandTotal, TOTAL_TARGET, 15)} ${pct}%` +
            `  │  Pool ${pool}/${POOL_TARGET} (${poolPct}%)  ETA ${eta(startMs, grandTotal, TOTAL_TARGET)}  `
          )

          if (accepted === 0) {
            remaining -= batchCount
            process.stdout.write('\n│  ⚠ batch returned 0 — skipping\n')
          }
        } catch (err: unknown) {
          remaining -= batchCount
          categoryTotal -= 0
          const msg = err instanceof Error ? err.message.slice(0, 60) : String(err).slice(0, 60)
          process.stdout.write(`\n│  ✗ ERROR: ${msg}\n`)
        }

        if (remaining > 0) await new Promise(r => setTimeout(r, DELAY_MS))
      }

      process.stdout.write(`\n│  ✓ ${difficulty}: ${generated}/${count}\n`)
    }

    console.log(`└─ ${target.label}: ${categoryTotal}/${targetTotal} ────────────────────────────`)
  }

  const finalPool = await getPoolCount()
  const elapsed = ((Date.now() - startMs) / 60000).toFixed(1)

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log(`║  DONE  ${grandTotal}/${TOTAL_TARGET} generated in ${elapsed} min`.padEnd(54) + '║')
  console.log(`║  Final pool: ${finalPool} unreserved RW  (need ${POOL_TARGET})`.padEnd(54) + '║')
  if (finalPool >= POOL_TARGET) {
    console.log('║  ✅ POOL READY — run the seeder:                      ║')
    console.log('║  npx dotenv -e .env.local -- \\                        ║')
    console.log('║    npx tsx scripts/seed-50-practice-tests.ts          ║')
  } else {
    console.log(`║  ⚠ Still ${POOL_TARGET - finalPool} short — re-run this script`.padEnd(54) + '║')
  }
  console.log('╚══════════════════════════════════════════════════════╝')
}

main()
  .catch(e => { console.error('\nFATAL:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
