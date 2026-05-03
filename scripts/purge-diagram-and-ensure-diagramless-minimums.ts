import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { UnifiedQuestionGenerator } from '../src/services/unifiedQuestionGenerator'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

const prisma = new PrismaClient()

const DIAGRAM_PREDICATE = `
  (
    [imageData] IS NOT NULL
    OR [imageUrl] IS NOT NULL
    OR [chartData] IS NOT NULL
    OR ([visualType] IS NOT NULL AND [visualType] <> 'none')
  )
`

const NON_DIAGRAM_PREDICATE = `
  (
    [imageData] IS NULL
    AND [imageUrl] IS NULL
    AND [chartData] IS NULL
    AND ([visualType] IS NULL OR [visualType] = 'none')
  )
`

const MIN_PER_CATEGORY = Number(process.env.DIAGRAMLESS_MIN_PER_CATEGORY || 100)
const TOPUP_BATCH_SIZE = Number(process.env.DIAGRAMLESS_TOPUP_BATCH_SIZE || 10)
const TOPUP_DELAY_MS = Number(process.env.DIAGRAMLESS_TOPUP_DELAY_MS || 1200)

type ModuleType = 'math' | 'reading-writing'

type CanonicalTarget = {
  category: string
  moduleType: ModuleType
  specificTopics: string[]
}

type CategoryCountRow = {
  category: string
  totalCount: unknown
  diagramCount: unknown
  nonDiagramCount: unknown
}

type TotalCountRow = {
  totalCount: unknown
  diagramCount: unknown
  nonDiagramCount: unknown
}

type ArchivedTotalsRow = {
  totalCount: unknown
  diagramCount: unknown
  nonDiagramCount: unknown
}

const CANONICAL_TARGETS: CanonicalTarget[] = [
  {
    category: 'reading-comprehension',
    moduleType: 'reading-writing',
    specificTopics: ['Reading Comprehension'],
  },
  {
    category: 'grammar',
    moduleType: 'reading-writing',
    specificTopics: ['Writing and Language'],
  },
  {
    category: 'vocabulary',
    moduleType: 'reading-writing',
    specificTopics: ['Reading Comprehension'],
  },
  {
    category: 'writing-language',
    moduleType: 'reading-writing',
    specificTopics: ['Writing and Language'],
  },
  {
    category: 'algebra',
    moduleType: 'math',
    specificTopics: ['Algebra'],
  },
  {
    category: 'advanced-math',
    moduleType: 'math',
    specificTopics: ['Advanced Math'],
  },
  {
    category: 'geometry',
    moduleType: 'math',
    specificTopics: ['Geometry and Trigonometry'],
  },
  {
    category: 'problem-solving-data-analysis',
    moduleType: 'math',
    specificTopics: ['Statistics and Probability'],
  },
]

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`)
}

function printActiveCategoryTable(rows: CategoryCountRow[]): void {
  const formatted = rows.map((row) => ({
    category: row.category,
    total: toNumber(row.totalCount),
    diagram: toNumber(row.diagramCount),
    nonDiagram: toNumber(row.nonDiagramCount),
  }))
  console.table(formatted)
}

async function getForeignKeyTablesReferencingQuestions(): Promise<string[]> {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT DISTINCT OBJECT_NAME(parent_object_id) AS tableName
    FROM sys.foreign_keys
    WHERE referenced_object_id = OBJECT_ID('dbo.questions')
    ORDER BY tableName;
  `)) as Array<{ tableName: string | null }>

  return rows.map((row) => row.tableName || '').filter(Boolean)
}

async function getActiveCountsByCategory(): Promise<CategoryCountRow[]> {
  return (await prisma.$queryRawUnsafe(`
    SELECT
      [category] AS category,
      COUNT(*) AS totalCount,
      SUM(CASE WHEN ${DIAGRAM_PREDICATE} THEN 1 ELSE 0 END) AS diagramCount,
      SUM(CASE WHEN ${NON_DIAGRAM_PREDICATE} THEN 1 ELSE 0 END) AS nonDiagramCount
    FROM [questions]
    WHERE [isActive] = 1
    GROUP BY [category]
    ORDER BY [category];
  `)) as CategoryCountRow[]
}

