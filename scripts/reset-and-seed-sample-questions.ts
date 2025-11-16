/**
 * Reset and seed sample questions for testing
 * 
 * This script:
 * 1. Deletes all existing questions from the database
 * 2. Inserts four sample questions (2 math, 2 reading-writing)
 * 3. Validates the seeding by checking total question count
 * 4. Uses realistic SAT-style content with all required fields
 * 5. Exits with process.exit(1) on any error
 * 6. Is safe to re-run at any time (idempotent)
 * 
 * Run with: npx tsx scripts/reset-and-seed-sample-questions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndSeedQuestions() {
  console.log('🔄 Resetting and seeding sample questions...\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Delete all existing questions
    console.log('\n🗑️  Deleting all existing questions...');
    const deleteResult = await prisma.question.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} existing question(s)`);

    // Step 2: Define the four sample questions
    const sampleQuestions = [
      // Math Question 1: Algebra
      {
        subtopicId: null,
        moduleType: 'math',
        difficulty: 'medium',
        category: 'algebra',
        subtopic: 'linear-equations',
        question: 'If 3x + 7 = 22, what is the value of x?',
        passage: null,
        options: ['5', '7', '15', '29'],
        correctAnswer: 0,
        explanation: 'To solve for x, subtract 7 from both sides: 3x = 15. Then divide both sides by 3: x = 5.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 60,
        source: 'SAT Practice',
        tags: ['algebra', 'linear-equations'],
        isActive: true,
      },
      
      // Math Question 2: Geometry
      {
        subtopicId: null,
        moduleType: 'math',
        difficulty: 'medium',
        category: 'geometry',
        subtopic: 'area-and-volume',
        question: 'A rectangle has a length of 12 units and a width of 5 units. What is the area of the rectangle?',
        passage: null,
        options: ['17', '34', '60', '120'],
        correctAnswer: 2,
        explanation: 'The area of a rectangle is calculated by multiplying length by width: A = l × w = 12 × 5 = 60 square units.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 45,
        source: 'SAT Practice',
        tags: ['geometry', 'area'],
        isActive: true,
      },
      
      // Reading-Writing Question 1: Main Ideas
      {
        subtopicId: null,
        moduleType: 'reading-writing',
        difficulty: 'easy',
        category: 'reading-comprehension',
        subtopic: 'main-ideas',
        question: 'Which choice best states the main purpose of the text?',
        passage: 'The honey bee is essential to modern agriculture. These remarkable insects pollinate approximately one-third of the crops we eat, including fruits, vegetables, and nuts. Without honey bees, our food supply would be drastically reduced. Recent declines in bee populations have alarmed scientists and farmers alike, prompting increased research into protecting these vital pollinators.',
        options: [
          'To describe the physical characteristics of honey bees',
          'To explain the importance of honey bees to agriculture',
          'To discuss how honey bees produce honey',
          'To compare honey bees with other types of bees'
        ],
        correctAnswer: 1,
        explanation: 'The passage focuses on how honey bees are essential to agriculture by pollinating crops, making option B the main purpose.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 75,
        source: 'SAT Practice',
        tags: ['reading-comprehension', 'main-ideas'],
        isActive: true,
      },
      
      // Reading-Writing Question 2: Vocabulary
      {
        subtopicId: null,
        moduleType: 'reading-writing',
        difficulty: 'medium',
        category: 'vocabulary',
        subtopic: 'words-in-context',
        question: 'As used in the text, what does the word "meticulous" most nearly mean?',
        passage: 'The scientist was meticulous in her research methods, carefully recording every observation and double-checking all measurements to ensure accuracy.',
        options: [
          'Careless',
          'Extremely careful and precise',
          'Quick and efficient',
          'Creative and innovative'
        ],
        correctAnswer: 1,
        explanation: 'In context, "meticulous" describes someone who is extremely careful and precise, as shown by the scientist carefully recording observations and double-checking measurements.',
        wrongAnswerExplanations: {},
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 60,
        source: 'SAT Practice',
        tags: ['vocabulary', 'words-in-context'],
        isActive: true,
      },
    ];

    // Step 3: Insert the sample questions
    console.log('\n📝 Inserting sample questions...');
    const insertedQuestions = [];
    
    for (const question of sampleQuestions) {
      const inserted = await prisma.question.create({
        data: question,
      });
      insertedQuestions.push(inserted);
      console.log(`  ✅ ${inserted.moduleType} - ${inserted.category}: ${(inserted.question || '').substring(0, 50)}...`);
    }

    console.log(`\n✅ Successfully inserted ${insertedQuestions.length} questions`);

    // Step 4: Validation - verify exactly 4 questions exist
    console.log('\n🔍 Validating seeded data...');
    const totalCount = await prisma.question.count();
    
    if (totalCount !== 4) {
      throw new Error(`Expected 4 questions in database, but found ${totalCount}`);
    }
    
    console.log(`✅ Validation passed: ${totalCount} questions in database`);

    // Additional validation: Check each module type
    const mathCount = await prisma.question.count({
      where: { moduleType: 'math' }
    });
    const readingCount = await prisma.question.count({
      where: { moduleType: 'reading-writing' }
    });

    console.log(`   - Math questions: ${mathCount}`);
    console.log(`   - Reading-Writing questions: ${readingCount}`);

    if (mathCount !== 2 || readingCount !== 2) {
      throw new Error(`Expected 2 math and 2 reading-writing questions, but found ${mathCount} math and ${readingCount} reading-writing`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Reset and seed completed successfully!');
    console.log('='.repeat(60));
    console.log('\nYou can now test the /api/questions endpoint with:');
    console.log('  GET /api/questions');

  } catch (error) {
    console.error('\n❌ Error during reset and seed:', error);
    console.error('='.repeat(60));
    throw error;
  }
}

async function main() {
  try {
    await resetAndSeedQuestions();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
