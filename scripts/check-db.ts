import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.question.groupBy({ by: ['correctAnswer'], _count: true, orderBy: { correctAnswer: 'asc' } });
  console.log('correctAnswer distribution:', JSON.stringify(counts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
