const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

const READING_CATEGORIES = new Set([
  'reading-comprehension',
  'grammar',
  'vocabulary',
  'writing',
  'reading-writing'
])

const isReadingCategory = (category: string | null | undefined) => {
  if (!category) return false
  const normalized = category.toLowerCase()
  if (READING_CATEGORIES.has(normalized)) return true
  return normalized.includes('reading') || normalized.includes('grammar') || normalized.includes('vocab') || normalized.includes('writing')
}
import { PrismaClient } from '@prisma/client';

const inferModuleType = (q: {
  passage: string | null
  category: string | null
  subtopicRef?: { topic?: { moduleType?: string | null } | null } | null
}) => {
  const topicModuleType = q.subtopicRef?.topic?.moduleType
  if (topicModuleType === 'math' || topicModuleType === 'reading-writing') return topicModuleType
  if (q.passage) return 'reading-writing'
  if (isReadingCategory(q.category)) return 'reading-writing'
  return 'math'
}

async function main() {
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      moduleType: true,
      passage: true,
      category: true,
      subtopicRef: {
        select: {
          topic: {
            select: { moduleType: true }
          }
        }
      }
    }
  })

  let updated = 0
  for (const q of questions) {
    const desired = inferModuleType(q)
    if (q.moduleType !== desired) {
      await prisma.question.update({
        where: { id: q.id },
        data: { moduleType: desired }
      })
      updated += 1
    }
  }

  console.log(`Backfill complete. Updated ${updated} question(s).`)
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