async function getActiveTotals(): Promise<TotalCountRow> {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) AS totalCount,
      SUM(CASE WHEN ${DIAGRAM_PREDICATE} THEN 1 ELSE 0 END) AS diagramCount,
      SUM(CASE WHEN ${NON_DIAGRAM_PREDICATE} THEN 1 ELSE 0 END) AS nonDiagramCount
    FROM [questions]
    WHERE [isActive] = 1;
  `)) as TotalCountRow[]

  return rows[0]
}

async function getArchivedTotals(): Promise<ArchivedTotalsRow> {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) AS totalCount,
      SUM(CASE WHEN
        [imageData] IS NOT NULL
        OR [imageUrl] IS NOT NULL
        OR [chartData] IS NOT NULL
      THEN 1 ELSE 0 END) AS diagramCount,
      SUM(CASE WHEN
        [imageData] IS NULL
        AND [imageUrl] IS NULL
        AND [chartData] IS NULL
      THEN 1 ELSE 0 END) AS nonDiagramCount
    FROM [archived_questions];
  `)) as ArchivedTotalsRow[]

  return rows[0]
}

async function deleteDiagramQuestionDependenciesAndRows(): Promise<Record<string, number>> {
  const deletedGroupStudyAnswers = await prisma.$executeRawUnsafe(`
    DELETE gsa
    FROM [group_study_answers] gsa
    INNER JOIN [group_study_questions] gsq ON gsq.[id] = gsa.[groupStudyQuestionId]
    INNER JOIN [questions] q ON q.[id] = gsq.[questionId]
    WHERE ${DIAGRAM_PREDICATE.replace(/\[imageData\]|\[imageUrl\]|\[chartData\]|\[visualType\]/g, (m) => `q.${m}`)};
  `)

  const deletedQuestionResults = await prisma.$executeRawUnsafe(`
    DELETE qr
    FROM [question_results] qr
    INNER JOIN [questions] q ON q.[id] = qr.[questionId]
    WHERE ${DIAGRAM_PREDICATE.replace(/\[imageData\]|\[imageUrl\]|\[chartData\]|\[visualType\]/g, (m) => `q.${m}`)};
  `)

  const deletedPracticeTestQuestions = await prisma.$executeRawUnsafe(`
    DELETE ptq
    FROM [practice_test_questions] ptq
    INNER JOIN [questions] q ON q.[id] = ptq.[questionId]
    WHERE ${DIAGRAM_PREDICATE.replace(/\[imageData\]|\[imageUrl\]|\[chartData\]|\[visualType\]/g, (m) => `q.${m}`)};
  `)

  const deletedGroupStudyQuestions = await prisma.$executeRawUnsafe(`
    DELETE gsq
    FROM [group_study_questions] gsq
    INNER JOIN [questions] q ON q.[id] = gsq.[questionId]
    WHERE ${DIAGRAM_PREDICATE.replace(/\[imageData\]|\[imageUrl\]|\[chartData\]|\[visualType\]/g, (m) => `q.${m}`)};
  `)

  const deletedQuestionReviews = await prisma.$executeRawUnsafe(`
    DELETE qrv
    FROM [question_reviews] qrv
    INNER JOIN [questions] q ON q.[id] = qrv.[questionId]
    WHERE ${DIAGRAM_PREDICATE.replace(/\[imageData\]|\[imageUrl\]|\[chartData\]|\[visualType\]/g, (m) => `q.${m}`)};
  `)

  const deletedQuestions = await prisma.$executeRawUnsafe(`
    DELETE FROM [questions]
    WHERE ${DIAGRAM_PREDICATE};
  `)

  const deletedArchivedQuestions = await prisma.$executeRawUnsafe(`
    DELETE FROM [archived_questions]
    WHERE
      [imageData] IS NOT NULL
      OR [imageUrl] IS NOT NULL
      OR [chartData] IS NOT NULL;
  `)

  return {
    group_study_answers: deletedGroupStudyAnswers,
    question_results: deletedQuestionResults,
    practice_test_questions: deletedPracticeTestQuestions,
    group_study_questions: deletedGroupStudyQuestions,
    question_reviews: deletedQuestionReviews,
    questions: deletedQuestions,
    archived_questions: deletedArchivedQuestions,
  }
}

