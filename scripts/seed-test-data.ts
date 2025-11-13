import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...')

    // Find or create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    // Create sample test results
    const testResults = [
      {
        totalScore: 75,
        rwScore: 650,
        mathScore: 680,
        totalSATScore: 1330,
        timeSpent: 3600, // 1 hour
        totalQuestions: 20,
        correctAnswers: 15,
        moduleType: 'math'
      },
      {
        totalScore: 82,
        rwScore: 680,
        mathScore: 720,
        totalSATScore: 1400,
        timeSpent: 3300, // 55 minutes
        totalQuestions: 18,
        correctAnswers: 15,
        moduleType: 'reading-writing'
      },
      {
        totalScore: 68,
        rwScore: 620,
        mathScore: 650,
        totalSATScore: 1270,
        timeSpent: 4200, // 70 minutes
        totalQuestions: 22,
        correctAnswers: 15,
        moduleType: 'math'
      }
    ]

    for (const [index, result] of testResults.entries()) {
      const testResult = await prisma.testResult.create({
        data: {
          userId: testUser.id,
          startTime: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000), // Days ago
          endTime: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000 + result.timeSpent * 1000),
          totalTimeSpent: result.timeSpent,
          totalQuestions: result.totalQuestions,
          correctAnswers: result.correctAnswers,
          score: result.totalScore,
          satReadingScore: result.rwScore,
          satMathScore: result.mathScore,
          satTotalScore: result.totalSATScore,
          categoryPerformance: {},
          subtopicPerformance: {},
          difficultyPerformance: {}
        }
      })

      // Create sample question results
      const categories = ['Algebra', 'Geometry', 'Reading Comprehension', 'Writing']
      
      for (let i = 0; i < result.totalQuestions; i++) {
        const isCorrect = i < result.correctAnswers
        await prisma.questionResult.create({
          data: {
            testResultId: testResult.id,
            questionId: `sample-${i}`,
            userAnswer: isCorrect ? 0 : 1,
            isCorrect,
            timeSpent: Math.floor(Math.random() * 120) + 30 // 30-150 seconds
          }
        })
      }
    }

    console.log('✅ Test data seeded successfully!')
    console.log(`Created test results for user: ${testUser.email}`)

  } catch (error) {
    console.error('❌ Error seeding test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTestData()
