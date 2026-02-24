import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

const READING_TAG = 'reading-writing'
const MATH_TAG = 'math'

async function main() {
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      moduleType: true,
      tags: true,
      category: true,
      subtopic: true,
    }
  })

  let updated = 0
  for (const q of questions) {
    let tags = []
    try {
      tags = q.tags ? JSON.parse(q.tags) : []
    } catch {
      tags = []
    }
    // Add moduleType tag
    let desiredTag = q.moduleType === 'math' ? MATH_TAG : READING_TAG
    if (!tags.includes(desiredTag)) tags.push(desiredTag)
    // Add category tag
    if (q.category && !tags.includes(q.category)) tags.push(q.category)
    // Add subtopic tag
    if (q.subtopic && !tags.includes(q.subtopic)) tags.push(q.subtopic)
    // Update if changed
    await prisma.question.update({
      where: { id: q.id },
      data: { tags: JSON.stringify(tags) }
    })
    updated += 1
  }
  console.log(`Backfill tags complete. Updated ${updated} question(s).`)
}

main()
  .catch((error) => {
    console.error('Backfill tags failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
