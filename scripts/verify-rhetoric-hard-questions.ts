import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      category: 'rhetoric',
      moduleType: 'reading-writing',
      difficulty: 'hard',
      isActive: true,
      isReserved: false,
    },
    select: { id: true, question: true },
  });
  console.log('Count:', questions.length);
  questions.forEach(q => console.log(q.question));
  await prisma.$disconnect();
}

main().catch(console.error);
