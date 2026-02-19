import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showTestQuestions() {
  try {
    console.log('\n🔍 Querying database for test questions (generated 2026-02-17 11:16-11:22)...\n');

    // Query for questions from the test generation batch
    const questions = await prisma.question.findMany({
      where: {
        createdAt: {
          gte: new Date('2026-02-17T11:16:00Z'),
          lte: new Date('2026-02-17T11:23:00Z')
        }
      },
      select: {
        id: true,
        question: true,
        visualType: true,
        imageData: true,
        imageAlt: true,
        subtopic: true,
        difficultyScore: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`✅ Found ${questions.length} questions\n`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    questions.forEach((q, index) => {
      console.log(`Question ${index + 1}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Question: ${q.question.substring(0, 80)}...`);
      console.log(`  Visual Type: ${q.visualType || 'null'}`);
      console.log(`  Has Image Data: ${q.imageData ? `YES (${q.imageData.length} bytes)` : 'NO (null)'}`);
      console.log(`  Image Alt: ${q.imageAlt || 'null'}`);
      console.log(`  Subtopic: ${q.subtopic || 'null'}`);
      console.log(`  Difficulty: ${q.difficultyScore}`);
      console.log(`  Created: ${q.createdAt.toISOString()}`);
      console.log('───────────────────────────────────────────────────────────────────\n');
    });

    // Summary statistics
    const byVisualType = questions.reduce((acc, q) => {
      const type = q.visualType || 'null';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const withImages = questions.filter(q => q.imageData !== null).length;
    const withoutImages = questions.filter(q => q.imageData === null).length;

    console.log('\n📊 Summary Statistics:');
    console.log(`  Total questions: ${questions.length}`);
    console.log(`  With image data: ${withImages}`);
    console.log(`  Without image data: ${withoutImages}`);
    console.log(`\n  Visual type breakdown:`);
    Object.entries(byVisualType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showTestQuestions();
