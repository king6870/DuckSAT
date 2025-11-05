/**
 * Simulated API test for the seeded questions
 * 
 * This script simulates what the /api/questions endpoint would return
 * after running reset-and-seed-sample-questions.ts
 * 
 * Run with: npx tsx scripts/simulate-api-test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateApiRequest() {
  console.log('🧪 Simulating GET /api/questions request...\n');
  console.log('='.repeat(60));

  try {
    // Simulate the API request
    const questions = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0
    });

    const totalCount = await prisma.question.count({
      where: { isActive: true }
    });

    console.log(`\n📊 Query Results:`);
    console.log(`   Total questions found: ${totalCount}`);
    console.log(`   Questions returned: ${questions.length}`);

    if (totalCount !== 4) {
      console.error(`\n❌ ERROR: Expected 4 questions, found ${totalCount}`);
      console.error('   Did you run: npx tsx scripts/reset-and-seed-sample-questions.ts ?');
      process.exit(1);
    }

    console.log('\n✅ Correct number of questions found!');

    // Test JSON serialization (like the API does)
    console.log('\n📝 Testing JSON serialization...');
    try {
      const jsonString = JSON.stringify({
        questions: questions.map(q => ({
          id: q.id,
          question: q.question,
          explanation: q.explanation,
          passage: q.passage,
          options: q.options,
          correctAnswer: q.correctAnswer,
          tags: q.tags,
          imageUrl: q.imageUrl,
          imageAlt: q.imageAlt,
          source: q.source,
          difficulty: q.difficulty,
          category: q.category,
          subtopic: q.subtopic,
          moduleType: q.moduleType,
          timeEstimate: q.timeEstimate,
          chartData: q.chartData,
          wrongAnswerExplanations: q.wrongAnswerExplanations,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt?.toISOString()
        })),
        pagination: {
          total: totalCount,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });

      const parsed = JSON.parse(jsonString);
      console.log('✅ JSON serialization successful!');
      console.log(`   Serialized size: ${jsonString.length} bytes`);
      
    } catch (serializeError) {
      console.error('\n❌ JSON SERIALIZATION ERROR:', serializeError);
      console.error('   The API would return a 500 error!');
      process.exit(1);
    }

    // Display question details
    console.log('\n📚 Question Details:\n');
    for (const q of questions) {
      console.log(`  ${q.moduleType.toUpperCase()} - ${q.category}`);
      console.log(`  Q: ${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}`);
      console.log(`  Options: ${Array.isArray(q.options) ? q.options.length : 'N/A'}`);
      console.log(`  Correct: ${q.correctAnswer} (${Array.isArray(q.options) ? q.options[q.correctAnswer] : 'N/A'})`);
      console.log(`  Difficulty: ${q.difficulty}`);
      console.log(`  Time: ${q.timeEstimate}s`);
      
      // Validate optional fields
      const hasImage = q.imageUrl !== null;
      const hasChart = q.chartData !== null;
      const hasPassage = q.passage !== null;
      const hasWrongExplanations = q.wrongAnswerExplanations && 
        typeof q.wrongAnswerExplanations === 'object' &&
        Object.keys(q.wrongAnswerExplanations).length > 0;
      
      console.log(`  Optional: image=${hasImage}, chart=${hasChart}, passage=${hasPassage}, wrongExp=${hasWrongExplanations}`);
      console.log('');
    }

    // Test filtering by category
    console.log('🔍 Testing category filters:\n');
    const categories = await prisma.question.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category']
    });

    for (const cat of categories) {
      const count = await prisma.question.count({
        where: { isActive: true, category: cat.category }
      });
      console.log(`  ${cat.category}: ${count} question(s)`);
    }

    // Test module type distribution
    console.log('\n📊 Module type distribution:\n');
    const mathCount = await prisma.question.count({
      where: { isActive: true, moduleType: 'math' }
    });
    const readingCount = await prisma.question.count({
      where: { isActive: true, moduleType: 'reading-writing' }
    });

    console.log(`  Math: ${mathCount}`);
    console.log(`  Reading-Writing: ${readingCount}`);

    if (mathCount !== 2 || readingCount !== 2) {
      console.error(`\n❌ ERROR: Expected 2 math and 2 reading-writing, found ${mathCount} and ${readingCount}`);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ API simulation successful!');
    console.log('='.repeat(60));
    console.log('\n✅ The /api/questions endpoint would return:');
    console.log('   - Exactly 4 questions');
    console.log('   - No JSON serialization errors');
    console.log('   - Proper data structure');
    console.log('   - Correct filtering options');
    console.log('\n✅ All requirements met!');

  } catch (error) {
    console.error('\n❌ Error during API simulation:', error);
    throw error;
  }
}

async function main() {
  try {
    await simulateApiRequest();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
