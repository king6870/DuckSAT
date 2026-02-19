import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSpecificQuestions() {
  const idsToDelete = [
    'cmlqrhrg5000oiuww7j590hj4',
    'cmlqrhr86000jiuwwul0l2itt',
    'cmlqrhqlo0005iuwwel3snuw6'
  ];

  console.log(`🗑️  Deleting ${idsToDelete.length} questions with bad LaTeX...\n`);

  const result = await prisma.question.deleteMany({
    where: { id: { in: idsToDelete } }
  });

  console.log(`✅ Deleted ${result.count} questions`);
  
  const remaining = await prisma.question.count({ where: { isActive: true } });
  console.log(`📊 Remaining active questions: ${remaining}`);
}

deleteSpecificQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
