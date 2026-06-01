import { PrismaClient } from '@prisma/client'
import { unifiedQuestionGenerator } from '../src/services/unifiedQuestionGenerator'

const prisma = new PrismaClient()

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const targetBatchSize = Number.parseInt(process.env.MATH_BALANCE_BATCH_SIZE || '20', 10)
  const maxIterations = Number.parseInt(process.env.MATH_BALANCE_MAX_ITERATIONS || '300', 10)
  const maxConsecutiveFailures = Number.parseInt(process.env.MATH_BALANCE_MAX_FAILURES || '5', 10)

  let consecutiveFailures = 0

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const reading = await prisma.question.count({
      where: { isActive: true, isReserved: false, moduleType: 'reading-writing' },
    })
    const math = await prisma.question.count({
      where: { isActive: true, isReserved: false, moduleType: 'math' },
    })

    const gap = reading - math
    console.log(`[balance] iteration=${iteration} reading=${reading} math=${math} gap=${gap}`)

    if (gap <= 0) {
      break
    }

    const batchSize = Math.min(targetBatchSize, gap)

    try {
      const result = await unifiedQuestionGenerator.generateQuestions({
        mathCount: batchSize,
        readingCount: 0,
        moduleType: 'math',
        includeImages: false,
        includePassages: false,
        storeInDatabase: true,
        skipEvaluation: true,
        enableRetry: false,
        enableValidation: false,
        difficulty: 'mixed',
      })

      console.log(`[balance] stored=${result.summary.accepted} generated=${result.summary.total}`)

      if (result.summary.accepted > 0) {
        consecutiveFailures = 0
      } else {
        consecutiveFailures += 1
      }
    } catch (error) {
      consecutiveFailures += 1
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[balance] generation error: ${message}`)
    }

    if (consecutiveFailures >= maxConsecutiveFailures) {
      console.error(`[balance] stopping after ${consecutiveFailures} consecutive failed iterations`)
      break
    }

    await sleep(1000)
  }

  const readingFinal = await prisma.question.count({
    where: { isActive: true, isReserved: false, moduleType: 'reading-writing' },
  })
  const mathFinal = await prisma.question.count({
    where: { isActive: true, isReserved: false, moduleType: 'math' },
  })

  console.log(JSON.stringify({ reading: readingFinal, math: mathFinal, gap: readingFinal - mathFinal }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
