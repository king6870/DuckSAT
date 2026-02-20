/**
 * Seed Practice Tests 1 & 2
 * Epic #61: Fixed SAT Practice Tests
 * 
 * Creates two balanced practice tests with 98 questions each (27+27 RW, 22+22 Math)
 * Distribution: 30% easy, 50% medium, 20% hard within each category
 * 
 * Usage: npx tsx scripts/seed-practice-tests.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionDistribution {
  category: string;
  moduleType: string;
  moduleIndex: number;
  targetCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

// Define question distribution for SAT practice tests
// Module 0 & 1: Reading-Writing (27 questions each)
// Module 2 & 3: Math (22 questions each)
// Based on actual database categories from check-categories.ts
const DISTRIBUTION: QuestionDistribution[] = [
  // Module 0: Reading-Writing Module 1 (27 questions)
  { category: 'reading-comprehension', moduleType: 'reading-writing', moduleIndex: 0, targetCount: 15, easyCount: 5, mediumCount: 7, hardCount: 3 },
  { category: 'vocabulary', moduleType: 'reading-writing', moduleIndex: 0, targetCount: 6, easyCount: 2, mediumCount: 3, hardCount: 1 },
  { category: 'rhetoric', moduleType: 'reading-writing', moduleIndex: 0, targetCount: 4, easyCount: 1, mediumCount: 2, hardCount: 1 },
  { category: 'synthesis', moduleType: 'reading-writing', moduleIndex: 0, targetCount: 2, easyCount: 1, mediumCount: 1, hardCount: 0 },
  
  // Module 1: Reading-Writing Module 2 (27 questions)
  { category: 'reading-comprehension', moduleType: 'reading-writing', moduleIndex: 1, targetCount: 15, easyCount: 5, mediumCount: 7, hardCount: 3 },
  { category: 'vocabulary', moduleType: 'reading-writing', moduleIndex: 1, targetCount: 6, easyCount: 2, mediumCount: 3, hardCount: 1 },
  { category: 'rhetoric', moduleType: 'reading-writing', moduleIndex: 1, targetCount: 4, easyCount: 1, mediumCount: 2, hardCount: 1 },
  { category: 'synthesis', moduleType: 'reading-writing', moduleIndex: 1, targetCount: 2, easyCount: 1, mediumCount: 1, hardCount: 0 },
  
  // Module 2: Math Module 1 (22 questions)
  { category: 'algebra', moduleType: 'math', moduleIndex: 2, targetCount: 9, easyCount: 3, mediumCount: 5, hardCount: 1 },
  { category: 'advanced-math', moduleType: 'math', moduleIndex: 2, targetCount: 6, easyCount: 2, mediumCount: 3, hardCount: 1 },
  { category: 'geometry', moduleType: 'math', moduleIndex: 2, targetCount: 5, easyCount: 1, mediumCount: 3, hardCount: 1 },
  { category: 'statistics', moduleType: 'math', moduleIndex: 2, targetCount: 2, easyCount: 1, mediumCount: 1, hardCount: 0 },
  
  // Module 3: Math Module 2 (22 questions)
  { category: 'algebra', moduleType: 'math', moduleIndex: 3, targetCount: 9, easyCount: 3, mediumCount: 5, hardCount: 1 },
  { category: 'advanced-math', moduleType: 'math', moduleIndex: 3, targetCount: 6, easyCount: 2, mediumCount: 3, hardCount: 1 },
  { category: 'geometry', moduleType: 'math', moduleIndex: 3, targetCount: 5, easyCount: 1, mediumCount: 3, hardCount: 1 },
  { category: 'statistics', moduleType: 'math', moduleIndex: 3, targetCount: 2, easyCount: 1, mediumCount: 1, hardCount: 0 },
];

async function selectQuestionsForDistribution(
  distribution: QuestionDistribution,
  usedQuestionIds: Set<string>
) {
  const selected: { questionId: string; moduleIndex: number; orderIndex: number }[] = [];

  // Select easy questions
  const easyQuestions = await prisma.question.findMany({
    where: {
      isActive: true,
      isReserved: false,
      moduleType: distribution.moduleType,
      category: distribution.category,
      difficulty: 'easy',
      id: { notIn: Array.from(usedQuestionIds) },
    },
    select: { id: true },
    take: distribution.easyCount,
  });

  for (const q of easyQuestions) {
    selected.push({ questionId: q.id, moduleIndex: distribution.moduleIndex, orderIndex: 0 });
    usedQuestionIds.add(q.id);
  }

  // Select medium questions
  const mediumQuestions = await prisma.question.findMany({
    where: {
      isActive: true,
      isReserved: false,
      moduleType: distribution.moduleType,
      category: distribution.category,
      difficulty: 'medium',
      id: { notIn: Array.from(usedQuestionIds) },
    },
    select: { id: true },
    take: distribution.mediumCount,
  });

  for (const q of mediumQuestions) {
    selected.push({ questionId: q.id, moduleIndex: distribution.moduleIndex, orderIndex: 0 });
    usedQuestionIds.add(q.id);
  }

  // Select hard questions
  const hardQuestions = await prisma.question.findMany({
    where: {
      isActive: true,
      isReserved: false,
      moduleType: distribution.moduleType,
      category: distribution.category,
      difficulty: 'hard',
      id: { notIn: Array.from(usedQuestionIds) },
    },
    select: { id: true },
    take: distribution.hardCount,
  });

  for (const q of hardQuestions) {
    selected.push({ questionId: q.id, moduleIndex: distribution.moduleIndex, orderIndex: 0 });
    usedQuestionIds.add(q.id);
  }

  return selected;
}

async function createPracticeTest(
  testNumber: number,
  usedQuestionIds: Set<string>
) {
  console.log(`\n📝 Creating Practice Test ${testNumber}...`);

  const testName = `SAT Practice Test ${testNumber}`;
  const testDescription = `Full-length SAT practice test ${testNumber} with 98 questions (27+27 RW, 22+22 Math). Balanced difficulty distribution.`;

  // Collect questions for all modules
  const allQuestions: { questionId: string; moduleIndex: number; orderIndex: number }[] = [];
  
  for (const dist of DISTRIBUTION) {
    const questions = await selectQuestionsForDistribution(dist, usedQuestionIds);
    allQuestions.push(...questions);
    
    console.log(
      `  Module ${dist.moduleIndex} ${dist.category}: ${questions.length}/${dist.targetCount} ` +
      `(${dist.easyCount}E, ${dist.mediumCount}M, ${dist.hardCount}H)`
    );
  }

  // Verify we have exactly 98 questions
  if (allQuestions.length !== 98) {
    throw new Error(
      `Expected 98 questions but got ${allQuestions.length}. ` +
      `Insufficient unreserved questions in database.`
    );
  }

  // Assign global orderIndex (0-97) based on module order and difficulty progression
  allQuestions.sort((a, b) => a.moduleIndex - b.moduleIndex);
  let globalOrderIndex = 0;
  for (const question of allQuestions) {
    question.orderIndex = globalOrderIndex++;
  }

  // Create practice test in transaction
  await prisma.$transaction(async (tx) => {
    // Create practice test
    const practiceTest = await tx.practiceTest.create({
      data: {
        name: testName,
        description: testDescription,
        difficulty: 'standard',
        isPublished: false, // Created as draft
      },
    });

    console.log(`  ✓ Created practice test: ${practiceTest.name} (ID: ${practiceTest.id})`);

    // Create practice test questions
    await tx.practiceTestQuestion.createMany({
      data: allQuestions.map(q => ({
        practiceTestId: practiceTest.id,
        questionId: q.questionId,
        moduleIndex: q.moduleIndex,
        orderIndex: q.orderIndex,
      })),
    });

    console.log(`  ✓ Added ${allQuestions.length} questions`);

    // Mark questions as reserved
    await tx.question.updateMany({
      where: {
        id: { in: allQuestions.map(q => q.questionId) },
      },
      data: {
        isReserved: true,
      },
    });

    console.log(`  ✓ Marked ${allQuestions.length} questions as reserved`);

    // Auto-publish the test
    await tx.practiceTest.update({
      where: { id: practiceTest.id },
      data: { isPublished: true },
    });

    console.log(`  ✓ Published practice test`);
  });

  console.log(`✅ Practice Test ${testNumber} created successfully\n`);
}

async function main() {
  console.log('🚀 Seeding Practice Tests 1 & 2\n');

  // Check available unreserved questions
  const totalQuestions = await prisma.question.count({
    where: { isActive: true, isReserved: false },
  });

  console.log(`📊 Available unreserved questions: ${totalQuestions}`);
  
  if (totalQuestions < 196) {
    throw new Error(
      `Insufficient questions. Need 196 (2 tests × 98), but only ${totalQuestions} unreserved questions available.`
    );
  }

  // Track used question IDs across both tests
  const usedQuestionIds = new Set<string>();

  // Create Practice Test 1
  await createPracticeTest(1, usedQuestionIds);

  // Create Practice Test 2
  await createPracticeTest(2, usedQuestionIds);

  // Final statistics
  const remainingQuestions = await prisma.question.count({
    where: { isActive: true, isReserved: false },
  });

  console.log('📈 Summary:');
  console.log(`  Total questions reserved: ${usedQuestionIds.size}`);
  console.log(`  Remaining unreserved questions: ${remainingQuestions}`);
  console.log(`  Reserve rate: ${((usedQuestionIds.size / totalQuestions) * 100).toFixed(1)}%`);

  if (remainingQuestions < 400) {
    console.warn(`⚠️  Warning: Only ${remainingQuestions} unreserved questions remain. Consider generating more questions.`);
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
