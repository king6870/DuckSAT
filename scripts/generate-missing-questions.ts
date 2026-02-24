
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple question generator for missing categories/difficulties
async function generateQuestions({ category, moduleType, difficulty, count }) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push({
      question: `Auto-generated ${category} (${difficulty}) Q${i+1}`,
      moduleType,
      category,
      difficulty,
      isActive: true,
      isReserved: false,
      options: JSON.stringify(["A", "B", "C", "D"]),
      correctAnswer: 0,
      explanation: "Auto-generated explanation",
      tags: JSON.stringify(["auto-generated"]),
      timeEstimate: 60,
    });
  }
  await prisma.question.createMany({ data: questions });
  console.log(`Generated ${count} questions for ${category} (${difficulty})`);
}

async function main() {
  // Example: Generate 2 hard rhetoric questions for reading-writing
  await generateQuestions({ category: "rhetoric", moduleType: "reading-writing", difficulty: "hard", count: 2 });
  // Add more calls for other missing categories/difficulties as needed
  await prisma.$disconnect();
}

main().catch(console.error);
