/**
 * Seed Database from Sample Questions
 * 
 * This script demonstrates how to import and use the sample questions
 * from the seeds directory to populate the database.
 * 
 * Run with: npx tsx scripts/seed-from-samples.ts
 */

import { PrismaClient } from '@prisma/client';
import { sampleQuestions } from '../seeds/sample-questions';

const prisma = new PrismaClient();

async function seedFromSamples() {
  console.log('🌱 Seeding database from sample questions...\n');
  console.log('='.repeat(60));

  try {
    // Optional: Clear existing questions first
    console.log('\n🗑️  Clearing existing questions...');
    const deleteResult = await prisma.question.deleteMany({
      where: { createdBy: 'seed' }
    });
    console.log(`✅ Deleted ${deleteResult.count} existing seed question(s)`);

    // Insert sample questions
    console.log('\n📝 Inserting sample questions...');
    let insertedCount = 0;
    
    for (const question of sampleQuestions) {
      // Remove the diagramSvg field before inserting if not in your schema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { diagramSvg, createdBy, reviewStatus, ...questionData } = question;
      
      const inserted = await prisma.question.create({
        data: questionData,
      });
      
      insertedCount++;
      const diagramIndicator = inserted.imageUrl ? '🖼️  ' : '   ';
      console.log(`  ${diagramIndicator}✅ ${inserted.moduleType} - ${inserted.category}: ${(inserted.question || '').substring(0, 50)}...`);
    }

    console.log(`\n✅ Successfully inserted ${insertedCount} sample questions`);

    // Summary
    console.log('\n📊 Summary:');
    const totalCount = await prisma.question.count();
    const mathCount = await prisma.question.count({ where: { moduleType: 'math' } });
    const readingCount = await prisma.question.count({ where: { moduleType: 'reading-writing' } });
    const withDiagrams = await prisma.question.count({ 
      where: { 
        imageUrl: { not: null } 
      } 
    });

    console.log(`   - Total questions: ${totalCount}`);
    console.log(`   - Math questions: ${mathCount}`);
    console.log(`   - Reading-Writing questions: ${readingCount}`);
    console.log(`   - Questions with diagrams: ${withDiagrams}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\nTest the question-review page:');
    console.log('  1. Start the dev server: npm run dev');
    console.log('  2. Visit: http://localhost:3000/questions/review');
    console.log('  3. Sign in as a non-admin user');
    console.log('  4. Verify diagrams render for geometry and linear models questions');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    console.error('='.repeat(60));
    throw error;
  }
}

async function main() {
  try {
    await seedFromSamples();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
