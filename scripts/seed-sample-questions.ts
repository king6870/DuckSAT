import { PrismaClient } from '@prisma/client';
import { sampleQuestions } from '../seeds/sample-questions';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample questions with diagrams...');

  for (const question of sampleQuestions) {
    try {
      // Map the sample question format to the database schema
      const questionData = {
        moduleType: question.type === 'reading' ? 'reading-writing' : 'math',
        difficulty: 'medium', // Default difficulty
        category: question.type === 'diagram' ? 'Geometry' : question.type === 'math' ? 'Algebra' : 'Reading Comprehension',
        subtopic: question.tags?.[0] || question.type,
        question: question.stem,
        passage: question.passage,
        imageUrl: question.imageUrl,
        imageAlt: question.imageAlt,
        options: question.choices.map(c => c.text),
        correctAnswer: question.choices.findIndex(c => c.id === question.answerId),
        explanation: question.explanation || '',
        timeEstimate: 90,
        source: 'seed',
        tags: question.tags || [],
        reviewStatus: question.reviewStatus,
      };

      const created = await prisma.question.create({
        data: questionData,
      });

      console.log(`✅ Created question: ${question.title} (ID: ${created.id})`);
    } catch (error) {
      console.error(`❌ Error creating question ${question.title}:`, error);
    }
  }

  console.log('✨ Sample questions seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding sample questions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
