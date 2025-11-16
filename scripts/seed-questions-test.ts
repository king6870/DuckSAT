/**
 * Seed sample questions for testing /api/questions endpoint
 * 
 * This script creates a variety of questions to test the API:
 * - Questions with different categories
 * - Questions with different difficulties
 * - Questions with and without subtopics
 * - Questions with and without related data
 * - Questions with different data types (JSON fields, dates, etc.)
 * 
 * Run with: npm run seed:questions-test
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestQuestions() {
  console.log('🌱 Seeding sample questions for API testing...\n');
  console.log('='.repeat(60));

  try {
    // Create topics and subtopics first
    console.log('\n📚 Creating topics and subtopics...');
    
    const mathTopic = await prisma.topic.upsert({
      where: { name: 'Algebra' },
      update: {},
      create: {
        name: 'Algebra',
        moduleType: 'math',
        description: 'Algebraic concepts and problem solving',
        isActive: true
      }
    });

    const readingTopic = await prisma.topic.upsert({
      where: { name: 'Reading Comprehension' },
      update: {},
      create: {
        name: 'Reading Comprehension',
        moduleType: 'reading-writing',
        description: 'Reading comprehension and analysis',
        isActive: true
      }
    });

    console.log(`✅ Created topics: ${mathTopic.name}, ${readingTopic.name}`);

    const linearEquationsSubtopic = await prisma.subtopic.upsert({
      where: { 
        topicId_name: {
          topicId: mathTopic.id,
          name: 'Linear Equations'
        }
      },
      update: {},
      create: {
        topicId: mathTopic.id,
        name: 'Linear Equations',
        description: 'Solving linear equations and inequalities',
        targetQuestions: 100,
        isActive: true
      }
    });

    const mainIdeasSubtopic = await prisma.subtopic.upsert({
      where: { 
        topicId_name: {
          topicId: readingTopic.id,
          name: 'Main Ideas'
        }
      },
      update: {},
      create: {
        topicId: readingTopic.id,
        name: 'Main Ideas',
        description: 'Identifying main ideas and supporting details',
        targetQuestions: 100,
        isActive: true
      }
    });

    console.log(`✅ Created subtopics: ${linearEquationsSubtopic.name}, ${mainIdeasSubtopic.name}`);

    // Create sample questions
    console.log('\n📝 Creating sample questions...');

    const sampleQuestions = [
      // Math question with chartData
      {
        id: 'test-math-1',
        subtopicId: linearEquationsSubtopic.id,
        moduleType: 'math',
        difficulty: 'medium',
        category: 'algebra',
        subtopic: 'linear-equations',
        question: 'What is the value of x in the equation 2x + 5 = 15?',
        passage: null,
        options: ['5', '10', '7.5', '2.5'],
        correctAnswer: 0,
        explanation: 'To solve for x: 2x + 5 = 15 → 2x = 10 → x = 5',
        wrongAnswerExplanations: {
          1: '10 would be the result if you forgot to divide by 2',
          2: '7.5 would be the result if you divided 15 by 2 instead of solving correctly',
          3: '2.5 would be the result if you divided 5 by 2'
        },
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 90,
        source: 'Test Data',
        tags: ['linear-equations', 'algebra', 'test'],
        isActive: true,
        reviewStatus: 'approved',
        reviewComments: 'Good test question',
        reviewedBy: 'test-admin',
        reviewedAt: new Date()
      },
      
      // Reading question with passage
      {
        id: 'test-reading-1',
        subtopicId: mainIdeasSubtopic.id,
        moduleType: 'reading-writing',
        difficulty: 'easy',
        category: 'reading-comprehension',
        subtopic: 'main-ideas',
        question: 'What is the main idea of the passage?',
        passage: 'The benefits of regular exercise extend far beyond physical health. Studies have shown that consistent physical activity can improve mental well-being, enhance cognitive function, and even promote better sleep patterns. For these reasons, health professionals recommend at least 30 minutes of moderate exercise daily.',
        options: [
          'Exercise only benefits physical health',
          'Exercise has multiple benefits for overall health',
          'Exercise should be done for 30 minutes',
          'Mental health is more important than physical health'
        ],
        correctAnswer: 1,
        explanation: 'The passage discusses multiple benefits of exercise including physical health, mental well-being, cognitive function, and sleep.',
        wrongAnswerExplanations: {
          0: 'This contradicts the passage which mentions benefits beyond physical health',
          2: 'This is a supporting detail, not the main idea',
          3: 'The passage does not compare the importance of mental vs physical health'
        },
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 120,
        source: 'Test Data',
        tags: ['reading-comprehension', 'main-ideas', 'test'],
        isActive: true,
        reviewStatus: 'approved',
        reviewComments: null,
        reviewedBy: null,
        reviewedAt: null
      },

      // Math question without subtopic relation
      {
        id: 'test-math-2',
        subtopicId: null,
        moduleType: 'math',
        difficulty: 'hard',
        category: 'geometry',
        subtopic: 'circles',
        question: 'What is the area of a circle with radius 5?',
        passage: null,
        options: ['25π', '10π', '5π', '50π'],
        correctAnswer: 0,
        explanation: 'Area = πr² = π(5)² = 25π',
        wrongAnswerExplanations: {
          1: 'This would be the circumference divided by 2',
          2: 'This would be the radius times π',
          3: 'This is double the correct answer'
        },
        imageUrl: null,
        imageAlt: null,
        chartData: {
          type: 'circle',
          radius: 5,
          center: { x: 0, y: 0 }
        },
        timeEstimate: 100,
        source: 'Official SAT',
        tags: ['geometry', 'circles', 'area'],
        isActive: true,
        reviewStatus: 'pending',
        reviewComments: null,
        reviewedBy: null,
        reviewedAt: null
      },

      // Additional math question
      {
        id: 'test-math-3',
        subtopicId: linearEquationsSubtopic.id,
        moduleType: 'math',
        difficulty: 'easy',
        category: 'algebra',
        subtopic: 'linear-equations',
        question: 'Solve for y: 3y - 7 = 8',
        passage: null,
        options: ['5', '15', '1', '3'],
        correctAnswer: 0,
        explanation: '3y - 7 = 8 → 3y = 15 → y = 5',
        wrongAnswerExplanations: {
          1: 'This is the value of 3y, not y',
          2: 'This would be the result of incorrect arithmetic',
          3: 'This would be the result if you divided 9 by 3 instead of 15'
        },
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 60,
        source: 'Khan Academy',
        tags: ['algebra', 'linear-equations', 'test'],
        isActive: true,
        reviewStatus: 'approved',
        reviewComments: 'Simple and clear',
        reviewedBy: 'test-admin',
        reviewedAt: new Date()
      },

      // Additional reading question
      {
        id: 'test-reading-2',
        subtopicId: mainIdeasSubtopic.id,
        moduleType: 'reading-writing',
        difficulty: 'medium',
        category: 'reading-comprehension',
        subtopic: 'main-ideas',
        question: 'Which statement best summarizes the author\'s perspective?',
        passage: 'Climate change represents one of the most significant challenges of our time. Rising temperatures, extreme weather events, and sea-level rise threaten ecosystems and human communities alike. Immediate action is needed to reduce greenhouse gas emissions and transition to renewable energy sources.',
        options: [
          'Climate change is not a serious issue',
          'We need urgent action on climate change',
          'Renewable energy is too expensive',
          'Weather events are natural phenomena'
        ],
        correctAnswer: 1,
        explanation: 'The passage emphasizes the seriousness of climate change and calls for immediate action.',
        wrongAnswerExplanations: {
          0: 'This contradicts the passage\'s emphasis on the significance of climate change',
          2: 'The passage does not discuss the cost of renewable energy',
          3: 'While true, this misses the author\'s main point about the need for action'
        },
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 150,
        source: 'Test Data',
        tags: ['reading-comprehension', 'author-perspective', 'test'],
        isActive: true,
        reviewStatus: null,
        reviewComments: null,
        reviewedBy: null,
        reviewedAt: null
      },

      // Inactive question (should not be returned by API)
      {
        id: 'test-inactive-1',
        subtopicId: null,
        moduleType: 'math',
        difficulty: 'medium',
        category: 'algebra',
        subtopic: null,
        question: 'This question is inactive',
        passage: null,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'This should not appear in API results',
        wrongAnswerExplanations: null,
        imageUrl: null,
        imageAlt: null,
        chartData: undefined,
        timeEstimate: 60,
        source: 'Test Data',
        tags: ['test', 'inactive'],
        isActive: false,
        reviewStatus: null,
        reviewComments: null,
        reviewedBy: null,
        reviewedAt: null
      }
    ];

    let created = 0;
    let updated = 0;

    for (const question of sampleQuestions) {
      const result = await prisma.question.upsert({
        where: { id: question.id },
        update: question as Parameters<typeof prisma.question.update>[0]['data'],
        create: question as Parameters<typeof prisma.question.create>[0]['data']
      });

      if (result.createdAt.getTime() === result.updatedAt?.getTime()) {
        created++;
      } else {
        updated++;
      }

      console.log(`  ${result.isActive ? '✅' : '⏸️ '} ${result.id} - ${result.question.substring(0, 50)}...`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created} questions`);
    console.log(`   Updated: ${updated} questions`);
    console.log(`   Total: ${sampleQuestions.length} questions`);
    console.log(`   Active: ${sampleQuestions.filter(q => q.isActive).length} questions`);
    console.log(`   Inactive: ${sampleQuestions.filter(q => !q.isActive).length} questions`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Sample questions seeded successfully!');
    console.log('='.repeat(60));
    console.log('\nYou can now test the /api/questions endpoint with:');
    console.log('  npm run test:questions-api');

  } catch (error) {
    console.error('\n❌ Error seeding questions:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedTestQuestions();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
