import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSATScore } from '@/utils/satScoring'

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
    const flatResults = testResults.moduleResults.flat()
    const rwQuestions = flatResults.filter((r: any) => r.moduleType === 'reading-writing')
    const mathQuestions = flatResults.filter((r: any) => r.moduleType === 'math')
    const rwCorrect = rwQuestions.filter((r: any) => r.isCorrect).length
    const mathCorrect = mathQuestions.filter((r: any) => r.isCorrect).length

    const satScore = calculateSATScore(rwCorrect, rwQuestions.length, mathCorrect, mathQuestions.length)

    // Determine primary module type
    const moduleType = mathQuestions.length > rwQuestions.length ? 'math' : 'reading-writing'

    // Create test result
    const testResult = await prisma.testResult.create({
      data: {
        userId: user.id,
        startTime: new Date(testResults.startTime),
        completedAt: new Date(testResults.endTime),
        timeSpent: testResults.totalTimeSpent,
        totalQuestions: testResults.totalQuestions,
        correctAnswers: testResults.correctAnswers,
        totalScore: Math.round((testResults.correctAnswers / testResults.totalQuestions) * 100),
        moduleType,
        rwScore: satScore.readingWriting,
        mathScore: satScore.math,
        totalSATScore: satScore.total,
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
          selectedAnswer: result.selectedAnswer,
          isCorrect: result.isCorrect,
          timeSpent: result.timeSpent || 0,
          moduleType: result.moduleType,
          difficulty: result.difficulty,
          category: result.category,
          subtopic: result.subtopic
        }
      })
    }

    return NextResponse.json({
      success: true,
      testResultId: testResult.id,
      satScore
    })

  } catch (error: any) {
    console.error('Test Results API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to save test results' 
    }, { status: 500 })
  }
}
