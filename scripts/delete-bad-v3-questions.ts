import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteBadQuestions() {
  // The 3 questions we just imported with mismatched diagrams
  const badQuestionIds = [
    'cmlqybvto0000iulwmt6ll49w', // Algebra question with geometry diagram
    'cmlqybvx00001iulwlvjkcuuy', // Geometry question (this one might be OK)
    'cmlqybvyv0002iulwtbbzc7y7'  // IQR question with geometry diagram
  ];

  console.log('🗑️  Deleting 3 questions with mismatched diagrams...\n');

  for (const id of badQuestionIds) {
    try {
      const question = await prisma.question.findUnique({
        where: { id },
        select: { question: true, id: true }
      });

      if (question) {
        await prisma.question.delete({
          where: { id }
        });
        console.log(`✅ Deleted: ${id}`);
        console.log(`   Question: ${question.question.substring(0, 60)}...\n`);
      } else {
        console.log(`⚠️  Question ${id} not found\n`);
      }
    } catch (error) {
      console.error(`❌ Error deleting ${id}:`, error);
    }
  }

  // Verify remaining count
  const remaining = await prisma.question.count({
    where: { imageData: { not: null } }
  });

  console.log(`\n📊 Questions with diagrams remaining: ${remaining}`);
  
  await prisma.$disconnect();
}

deleteBadQuestions();
