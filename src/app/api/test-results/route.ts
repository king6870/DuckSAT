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

    const { testResults } = await request.json()

    // Extract data from testResults
    const flatResults: ModuleResult[] = testResults.moduleResults.flat()
    const rwQuestions = flatResults.filter((r: ModuleResult) => r.moduleType === 'reading-writing')
    const mathQuestions = flatResults.filter((r: ModuleResult) => r.moduleType === 'math')
    const rwCorrect = rwQuestions.filter((r: ModuleResult) => r.isCorrect).length
    const mathCorrect = mathQuestions.filter((r: ModuleResult) => r.isCorrect).length

    const satScore = calculateSATScore(rwCorrect, rwQuestions.length, mathCorrect, mathQuestions.length)

    // Determine primary module type
    const moduleType = mathQuestions.length > rwQuestions.length ? 'math' : 'reading-writing'

    // Create test result
    const testResult = await prisma.testResult.create({
      data: {
        userId: user.id,
        startTime: new Date(testResults.startTime),
        endTime: new Date(testResults.endTime),
        totalTimeSpent: testResults.totalTimeSpent,
        totalQuestions: testResults.totalQuestions,
        correctAnswers: testResults.correctAnswers,
        score: Math.round((testResults.correctAnswers / testResults.totalQuestions) * 100),
        satReadingScore: satScore.readingWritingScore,
        satMathScore: satScore.mathScore,
        satTotalScore: satScore.totalScore,
        categoryPerformance: testResults.categoryPerformance || {},
        subtopicPerformance: testResults.subtopicPerformance || {},
        difficultyPerformance: testResults.difficultyPerformance || {}
      }
    })

    // Create individual question results
    for (const result of flatResults) {
      await prisma.questionResult.create({
        data: {
          testResultId: testResult.id,
          questionId: result.questionId,
          userAnswer: result.selectedAnswer,
          isCorrect: result.isCorrect,
          timeSpent: result.timeSpent || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      testResultId: testResult.id,
      satScore
    })

  } catch (error: unknown) {
    console.error('Test Results API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to save test results' 
    }, { status: 500 })
  }
}
