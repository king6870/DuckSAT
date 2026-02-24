import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

async function main() {
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      moduleType: true,
      tags: true,
    }
  })

  let mathMismatches = 0
  let readingMismatches = 0
  let missingTags = 0

  for (const q of questions) {
    let tags = []
    try {
      tags = q.tags ? JSON.parse(q.tags) : []
    } catch {
      tags = []
    }
    if (q.moduleType === 'math' && !tags.includes('math')) mathMismatches++
    if (q.moduleType === 'reading-writing' && !tags.includes('reading-writing')) readingMismatches++
    if (tags.length === 0) missingTags++
  }

  console.log(`Validation complete.`)
  console.log(`Math tag mismatches: ${mathMismatches}`)
  console.log(`Reading tag mismatches: ${readingMismatches}`)
  console.log(`Questions missing tags: ${missingTags}`)
}

main()
  .catch((error) => {
    console.error('Validation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
