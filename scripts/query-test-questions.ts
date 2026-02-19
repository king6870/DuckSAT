import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showTestQuestions() {
  try {
    const questions = await prisma.question.findMany({
      where: {
        tags: {
          contains: 'v3-test'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        question: true,
        visualType: true,
        imageData: true,
        subtopic: true,
        difficultyScore: true,
        source: true,
        createdAt: true
      }
    });

    console.log('\n🔍 Test Questions in Database (v3-test tag):\n');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    questions.forEach((q, i) => {
      console.log(`Question ${i + 1}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Question: ${q.question.substring(0, 80)}...`);
      console.log(`  Visual Type: ${q.visualType || 'null'}`);
      console.log(`  Has Image: ${q.imageData ? 'YES' : 'NO'}`);
      console.log(`  Subtopic: ${q.subtopic || 'null'}`);
      console.log(`  Difficulty Score: ${q.difficultyScore}`);
      console.log(`  Source: ${q.source}`);
      console.log(`  Created: ${q.createdAt.toISOString()}`);
      console.log('───────────────────────────────────────────────────────────────────\n');
    });

    console.log(`\n✅ Total v3-test questions: ${questions.length}`);
    
    // Summary stats
    const withImages = questions.filter(q => q.imageData !== null).length;
    const byVisualType = questions.reduce((acc, q) => {
      const type = q.visualType || 'null';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Summary:');
    console.log(`  With images: ${withImages}`);
    console.log(`  Without images: ${questions.length - withImages}`);
    console.log('\n  Visual type breakdown:');
    Object.entries(byVisualType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showTestQuestions();
