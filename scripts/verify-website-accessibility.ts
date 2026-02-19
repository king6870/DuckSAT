import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyQuestions() {
  try {
    console.log('\n🔍 Verifying all questions are accessible on the website...\n');

    // Check total questions
    const totalQuestions = await prisma.question.count();
    const activeQuestions = await prisma.question.count({
      where: { isActive: true }
    });
    const inactiveQuestions = await prisma.question.count({
      where: { isActive: false }
    });

    console.log('📊 Database Status:');
    console.log(`   Total questions: ${totalQuestions}`);
    console.log(`   Active (accessible): ${activeQuestions} ✅`);
    console.log(`   Inactive (hidden): ${inactiveQuestions}`);

    // Check questions with diagrams
    const questionsWithDiagrams = await prisma.question.count({
      where: {
        isActive: true,
        imageData: { not: null }
      }
    });

    console.log(`\n🖼️  Questions with diagrams: ${questionsWithDiagrams}`);

    // Check by module type
    const mathQuestions = await prisma.question.count({
      where: { isActive: true, moduleType: 'math' }
    });
    const readingQuestions = await prisma.question.count({
      where: { isActive: true, moduleType: 'reading-writing' }
    });

    console.log(`\n📚 By Module:`);
    console.log(`   Math: ${mathQuestions}`);
    console.log(`   Reading/Writing: ${readingQuestions}`);

    // Check by difficulty
    const easy = await prisma.question.count({
      where: { isActive: true, difficulty: 'easy' }
    });
    const medium = await prisma.question.count({
      where: { isActive: true, difficulty: 'medium' }
    });
    const hard = await prisma.question.count({
      where: { isActive: true, difficulty: 'hard' }
    });

    console.log(`\n⭐ By Difficulty:`);
    console.log(`   Easy: ${easy}`);
    console.log(`   Medium: ${medium}`);
    console.log(`   Hard: ${hard}`);

    // Check test questions (tagged v3-test)
    const testQuestions = await prisma.question.count({
      where: {
        isActive: true,
        tags: { contains: 'v3-test' }
      }
    });

    console.log(`\n🧪 Test Questions (v3-test tagged): ${testQuestions}`);

    // Verify any inactive questions
    if (inactiveQuestions > 0) {
      console.log(`\n⚠️  Found ${inactiveQuestions} inactive questions that won't show on website`);
      const inactive = await prisma.question.findMany({
        where: { isActive: false },
        select: { id: true, question: true, createdAt: true }
      });
      inactive.forEach((q, i) => {
        console.log(`   ${i + 1}. ID: ${q.id} - ${q.question.substring(0, 60)}...`);
      });
    }

    // Test API accessibility simulation
    console.log(`\n🌐 API Endpoint Simulation:`);
    
    // Simulate /api/questions?moduleType=math
    const apiMathQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
        moduleType: 'math'
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`   GET /api/questions?moduleType=math → ${apiMathQuestions.length} questions`);

    // Simulate /api/questions/practice?moduleType=math&count=10
    const practiceMathQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
        moduleType: 'math'
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log(`   GET /api/questions/practice?moduleType=math&count=10 → ${practiceMathQuestions.length} questions`);

    // Check for questions that might be problematic
    console.log(`\n🔧 Data Quality Checks:`);
    
    // Check for required fields (these should never be null for active questions)
    const allActiveQuestions = await prisma.question.findMany({
      where: { isActive: true },
      select: { id: true, options: true, correctAnswer: true, explanation: true }
    });
    
    const missingOptions = allActiveQuestions.filter(q => !q.options).length;
    console.log(`   Missing options: ${missingOptions} ${missingOptions > 0 ? '❌' : '✅'}`);

    const missingCorrectAnswer = allActiveQuestions.filter(q => q.correctAnswer === null || q.correctAnswer === undefined).length;
    console.log(`   Missing correct answer: ${missingCorrectAnswer} ${missingCorrectAnswer > 0 ? '❌' : '✅'}`);

    const missingExplanation = allActiveQuestions.filter(q => !q.explanation).length;
    console.log(`   Missing explanation: ${missingExplanation} ${missingExplanation > 0 ? '❌' : '✅'}`);

    // Final summary
    console.log(`\n✅ SUMMARY:`);
    if (activeQuestions === totalQuestions && missingOptions === 0 && missingCorrectAnswer === 0) {
      console.log(`   🎉 All ${activeQuestions} questions are properly configured and accessible!`);
      console.log(`   🌐 Questions will be available at:`);
      console.log(`      - Practice page: /practice`);
      console.log(`      - API: /api/questions`);
      console.log(`      - API: /api/questions/practice`);
    } else {
      console.log(`   ⚠️  Some issues found - see details above`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyQuestions();
