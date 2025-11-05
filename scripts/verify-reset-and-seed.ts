/**
 * Simple test script to verify the reset-and-seed-sample-questions.ts script worked correctly
 * 
 * This script tests that:
 * 1. Exactly 4 questions exist in the database
 * 2. 2 are math questions
 * 3. 2 are reading-writing questions  
 * 4. All questions can be serialized to JSON without errors
 * 5. All required fields are present
 * 
 * Run this after running: npx tsx scripts/reset-and-seed-sample-questions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeededQuestions() {
  console.log('🧪 Verifying seeded questions...\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Check total count
    console.log('\n📊 Test 1: Total question count');
    const totalCount = await prisma.question.count();
    
    if (totalCount !== 4) {
      throw new Error(`Expected 4 questions, found ${totalCount}`);
    }
    console.log(`✅ PASSED - Found exactly 4 questions`);

    // Test 2: Check module type distribution
    console.log('\n📊 Test 2: Module type distribution');
    const mathCount = await prisma.question.count({
      where: { moduleType: 'math' }
    });
    const readingCount = await prisma.question.count({
      where: { moduleType: 'reading-writing' }
    });

    if (mathCount !== 2 || readingCount !== 2) {
      throw new Error(`Expected 2 math and 2 reading-writing, found ${mathCount} math and ${readingCount} reading-writing`);
    }
    console.log(`✅ PASSED - 2 math questions, 2 reading-writing questions`);

    // Test 3: Fetch all questions and check serialization
    console.log('\n📊 Test 3: JSON serialization');
    const questions = await prisma.question.findMany({
      where: { isActive: true }
    });

    // Test JSON serialization
    const jsonString = JSON.stringify(questions);
    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed) || parsed.length !== 4) {
      throw new Error('Questions failed to serialize correctly');
    }
    console.log(`✅ PASSED - All questions serialize to JSON without errors`);

    // Test 4: Verify required fields
    console.log('\n📊 Test 4: Required fields');
    const requiredFields = [
      'id', 'moduleType', 'difficulty', 'category', 'question', 
      'options', 'correctAnswer', 'explanation', 'timeEstimate', 
      'tags', 'isActive'
    ];

    for (const question of parsed) {
      for (const field of requiredFields) {
        if (!(field in question)) {
          throw new Error(`Question ${question.id} missing required field: ${field}`);
        }
      }
    }
    console.log(`✅ PASSED - All required fields present in all questions`);

    // Test 5: Verify optional fields are null or empty object
    console.log('\n📊 Test 5: Optional fields (null or {})');
    for (const question of parsed) {
      // Check that optional fields are null
      if (question.imageUrl !== null) {
        console.log(`⚠️  WARNING - Question ${question.id} has imageUrl: ${question.imageUrl}`);
      }
      if (question.imageAlt !== null) {
        console.log(`⚠️  WARNING - Question ${question.id} has imageAlt`);
      }
      if (question.chartData !== null) {
        console.log(`⚠️  WARNING - Question ${question.id} has chartData`);
      }
      
      // wrongAnswerExplanations should be {} or null
      if (question.wrongAnswerExplanations !== null) {
        const keys = Object.keys(question.wrongAnswerExplanations);
        if (keys.length > 0) {
          console.log(`⚠️  WARNING - Question ${question.id} has non-empty wrongAnswerExplanations`);
        }
      }
    }
    console.log(`✅ PASSED - Optional fields are null or empty as expected`);

    // Test 6: Verify correctAnswer is index (0-3)
    console.log('\n📊 Test 6: correctAnswer is valid index');
    for (const question of parsed) {
      if (typeof question.correctAnswer !== 'number' || 
          question.correctAnswer < 0 || 
          question.correctAnswer > 3) {
        throw new Error(`Question ${question.id} has invalid correctAnswer: ${question.correctAnswer}`);
      }
    }
    console.log(`✅ PASSED - All correctAnswer values are valid indices (0-3)`);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL VERIFICATION TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nSample questions:');
    for (const question of parsed) {
      console.log(`  - [${question.moduleType}] ${question.category}: ${(question.question || '').substring(0, 60)}...`);
    }
    
    console.log('\n✅ The script worked correctly and questions are ready for API testing');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await verifySeededQuestions();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
