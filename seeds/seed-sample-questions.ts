import { PrismaClient } from '@prisma/client';
import { sampleQuestions } from './sample-questions';

const prisma = new PrismaClient();

async function seedSampleQuestions() {
  try {
    console.log('🌱 Seeding sample questions with diagrams...');

    // Find or create a seed user
    const seedUser = await prisma.user.upsert({
      where: { email: 'seed@ducksat.com' },
      update: {},
      create: {
        email: 'seed@ducksat.com',
        name: 'Seed User',
      },
    });

    console.log(`✓ Found/created seed user: ${seedUser.email}`);

    // Seed each sample question
    for (const question of sampleQuestions) {
      const existingQuestion = await prisma.question.findUnique({
        where: { id: question.id },
      });

      if (existingQuestion) {
        console.log(`⊙ Question ${question.id} already exists, skipping...`);
        continue;
      }

      await prisma.question.create({
        data: {
          id: question.id,
          type: question.type,
          title: question.title,
          passage: question.passage,
          diagramSvg: question.diagramSvg,
          imageUrl: question.imageUrl,
          imageAlt: question.imageAlt,
          stem: question.stem,
          choices: question.choices,
          answerId: question.answerId,
          explanation: question.explanation,
          tags: question.tags || [],
          createdById: seedUser.id,
          reviewStatus: question.reviewStatus || 'pending',
        },
      });

      console.log(`✓ Created question: ${question.id} - ${question.title}`);
    }

    console.log('✅ Sample questions seeded successfully!');
    console.log(`Total questions seeded: ${sampleQuestions.length}`);

  } catch (error) {
    console.error('❌ Error seeding sample questions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedSampleQuestions()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedSampleQuestions;
