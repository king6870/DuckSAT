const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

// Generate more questions for math and reading-writing
async function generateQuestions(params) {
  const { category, moduleType, difficulty, count, subtopic } = params;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const tags = [moduleType, category];
    if (subtopic) tags.push(subtopic); // subtopic is now correctly accessed from params
    questions.push({
      question: `Auto-generated ${category} (${difficulty}) Q${i+1}`,
      moduleType,
      category,
      subtopic: subtopic || '',
      difficulty,
      isActive: true,
      isReserved: false,
      options: JSON.stringify(["A", "B", "C", "D"]),
      correctAnswer: 0,
      explanation: "Auto-generated explanation",
      tags: JSON.stringify(tags),
      timeEstimate: moduleType === 'math' ? 120 : 90,
    });
  }
  await prisma.question.createMany({ data: questions });
  console.log(`Generated ${count} questions for ${category} (${difficulty})${subtopic ? ' (' + subtopic + ')' : ''}`);
}

async function main() {
  await generateQuestions({ category: "algebra", moduleType: "math", difficulty: "medium", count: 50, subtopic: "linear-equations" });
  await generateQuestions({ category: "geometry", moduleType: "math", difficulty: "medium", count: 50, subtopic: "triangles" });
  await generateQuestions({ category: "reading-writing", moduleType: "reading-writing", difficulty: "medium", count: 50, subtopic: "main-idea" });
  await prisma.$disconnect();
}

main().catch(console.error);
