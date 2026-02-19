import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuestion() {
  const q = await prisma.question.findUnique({
    where: { id: 'cmlqrhqu0000aiuwwukrlzdk5' },
    select: { 
      id: true,
      question: true,
      explanation: true,
      options: true
    }
  });
  
  console.log('\n=== RAW DATABASE CONTENT ===\n');
  console.log('Question:', q?.question.slice(0, 200));
  console.log('\nExplanation (first 300 chars):');
  console.log(q?.explanation.slice(0, 300));
  console.log('\nOptions:');
  console.log(q?.options);
  
  await prisma.$disconnect();
}

checkQuestion();
