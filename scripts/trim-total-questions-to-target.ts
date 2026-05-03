/**
 * Trim newest generated diagramless questions so total DB question count
 * matches an exact target.
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/trim-total-questions-to-target.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_TOTAL = Math.max(
  1,
  Number.parseInt(process.env.TRIM_TARGET_TOTAL || '10000', 10) || 10000,
)

type IdRow = { id: string }

function quoteSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

async function main(): Promise<void> {
  const startTotal = await prisma.question.count()
  const excess = Math.max(0, startTotal - TARGET_TOTAL)

  console.log('=== Trim Total Questions To Target ===')
  console.log(`Start total: ${startTotal}`)
  console.log(`Target total: ${TARGET_TOTAL}`)
  console.log(`Excess: ${excess}`)

  if (excess === 0) {
    console.log('No trim needed.')
    return
  }

  const ids = (await prisma.$queryRawUnsafe(`
    SELECT TOP (${excess}) [id]
    FROM [questions]
    WHERE
      [isActive] = 1
      AND [source] LIKE '%Unified Service%'
      AND [imageData] IS NULL
      AND [imageUrl] IS NULL
      AND [chartData] IS NULL
      AND ([visualType] IS NULL OR [visualType] = 'none')
    ORDER BY [createdAt] DESC, [id] DESC;
  `)) as IdRow[]

  if (ids.length < excess) {
    throw new Error(`Only found ${ids.length} eligible rows but need ${excess} to trim.`)
  }

  const idListSql = ids.map((row) => quoteSql(row.id)).join(',')

  await prisma.$executeRawUnsafe(`
    DELETE gsa
    FROM [group_study_answers] gsa
    INNER JOIN [group_study_questions] gsq ON gsq.[id] = gsa.[groupStudyQuestionId]
    WHERE gsq.[questionId] IN (${idListSql});
  `)

  await prisma.$executeRawUnsafe(`
    DELETE FROM [question_results]
    WHERE [questionId] IN (${idListSql});
  `)

  await prisma.$executeRawUnsafe(`
    DELETE FROM [practice_test_questions]
    WHERE [questionId] IN (${idListSql});
  `)

  await prisma.$executeRawUnsafe(`
    DELETE FROM [group_study_questions]
    WHERE [questionId] IN (${idListSql});
  `)

  await prisma.$executeRawUnsafe(`
    DELETE FROM [question_reviews]
    WHERE [questionId] IN (${idListSql});
  `)

  const deletedQuestions = await prisma.$executeRawUnsafe(`
    DELETE FROM [questions]
    WHERE [id] IN (${idListSql});
  `)

  const finalTotal = await prisma.question.count()

  console.log('=== Trim Summary ===')
  console.log(`Trim candidates selected: ${ids.length}`)
  console.log(`Deleted questions: ${deletedQuestions}`)
  console.log(`Final total: ${finalTotal}`)
}

main()
  .catch((error) => {
    console.error('FATAL:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
