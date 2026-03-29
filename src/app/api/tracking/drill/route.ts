import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DrillQuestionInput {
  questionId: string
  questionIndex: number
  category: string
  difficulty: string
  moduleType: string
  userAnswer: number
  correctAnswer: number
  isCorrect: boolean
  timeSpentMs: number
  changedAnswer?: boolean
  initialAnswer?: number
}

// POST /api/tracking/drill — log a complete drill attempt with per-question data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      category,
      moduleType,
      difficulty,
      totalQuestions,
      correctAnswers,
      score,
      totalTimeMs,
      startedAt,
      completedAt,
      abandoned,
      questionsLeft,
      questionResults,
    } = body

    if (!category || !Array.isArray(questionResults) || questionResults.length === 0) {
      return NextResponse.json({ error: 'Invalid drill data' }, { status: 400 })
    }

    // Calculate analytics from question results
    const times = questionResults.map((q: DrillQuestionInput) => q.timeSpentMs)
    const avgTimePerQ = Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length)
    const fastestTimeMs = Math.min(...times)
    const slowestTimeMs = Math.max(...times)

    // Calculate longest correct/wrong streaks
    let streakCorrect = 0
    let streakWrong = 0
    let curCorrect = 0
    let curWrong = 0
    for (const q of questionResults as DrillQuestionInput[]) {
      if (q.isCorrect) {
        curCorrect++
        curWrong = 0
        streakCorrect = Math.max(streakCorrect, curCorrect)
      } else {
        curWrong++
        curCorrect = 0
        streakWrong = Math.max(streakWrong, curWrong)
      }
    }

    const drillAttempt = await prisma.drillAttempt.create({
      data: {
        userId: session.user.id,
        category,
        moduleType: moduleType || null,
        difficulty: difficulty || null,
        totalQuestions: totalQuestions || questionResults.length,
        correctAnswers: correctAnswers ?? questionResults.filter((q: DrillQuestionInput) => q.isCorrect).length,
        score: score ?? Math.round((questionResults.filter((q: DrillQuestionInput) => q.isCorrect).length / questionResults.length) * 100),
        totalTimeMs: totalTimeMs || times.reduce((a: number, b: number) => a + b, 0),
        avgTimePerQ,
        fastestTimeMs,
        slowestTimeMs,
        streakCorrect,
        streakWrong,
        startedAt: new Date(startedAt),
        completedAt: new Date(completedAt),
        abandoned: abandoned ?? false,
        questionsLeft: questionsLeft ?? 0,
        questionResults: {
          create: questionResults.map((q: DrillQuestionInput) => ({
            questionId: q.questionId,
            questionIndex: q.questionIndex,
            category: q.category,
            difficulty: q.difficulty,
            moduleType: q.moduleType,
            userAnswer: q.userAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect: q.isCorrect,
            timeSpentMs: q.timeSpentMs,
            changedAnswer: q.changedAnswer ?? false,
            initialAnswer: q.initialAnswer ?? null,
          })),
        },
      },
    })

    // Update daily activity
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.userDailyActivity.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      update: {
        questionsAnswered: { increment: questionResults.length },
        questionsCorrect: { increment: questionResults.filter((q: DrillQuestionInput) => q.isCorrect).length },
        drillsCompleted: { increment: abandoned ? 0 : 1 },
        totalTimeMs: { increment: totalTimeMs || times.reduce((a: number, b: number) => a + b, 0) },
      },
      create: {
        userId: session.user.id,
        date: today,
        questionsAnswered: questionResults.length,
        questionsCorrect: questionResults.filter((q: DrillQuestionInput) => q.isCorrect).length,
        drillsCompleted: abandoned ? 0 : 1,
        totalTimeMs: totalTimeMs || times.reduce((a: number, b: number) => a + b, 0),
      },
    })

    return NextResponse.json({
      success: true,
      drillAttemptId: drillAttempt.id,
      analytics: {
        avgTimePerQ,
        fastestTimeMs,
        slowestTimeMs,
        streakCorrect,
        streakWrong,
      },
    })
  } catch (error) {
    console.error('[/api/tracking/drill] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
