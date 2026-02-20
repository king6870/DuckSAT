/**
 * Check available question categories and counts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCategories() {
  console.log('🔍 Checking available question categories...\n');

  // Group by category and count
  const categories = await prisma.question.groupBy({
    by: ['category', 'moduleType', 'difficulty'],
    where: {
      isActive: true,
      isReserved: false,
    },
    _count: true,
  });

  // Organize by moduleType
  const rwCategories = categories.filter(c => c.moduleType === 'reading-writing');
  const mathCategories = categories.filter(c => c.moduleType === 'math');

  console.log('📖 Reading-Writing Categories:');
  console.log('─'.repeat(60));
  rwCategories.forEach(cat => {
    console.log(`  ${cat.category.padEnd(30)} ${cat.difficulty.padEnd(10)} ${cat._count}`);
  });

  console.log('\n🔢 Math Categories:');
  console.log('─'.repeat(60));
  mathCategories.forEach(cat => {
    console.log(`  ${cat.category.padEnd(30)} ${cat.difficulty.padEnd(10)} ${cat._count}`);
  });

  console.log('\n📊 Summary by Category:');
  console.log('─'.repeat(60));
  const categoryTotals = await prisma.question.groupBy({
    by: ['category', 'moduleType'],
    where: {
      isActive: true,
      isReserved: false,
    },
    _count: true,
  });

  categoryTotals.forEach(cat => {
    console.log(`  ${cat.category.padEnd(30)} ${cat.moduleType.padEnd(20)} ${cat._count}`);
  });
}

checkCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
