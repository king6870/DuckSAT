import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeQuestionCounts() {
  const reading = await prisma.question.count({
    where: { isActive: true, category: 'reading' }
  });

  const math = await prisma.question.count({
    where: { 
      isActive: true, 
      category: { in: ['algebra', 'geometry', 'statistics', 'trigonometry'] } 
    }
  });

  const total = await prisma.question.count({
    where: { isActive: true }
  });

  const breakdown = await prisma.question.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: true
  });

  console.log('📊 Current Question Distribution\n');
  console.log('Reading:', reading);
  console.log('Math Total:', math);
  breakdown
    .filter(b => ['algebra', 'geometry', 'statistics', 'trigonometry'].includes(b.category))
    .forEach(b => console.log(`  - ${b.category}:`, b._count));
  console.log('\nOther categories:');
  breakdown
    .filter(b => !['algebra', 'geometry', 'statistics', 'trigonometry', 'reading'].includes(b.category))
    .forEach(b => console.log(`  - ${b.category}:`, b._count));
  console.log('\nTotal Active:', total);
  
  console.log('\n🎯 Target: 400 reading, 400 math');
  console.log('📈 Gap Analysis:');
  console.log(`  Reading needs: ${400 - reading} more questions`);
  console.log(`  Math needs: ${400 - math} more questions`);
  console.log(`  Total to generate: ${(400 - reading) + (400 - math)} questions`);
}

analyzeQuestionCounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
