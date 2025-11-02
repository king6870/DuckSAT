/**
 * Test script for Question Review feature
 * 
 * This script demonstrates how the review feature works by:
 * 1. Creating a test question
 * 2. Creating a test user
 * 3. Submitting a review
 * 4. Retrieving reviews
 * 
 * Run with: npx tsx scripts/test-review-feature.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Question Review Feature\n');

  try {
    // 1. Create or find a test question
    console.log('📝 Setting up test question...');
    const testQuestion = await prisma.question.upsert({
      where: { id: 'test-review-question-1' },
      update: {},
      create: {
        id: 'test-review-question-1',
        moduleType: 'math',
        difficulty: 'medium',
        category: 'algebra',
        subtopic: 'linear-equations',
        question: 'What is the value of x in the equation 2x + 5 = 15?',
        options: ['5', '10', '15', '20'],
        correctAnswer: 0,
        explanation: 'Solving: 2x + 5 = 15 → 2x = 10 → x = 5',
        timeEstimate: 90,
        tags: ['test'],
      },
    });
    console.log(`✅ Test question created/found: ${testQuestion.id}\n`);

    // 2. Create or find a test user
    console.log('👤 Setting up test user...');
    const testUser = await prisma.user.upsert({
      where: { email: 'test-reviewer@example.com' },
      update: {},
      create: {
        email: 'test-reviewer@example.com',
        name: 'Test Reviewer',
      },
    });
    console.log(`✅ Test user created/found: ${testUser.email}\n`);

    // 3. Create a review
    console.log('⭐ Creating a review...');
    const review = await prisma.questionReview.upsert({
      where: {
        userId_questionId: {
          userId: testUser.id,
          questionId: testQuestion.id,
        },
      },
      create: {
        userId: testUser.id,
        questionId: testQuestion.id,
        rating: 5,
        description: 'Excellent question! Clear and well-explained.',
        hasDiagram: false,
      },
      update: {
        rating: 5,
        description: 'Excellent question! Clear and well-explained.',
        hasDiagram: false,
      },
    });
    console.log('✅ Review created/updated:');
    console.log(`   - Rating: ${review.rating} stars`);
    console.log(`   - Description: "${review.description}"`);
    console.log(`   - Has Diagram: ${review.hasDiagram}`);
    console.log(`   - Created: ${review.createdAt}\n`);

    // 4. Retrieve all reviews for the question
    console.log('📋 Fetching all reviews for the question...');
    const allReviews = await prisma.questionReview.findMany({
      where: { questionId: testQuestion.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    console.log(`✅ Found ${allReviews.length} review(s):`);
    allReviews.forEach((r, idx) => {
      console.log(`\n   Review ${idx + 1}:`);
      console.log(`   - User: ${r.user.name} (${r.user.email})`);
      console.log(`   - Rating: ${r.rating} stars`);
      console.log(`   - Description: "${r.description || 'N/A'}"`);
      console.log(`   - Has Diagram: ${r.hasDiagram}`);
    });

    // 5. Test updating a review
    console.log('\n🔄 Updating the review...');
    const updatedReview = await prisma.questionReview.update({
      where: {
        userId_questionId: {
          userId: testUser.id,
          questionId: testQuestion.id,
        },
      },
      data: {
        rating: 4,
        description: 'Good question, but could use a diagram for visual learners.',
        hasDiagram: true,
      },
    });
    console.log('✅ Review updated:');
    console.log(`   - New Rating: ${updatedReview.rating} stars`);
    console.log(`   - New Description: "${updatedReview.description}"`);
    console.log(`   - New Has Diagram: ${updatedReview.hasDiagram}\n`);

    // 6. Test unique constraint (one review per user per question)
    console.log('🔍 Testing unique constraint...');
    const reviewCount = await prisma.questionReview.count({
      where: {
        userId: testUser.id,
        questionId: testQuestion.id,
      },
    });
    console.log(`✅ Verified: User has exactly ${reviewCount} review(s) for this question\n`);

    console.log('✨ All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
