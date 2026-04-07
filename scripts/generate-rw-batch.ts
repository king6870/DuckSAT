/**
 * Generate ~1,500 new Reading & Writing questions to fill gaps for 50 practice tests.
 *
 * Targets (derived from spec):
 *   reading-comprehension : 750
 *   writing-language      : 400
 *   vocabulary            : 230
 *   grammar               : 120
 *
 * Generates in small batches (10 per call) to respect rate limits.
 * Each batch stores directly in the database (storeInDatabase: true).
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-rw-batch.ts
 */

import { UnifiedQuestionGenerator } from '../src/services/unifiedQuestionGenerator'
import { PrismaClient } from '@prisma/client'

// The generator checks ENDPOINT_URL first as "direct URL".
// AZURE_OPENAI_ENDPOINT in .env.local is already a full chat completions URL,
// so expose it as ENDPOINT_URL so the generator uses it without appending paths.
if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

const prisma = new PrismaClient()

const BATCH_SIZE = 10 // questions per API call
const DELAY_MS = 1000 // 1 s between batches

// Minimum needed: tests 11–50 require 40×54 = 2,160 RW questions.
// Current unreserved RW pool = 1,292. Need at least 868 more.
// We generate 950 total (80 buffer) across all 4 categories proportionally.
const TARGETS: Array<{
  category: string
  specificTopics: string[]
  toGenerate: number
  difficultyMix: Array<{ difficulty: 'easy' | 'medium' | 'hard'; count: number }>
}> = [
  {
    category: 'reading-comprehension',
    specificTopics: ['Reading Comprehension'],
    toGenerate: 450,
    difficultyMix: [
      { difficulty: 'easy',   count: Math.round(450 * 0.25) },  // 113
      { difficulty: 'medium', count: Math.round(450 * 0.50) },  // 225
      { difficulty: 'hard',   count: Math.round(450 * 0.25) },  // 112
    ],
  },
  {
    category: 'writing-language',
    specificTopics: ['Writing and Language'],
    toGenerate: 260,
    difficultyMix: [
      { difficulty: 'easy',   count: Math.round(260 * 0.30) },  // 78
      { difficulty: 'medium', count: Math.round(260 * 0.45) },  // 117
      { difficulty: 'hard',   count: Math.round(260 * 0.25) },  // 65
    ],
  },
  {
    category: 'vocabulary',
    specificTopics: ['Vocabulary in Context'],
    toGenerate: 150,
    difficultyMix: [
      { difficulty: 'easy',   count: Math.round(150 * 0.30) },  // 45
      { difficulty: 'medium', count: Math.round(150 * 0.50) },  // 75
      { difficulty: 'hard',   count: Math.round(150 * 0.20) },  // 30
    ],
  },
  {
    category: 'grammar',
    specificTopics: ['Grammar and Usage'],
    toGenerate: 90,
    difficultyMix: [
      { difficulty: 'easy',   count: Math.round(90 * 0.30) },   // 27
      { difficulty: 'medium', count: Math.round(90 * 0.45) },   // 41
      { difficulty: 'hard',   count: Math.round(90 * 0.25) },   // 22
    ],
  },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function countCurrent(category: string): Promise<number> {
  return prisma.question.count({ where: { isActive: true, category } })
}

async function generateBatch(
  generator: UnifiedQuestionGenerator,
  category: string,
  specificTopics: string[],
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
): Promise<number> {
  let generated = 0
  let remaining = count

  while (remaining > 0) {
    const batchCount = Math.min(BATCH_SIZE, remaining)

    try {
      const result = await generator.generateQuestions({
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
      })

      const accepted = result.summary.accepted
      generated += accepted
      remaining -= accepted

      console.log(
        `  [${category}/${difficulty}] batch done: accepted ${accepted}/${batchCount}, total so far: ${generated}/${count}, remaining: ${Math.max(0, remaining)}`,
      )

      if (accepted === 0) {
        console.warn(`  WARNING: batch returned 0 accepted. Skipping to avoid infinite loop.`)
        remaining -= batchCount // advance anyway
      }
    } catch (err) {
      console.error(`  ERROR generating batch [${category}/${difficulty}]:`, err)
      remaining -= batchCount // advance past failed batch
    }

    if (remaining > 0) {
      await sleep(DELAY_MS)
    }
  }

  return generated
}

async function main() {
  console.log('=== DuckSAT RW Question Generation ===\n')

  // Print starting counts
  console.log('Current question counts:')
  for (const t of TARGETS) {
    const current = await countCurrent(t.category)
    console.log(`  ${t.category}: ${current} (need +${t.toGenerate})`)
  }
  console.log()

  const generator = new UnifiedQuestionGenerator()
  const summary: Record<string, { target: number; generated: number }> = {}

  for (const target of TARGETS) {
    console.log(`\n--- Generating ${target.toGenerate} questions for: ${target.category} ---`)
    let categoryTotal = 0

    for (const { difficulty, count } of target.difficultyMix) {
      if (count <= 0) continue
      console.log(`  Generating ${count} ${difficulty} questions...`)
      const n = await generateBatch(generator, target.category, target.specificTopics, difficulty, count)
      categoryTotal += n
    }

    summary[target.category] = { target: target.toGenerate, generated: categoryTotal }
    console.log(`  ✓ ${target.category}: generated ${categoryTotal}`)
  }

  // Final counts
  console.log('\n=== Generation Summary ===')
  let totalGenerated = 0
  for (const [cat, { target, generated }] of Object.entries(summary)) {
    const current = await countCurrent(cat)
    console.log(`  ${cat}: +${generated} generated, DB now has ${current} (target was +${target})`)
    totalGenerated += generated
  }
  console.log(`\nTotal generated: ${totalGenerated}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
