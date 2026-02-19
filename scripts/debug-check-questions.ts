import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuestions() {
  // Check questions with errors
  const q1 = await prisma.question.findUnique({ 
    where: { id: 'cmlqrhqak0000iuwwt8x9dy8n' }, 
    select: { id: true, question: true } 
  });
  
  console.log('\n=== Q1 (has \\right error) ===');
  console.log('Question:', JSON.stringify(q1?.question));
  
  const q2 = await prisma.question.findUnique({ 
    where: { id: 'cmlqrhqib0003iuwwg8kjo3ya' }, 
    select: { id: true, explanation: true } 
  });
  
  console.log('\n=== Q2 (has incomplete \\frac) ===');
  console.log('Explanation (first 400 chars):', JSON.stringify(q2?.explanation?.slice(0, 400)));
  
  await prisma.$disconnect();
}

checkQuestions();
