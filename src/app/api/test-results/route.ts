import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { processEmailAutomationEvent } from '@/lib/email-automations'
import {
  LIFECYCLE_EVENT_NAMES,
  maybeEmitStudyStreakMilestone,
  recordLifecycleAutomationEvent,
} from '@/lib/lifecycle-email-events'
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

interface PerformanceEntry {
  correct: number
  total: number
}

function getWeakestPerformanceEntry(
  performance: Record<string, PerformanceEntry> | undefined,
): { label: string; accuracyRate: number } | null {
  if (!performance) {
    return null
  }

  let weakest: { label: string; accuracyRate: number } | null = null

  for (const [label, value] of Object.entries(performance)) {
    if (!label.trim() || !value || value.total < 2) {
      continue
    }

    const accuracyRate = Math.round((value.correct / value.total) * 100)
    if (!weakest || accuracyRate < weakest.accuracyRate) {
      weakest = { label, accuracyRate }
    }
  }

  return weakest
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

    const previousTestResult = await prisma.testResult.findFirst({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
      select: { satTotalScore: true },
    })

    const practiceTest = practiceTestId
      ? await prisma.practiceTest.findUnique({
          where: { id: practiceTestId },
          select: { name: true },
        })
      : null

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

    try {
      await processEmailAutomationEvent({
        userId: user.id,
        triggerType: 'practice_test_completed',
        triggerKey: `practice_test_completed:${testResult.id}`,
        practiceTestId: practiceTestId || null,
        score: testResult.score,
        metadata: {
          scaledScore: satScore.totalScore,
          mathScore: satScore.mathScore,
          readingWritingScore: satScore.readingWritingScore,
          correctAnswers: testResults.correctAnswers,
          totalQuestions: testResults.totalQuestions,
          practiceTestName: practiceTest?.name || 'Full practice test',
        },
      })

      const scoreImprovement = previousTestResult?.satTotalScore
        ? satScore.totalScore - previousTestResult.satTotalScore
        : 0

      if (scoreImprovement >= 70) {
        await recordLifecycleAutomationEvent({
          userId: user.id,
          eventName: LIFECYCLE_EVENT_NAMES.significantScoreImprovement,
          triggerKey: `${LIFECYCLE_EVENT_NAMES.significantScoreImprovement}:${testResult.id}`,
          metadata: {
            scaledScore: satScore.totalScore,
            previousScore: previousTestResult?.satTotalScore ?? '',
            improvementAmount: scoreImprovement,
            mathScore: satScore.mathScore,
            readingWritingScore: satScore.readingWritingScore,
            practiceTestName: practiceTest?.name || 'Full practice test',
          },
          pagePath: '/progress',
        })
      }

      const weakestSubtopic = getWeakestPerformanceEntry(testResults.subtopicPerformance)
      const weakestCategory = getWeakestPerformanceEntry(testResults.categoryPerformance)
      const weakestArea = weakestSubtopic || weakestCategory

      if (weakestArea && weakestArea.accuracyRate <= 60) {
        await recordLifecycleAutomationEvent({
          userId: user.id,
          eventName: LIFECYCLE_EVENT_NAMES.weakSpotDetected,
          triggerKey: `${LIFECYCLE_EVENT_NAMES.weakSpotDetected}:test:${testResult.id}`,
          metadata: {
            weakArea: weakestArea.label,
            weakTopic: weakestArea.label,
            weakAreaAccuracyRate: weakestArea.accuracyRate,
            scaledScore: satScore.totalScore,
            practiceTestName: practiceTest?.name || 'Full practice test',
          },
          pagePath: '/progress',
        })
      }

      await maybeEmitStudyStreakMilestone(user.id)
    } catch (automationError) {
      console.error('Test Results automation error:', automationError)
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
