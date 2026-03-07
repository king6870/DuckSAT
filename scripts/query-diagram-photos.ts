import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      imageData: { not: null },
      isActive: true
    },
    select: {
      id: true,
      question: true,
      imageData: true,
      imageMimeType: true,
      imageAlt: true,
      category: true,
      subtopic: true,
      difficulty: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${questions.length} questions with diagrams.`);
  questions.forEach((q, i) => {
    const imgTag = `<img src="data:${q.imageMimeType};base64,${q.imageData?.toString('base64')}" alt="${q.imageAlt || 'Diagram'}" style="max-width:400px;max-height:300px;border-radius:8px;border:1px solid #b3d8ff;margin-bottom:12px;" />`;
    console.log(`\n${i + 1}. ID: ${q.id}`);
    console.log(`Question: ${q.question.substring(0, 80)}...`);
    console.log(`Category: ${q.category}, Subtopic: ${q.subtopic}, Difficulty: ${q.difficulty}`);
    console.log(`Created: ${q.createdAt.toISOString()}`);
    console.log(`Diagram: ${imgTag}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
