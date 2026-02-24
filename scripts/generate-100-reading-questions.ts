import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

// Generate 100 new reading-writing questions (simple placeholder)
async function generateReadingQuestions(count = 100) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push({
      question: `Auto-generated reading-writing Q${i+1}`,
      moduleType: 'reading-writing',
      category: 'reading-writing',
      difficulty: 'medium',
      isActive: true,
      isReserved: false,
      options: JSON.stringify(["A", "B", "C", "D"]),
      correctAnswer: 0,
      explanation: "Auto-generated explanation",
      tags: JSON.stringify(["reading-writing"]),
      timeEstimate: 90,
    });
  }
  await prisma.question.createMany({ data: questions });
  console.log(`Generated ${count} reading-writing questions.`);
}

async function main() {
  await generateReadingQuestions(100);
  await prisma.$disconnect();
}

main().catch(console.error);
