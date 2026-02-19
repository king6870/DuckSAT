import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countQuestions() {
  try {
    const math = await prisma.question.count({ 
      where: { moduleType: 'math', isActive: true } 
    });
    
    const reading = await prisma.question.count({ 
      where: { moduleType: 'reading-writing', isActive: true } 
    });
    
    console.log(`\n📊 Question Inventory:`);
    console.log(`Math questions: ${math}`);
    console.log(`Reading questions: ${reading}`);
    console.log(`Total: ${math + reading}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countQuestions();
