import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { category, moduleType, difficulty, drillLength, results } = body

    if (!category || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const normalizedModuleType = moduleType || 'mixed'
    const normalizedDrillLength = Number(drillLength) || results.length

    const correctCount = results.filter((r: { isCorrect: boolean }) => r.isCorrect).length
    const totalQuestions = results.length
    const score = Math.round((correctCount / totalQuestions) * 100)

    const now = new Date()

    // Build category performance JSON
    const categoryPerformance: Record<string, { correct: number; total: number }> = {}
    for (const r of results) {
      if (!categoryPerformance[category]) {
        categoryPerformance[category] = { correct: 0, total: 0 }
      }
      categoryPerformance[category].total++
      if (r.isCorrect) categoryPerformance[category].correct++
    }

    // Save as a test result with drill metadata in subtopicPerformance
    const testResult = await prisma.testResult.create({
      data: {
        userId: user.id,
        score,
        totalQuestions,
        correctAnswers: correctCount,
        totalTimeSpent: 0,
        startTime: now,
        endTime: now,
        categoryPerformance: JSON.stringify(categoryPerformance),
        subtopicPerformance: JSON.stringify({
          mode: 'drill',
          drillCategory: category,
          moduleType: normalizedModuleType,
          difficulty,
          drillLength: normalizedDrillLength,
        }),
        questionResults: {
          create: results.map((r: { questionId: string; selected: number; isCorrect: boolean }) => ({
            questionId: r.questionId,
            userAnswer: r.selected,
            isCorrect: r.isCorrect,
            timeSpent: 0,
          }))
        }
      }
    })

    return NextResponse.json({
      success: true,
      testResultId: testResult.id,
      score,
      correctCount,
      totalQuestions,
    })
  } catch (error) {
    console.error('[/api/practice/drill-results] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
