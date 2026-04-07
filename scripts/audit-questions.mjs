// Quick question audit for spec planning
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.question.count({ where: { isActive: true } });
  console.log(`\nTotal active questions: ${total}`);

  // By moduleType
  const byModule = await prisma.question.groupBy({
    by: ['moduleType'],
    where: { isActive: true },
    _count: true,
  });
  console.log('\nBy moduleType:');
  byModule.forEach(r => console.log(`  ${r.moduleType}: ${r._count}`));

  // By category + difficulty
  const byCatDiff = await prisma.question.groupBy({
    by: ['category', 'difficulty'],
    where: { isActive: true },
    _count: true,
    orderBy: [{ category: 'asc' }, { difficulty: 'asc' }],
  });
  console.log('\nBy category + difficulty:');
  byCatDiff.forEach(r => console.log(`  ${r.category} / ${r.difficulty}: ${r._count}`));

  // Existing published practice tests
  const ptCount = await prisma.practiceTest.count({ where: { isPublished: true } });
  console.log(`\nPublished practice tests: ${ptCount}`);
  
  // Reserved question count
  const reserved = await prisma.question.count({ where: { isActive: true, isReserved: true } });
  console.log(`Reserved questions: ${reserved}`);
  const free = await prisma.question.count({ where: { isActive: true, isReserved: false } });
  console.log(`Free (unreserved) questions: ${free}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