async function getActiveNonDiagramCountByCategory(category: string): Promise<number> {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS count
    FROM [questions]
    WHERE
      [isActive] = 1
      AND [category] = @P1
      AND ${NON_DIAGRAM_PREDICATE};
  `, category)) as Array<{ count: unknown }>

  return toNumber(rows[0]?.count)
}

async function backfillCanonicalCategoriesIfNeeded(minTarget: number): Promise<void> {
  const generator = new UnifiedQuestionGenerator()

  printSection(`Backfill Check (minimum ${minTarget} active non-diagram)`)

  for (const target of CANONICAL_TARGETS) {
    let current = await getActiveNonDiagramCountByCategory(target.category)
    let remaining = Math.max(0, minTarget - current)

    if (remaining === 0) {
      console.log(`- ${target.category}: ${current} (OK)`)
      continue
    }

    console.log(`- ${target.category}: ${current} (needs +${remaining})`)

    let stalledRounds = 0
    let attempts = 0
    const maxAttempts = 30

    while (remaining > 0 && attempts < maxAttempts && stalledRounds < 3) {
      attempts += 1
      const requestCount = Math.min(TOPUP_BATCH_SIZE, remaining)

      const result = await generator.generateQuestions({
        moduleType: target.moduleType,
        specificTopics: target.specificTopics,
        mathCount: target.moduleType === 'math' ? requestCount : 0,
        readingCount: target.moduleType === 'reading-writing' ? requestCount : 0,
        includeImages: false,
        includePassages: true,
        storeInDatabase: true,
        skipEvaluation: true,
        enableRetry: false,
        enableValidation: false,
        temperature: 0.7,
      })

      const previous = current
      current = await getActiveNonDiagramCountByCategory(target.category)
      remaining = Math.max(0, minTarget - current)

      const delta = current - previous
      console.log(
        `  attempt ${attempts}: accepted=${result.summary.accepted}, ` +
        `categoryDelta=${delta}, now=${current}, remaining=${remaining}`
      )

      if (delta <= 0) {
        stalledRounds += 1
      } else {
        stalledRounds = 0
      }

      if (remaining > 0) {
        await sleep(TOPUP_DELAY_MS)
      }
    }

    if (remaining > 0) {
      console.warn(`  ⚠ Could not fully reach target for ${target.category}. Remaining: ${remaining}`)
    } else {
      console.log(`  ✅ ${target.category} reached ${current}`)
    }
  }
}

function summarizeTotals(label: string, totals: TotalCountRow): void {
  console.log(`${label}: total=${toNumber(totals.totalCount)}, diagram=${toNumber(totals.diagramCount)}, nonDiagram=${toNumber(totals.nonDiagramCount)}`)
}

function summarizeArchived(label: string, totals: ArchivedTotalsRow): void {
  console.log(`${label}: total=${toNumber(totals.totalCount)}, diagram=${toNumber(totals.diagramCount)}, nonDiagram=${toNumber(totals.nonDiagramCount)}`)
}

async function main(): Promise<void> {
  printSection('Foreign Keys Referencing questions')
  const fkTables = await getForeignKeyTablesReferencingQuestions()
  console.table(fkTables.map((tableName) => ({ tableName })))

  printSection('Before Purge (Active Questions by Category)')
  const beforeByCategory = await getActiveCountsByCategory()
  printActiveCategoryTable(beforeByCategory)

  const beforeTotals = await getActiveTotals()
  summarizeTotals('Before active totals', beforeTotals)

  const beforeArchived = await getArchivedTotals()
  summarizeArchived('Before archived totals', beforeArchived)

  printSection('Purging Diagram Questions')
  const deleted = await deleteDiagramQuestionDependenciesAndRows()
  console.table(
    Object.entries(deleted).map(([table, count]) => ({ table, deletedRows: toNumber(count) }))
  )

  printSection('After Purge (Active Questions by Category)')
  const afterByCategory = await getActiveCountsByCategory()
  printActiveCategoryTable(afterByCategory)

  const afterTotals = await getActiveTotals()
  summarizeTotals('After active totals', afterTotals)

  const afterArchived = await getArchivedTotals()
  summarizeArchived('After archived totals', afterArchived)

  if (toNumber(afterTotals.diagramCount) !== 0) {
    throw new Error(`Diagram purge incomplete: ${toNumber(afterTotals.diagramCount)} active diagram questions remain.`)
  }

  await backfillCanonicalCategoriesIfNeeded(MIN_PER_CATEGORY)

  printSection('Final Verification (Active Questions by Category)')
  const finalByCategory = await getActiveCountsByCategory()
  printActiveCategoryTable(finalByCategory)

  const finalTotals = await getActiveTotals()
  summarizeTotals('Final active totals', finalTotals)

  const canonicalSet = new Set(CANONICAL_TARGETS.map((target) => target.category))
  const nonCanonicalUnderTarget = finalByCategory
    .map((row) => ({
      category: row.category,
      nonDiagram: toNumber(row.nonDiagramCount),
    }))
    .filter((row) => !canonicalSet.has(row.category) && row.nonDiagram < MIN_PER_CATEGORY)

  if (nonCanonicalUnderTarget.length > 0) {
    printSection('Non-Canonical Categories Under Target')
    console.table(nonCanonicalUnderTarget)
  }

  printSection('Done')
  console.log('All active diagram questions removed and canonical categories checked for diagramless minimums.')
}

main()
  .catch((error) => {
    console.error('FATAL:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
