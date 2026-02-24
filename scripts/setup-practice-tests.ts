import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PRACTICE_TESTS = [
  {
    id: 'SAT_PRACTICE_TEST_1_ID',
    name: 'SAT Practice Test 1',
    description: 'Official SAT Practice Test 1',
    difficulty: 'standard',
    isPublished: true
  },
  {
    id: 'SAT_PRACTICE_TEST_2_ID',
    name: 'SAT Practice Test 2',
    description: 'Official SAT Practice Test 2',
    difficulty: 'standard',
    isPublished: true
  }
];

async function main() {
  for (const test of PRACTICE_TESTS) {
    const exists = await prisma.practiceTest.findUnique({ where: { id: test.id } });
    if (!exists) {
      await prisma.practiceTest.create({ data: test });
      console.log(`Created practice test: ${test.name}`);
    } else {
      console.log(`Practice test already exists: ${test.name}`);
    }
  }

  // Optionally, generate extra questions if needed
  const questionCount = await prisma.question.count();
  if (questionCount < 196) {
    const toGenerate = 196 - questionCount;
    for (let i = 0; i < toGenerate; i++) {
      await prisma.question.create({
        data: {
          question: `Generated question ${i + 1}`,
          moduleType: 'reading-writing',
          difficulty: 'medium',
          category: 'generated',
          options: JSON.stringify(['A', 'B', 'C', 'D']),
          correctAnswer: 0,
          explanation: 'Auto-generated explanation.',
          timeEstimate: 75,
          tags: JSON.stringify(['generated']),
          isActive: true,
          isReserved: false
        }
      });
    }
    console.log(`Generated ${toGenerate} extra questions.`);
  } else {
    console.log('Sufficient questions already exist.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
