/**
 * Test Practice Tests API
 * Verifies that seeded practice tests are accessible
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPracticeTests() {
  console.log('🧪 Testing Practice Tests API Data\n');

  // Fetch all practice tests
  const tests = await prisma.practiceTest.findMany({
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Found ${tests.length} practice tests:\n`);

  for (const test of tests) {
    console.log(`  ${test.name}`);
    console.log(`    ID: ${test.id}`);
    console.log(`    Published: ${test.isPublished ? '✅ Yes' : '❌ No'}`);
    console.log(`    Questions: ${test._count.questions}`);
    console.log(`    Difficulty: ${test.difficulty}`);
    console.log('');
  }

  // Verify question distribution for Test 1
  if (tests.length > 0) {
    const test1 = tests[0];
    console.log(`📝 Question Distribution for ${test1.name}:\n`);

    const questions = await prisma.practiceTestQuestion.findMany({
      where: { practiceTestId: test1.id },
      include: {
        question: {
          select: {
            category: true,
            difficulty: true,
            moduleType: true,
          },
        },
      },
      orderBy: [{ moduleIndex: 'asc' }, { orderIndex: 'asc' }],
    });

    // Group by module
    const moduleGroups = questions.reduce((acc, q) => {
      const key = q.moduleIndex;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {} as Record<number, typeof questions>);

    for (const [moduleIndex, moduleQuestions] of Object.entries(moduleGroups)) {
      const moduleType = moduleQuestions[0].question.moduleType;
      console.log(`  Module ${moduleIndex} (${moduleType}):`);

      // Group by category
      const categoryGroups = moduleQuestions.reduce((acc, q) => {
        const cat = q.question.category;
        if (!acc[cat]) acc[cat] = { easy: 0, medium: 0, hard: 0 };
        acc[cat][q.question.difficulty as 'easy' | 'medium' | 'hard']++;
        return acc;
      }, {} as Record<string, { easy: number; medium: number; hard: number }>);

      for (const [category, counts] of Object.entries(categoryGroups)) {
        const total = counts.easy + counts.medium + counts.hard;
        console.log(`    ${category}: ${total} (${counts.easy}E, ${counts.medium}M, ${counts.hard}H)`);
      }
      console.log('');
    }
  }

  // Check reserved questions count
  const reservedCount = await prisma.question.count({
    where: { isReserved: true },
  });

  const unreservedCount = await prisma.question.count({
    where: { isReserved: false, isActive: true },
  });

  console.log('📈 Question Reservation Status:');
  console.log(`  Reserved: ${reservedCount}`);
  console.log(`  Unreserved: ${unreservedCount}`);
  console.log(`  Total Active: ${reservedCount + unreservedCount}`);
}

testPracticeTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
