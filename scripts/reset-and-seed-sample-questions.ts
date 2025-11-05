import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧹 Deleting all questions...');
    await prisma.question.deleteMany();

    const mathSamples = [
      {
        moduleType: 'math',
        difficulty: 'easy',
        category: 'Algebra',
        subtopic: 'Linear Equations',
        question: 'What is the value of x in 2x = 10?',
        passage: null,
        options: ['2', '5', '10', '20'],
        correctAnswer: 1,
        explanation: 'Divide both sides by 2: 2x = 10 -> x = 5.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: null,
        timeEstimate: 30,
        source: 'Seed Script',
        tags: ['easy', 'Algebra', 'Linear Equations'],
        isActive: true,
      },
      {
        moduleType: 'math',
        difficulty: 'medium',
        category: 'Geometry',
        subtopic: 'Triangles',
        question: 'A triangle has angles 90°, 45° and x°. What is x?',
        passage: null,
        options: ['45', '30', '60', '90'],
        correctAnswer: 0,
        explanation: 'Sum of triangle’s angles is 180°. 180 - 90 - 45 = 45°.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: null,
        timeEstimate: 30,
        source: 'Seed Script',
        tags: ['medium', 'Geometry', 'Triangles'],
        isActive: true,
      }
    ];

    const rwSamples = [
      {
        moduleType: 'reading-writing',
        difficulty: 'easy',
        category: 'Grammar',
        subtopic: 'Comma Usage',
        question: 'Where should the comma go: "After dinner we went to the movie theater"?',
        passage: null,
        options: [
          'After "dinner"',
          'After "went"',
          'After "to"',
          'No comma needed'
        ],
        correctAnswer: 0,
        explanation: 'Introductory phrases should be followed by a comma.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: null,
        timeEstimate: 20,
        source: 'Seed Script',
        tags: ['easy', 'Grammar', 'Comma Usage'],
        isActive: true,
      },
      {
        moduleType: 'reading-writing',
        difficulty: 'medium',
        category: 'Rhetorical Synthesis',
        subtopic: 'Purpose',
        question: 'Which choice best states the main purpose of the passage?',
        passage: 'The author describes the migration patterns of monarch butterflies.',
        options: [
          'To explain a natural phenomenon.',
          'To criticize an opinion.',
          'To narrate a personal experience.',
          'To recount a historical event.'
        ],
        correctAnswer: 0,
        explanation: 'The passage is explicative about butterflies.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: null,
        timeEstimate: 30,
        source: 'Seed Script',
        tags: ['medium', 'Rhetorical Synthesis', 'Purpose'],
        isActive: true,
      }
    ];

    const created = await prisma.question.createMany({
      data: [...mathSamples, ...rwSamples],
    });
    console.log(`✅ Seeded ${created.count} sample questions.`);

    // Confirm with a quick find
    const total = await prisma.question.count();
    console.log(`📦 Total questions in database now: ${total}`);

  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();