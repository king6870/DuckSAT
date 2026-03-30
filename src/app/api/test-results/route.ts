import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSATScore } from '@/utils/satScoring'

interface ModuleResult {
  questionId: string
  selectedAnswer: number
  isCorrect: boolean
  timeSpent?: number
  moduleType: string
  difficulty?: string
  category?: string
  subtopic?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { testResults, practiceTestId } = await request.json()

    // Extract data from testResults
    const flatResults: ModuleResult[] = testResults.moduleResults.flat()
    const rwQuestions = flatResults.filter((r: ModuleResult) => r.moduleType === 'reading-writing')
    const mathQuestions = flatResults.filter((r: ModuleResult) => r.moduleType === 'math')
    const rwCorrect = rwQuestions.filter((r: ModuleResult) => r.isCorrect).length
    const mathCorrect = mathQuestions.filter((r: ModuleResult) => r.isCorrect).length

    const satScore = calculateSATScore(rwCorrect, rwQuestions.length, mathCorrect, mathQuestions.length)

    // Determine primary module type (used by downstream analytics)
    const _moduleType = mathQuestions.length > rwQuestions.length ? 'math' : 'reading-writing'

    // Epic #61: Calculate attempt number if this is a fixed practice test
    let attemptNumber: number | null = null;
    if (practiceTestId) {
      const existingAttempts = await prisma.testResult.count({
        where: {
          userId: user.id,
          practiceTestId: practiceTestId,
        },
      });
      attemptNumber = existingAttempts + 1;
    }

    // Create test result
    const testResult = await prisma.testResult.create({
      data: {
        userId: user.id,
        practiceTestId: practiceTestId || null, // Epic #61: Link to practice test if applicable
        attemptNumber: attemptNumber, // Epic #61: Store attempt number
        startTime: new Date(testResults.startTime),
        endTime: new Date(testResults.endTime),
        totalTimeSpent: testResults.totalTimeSpent,
        totalQuestions: testResults.totalQuestions,
        correctAnswers: testResults.correctAnswers,
        score: Math.round((testResults.correctAnswers / testResults.totalQuestions) * 100),
        satReadingScore: satScore.readingWritingScore,
        satMathScore: satScore.mathScore,
        satTotalScore: satScore.totalScore,
        categoryPerformance: JSON.stringify(testResults.categoryPerformance || {}),
        subtopicPerformance: JSON.stringify(testResults.subtopicPerformance || {}),
        difficultyPerformance: JSON.stringify(testResults.difficultyPerformance || {})
      }
    })

    // Create individual question results
    for (const result of flatResults) {
      await prisma.questionResult.create({
        data: {
          testResultId: testResult.id,
          questionId: result.questionId,
          userAnswer: typeof result.selectedAnswer === 'number' && Number.isInteger(result.selectedAnswer)
            ? result.selectedAnswer
            : -1, // Use -1 for unanswered
          isCorrect: result.isCorrect,
          timeSpent: result.timeSpent || 0
        }
      })
    }

    // Update daily activity
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    try {
      await prisma.userDailyActivity.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: {
          questionsAnswered: { increment: flatResults.length },
          questionsCorrect: { increment: flatResults.filter(r => r.isCorrect).length },
          testsCompleted: { increment: 1 },
          totalTimeMs: { increment: (testResults.totalTimeSpent || 0) * 1000 },
        },
        create: {
          userId: user.id,
          date: today,
          questionsAnswered: flatResults.length,
          questionsCorrect: flatResults.filter(r => r.isCorrect).length,
          testsCompleted: 1,
          totalTimeMs: (testResults.totalTimeSpent || 0) * 1000,
        },
      })
    } catch {
      // Non-critical — don't fail the request
    }

    return NextResponse.json({
      success: true,
      testResultId: testResult.id,
      satScore
    })

  } catch (error: unknown) {
    console.error('Test Results API Error:', error)
    // Return error details for debugging (remove in production)
    return NextResponse.json({ 
      error: 'Failed to save test results',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
