import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNewBatch() {
  const q = await prisma.question.findFirst({
    where: { 
      source: 'v3-batch-feb17-18',
      category: 'math'
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (q) {
    console.log('=== NEWLY IMPORTED QUESTION ===');
    console.log('ID:', q.id);
    console.log('Question:', q.question.substring(0, 150));
    console.log('\nExplanation (first 600 chars):');
    console.log(q.explanation.substring(0, 600));
  } else {
    console.log('No questions found with source: v3-batch-feb17-18');
  }
  
  await prisma.$disconnect();
}

checkNewBatch();
