import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get test results with question details
    const testResults = await prisma.testResult.findMany({
      where: { userId: user.id },
      include: {
        questionResults: {
          include: {
            question: {
              select: {
                category: true,
                moduleType: true,
                difficulty: true
              }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    })

    if (testResults.length === 0) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    // Parse drill metadata stored in subtopicPerformance
    const drillMetaById: Record<string, { isDrill: boolean; drillCategory?: string; drillLength?: number }> = {}
    for (const result of testResults) {
      let isDrill = false
      let drillCategory: string | undefined
      let drillLength: number | undefined

      if (result.subtopicPerformance) {
        try {
          const parsed = JSON.parse(result.subtopicPerformance) as { mode?: string; drillCategory?: string; drillLength?: number }
          if (parsed.mode === 'drill' || parsed.drillCategory) {
            isDrill = true
            drillCategory = parsed.drillCategory
            drillLength = typeof parsed.drillLength === 'number' ? parsed.drillLength : undefined
          }
        } catch {
          // Ignore malformed metadata
        }
      }

      drillMetaById[result.id] = { isDrill, drillCategory, drillLength }
    }

    const drillResults = testResults.filter(r => drillMetaById[r.id]?.isDrill)
    const fullTestResults = testResults.filter(r => !drillMetaById[r.id]?.isDrill)
    const overviewSource = fullTestResults.length > 0 ? fullTestResults : testResults

    // === OVERVIEW METRICS ===
    const testsCompleted = fullTestResults.length
    const scores = overviewSource.map(r => r.score)
    const satScores = fullTestResults.map(r => r.satTotalScore).filter(Boolean) as number[]
    
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const bestScore = Math.max(...scores)
    const totalStudyTime = Math.round(overviewSource.reduce((total, r) => total + (r.totalTimeSpent || 0), 0) / 60)
    
    const averageSATScore = satScores.length > 0 
      ? Math.round(satScores.reduce((a, b) => a + b, 0) / satScores.length) 
      : 0
    const bestSATScore = satScores.length > 0 ? Math.max(...satScores) : 0
    const latestSATScore = fullTestResults[0]?.satTotalScore || 0

    // Calculate improvement rate (last 3 tests vs first 3 tests)
    let improvementRate = 0
    if (overviewSource.length >= 6) {
      const firstThree = overviewSource.slice(-3).map(r => r.score)
      const lastThree = overviewSource.slice(0, 3).map(r => r.score)
      const firstAvg = firstThree.reduce((a, b) => a + b, 0) / 3
      const lastAvg = lastThree.reduce((a, b) => a + b, 0) / 3
      
      // Prevent division by zero
      if (firstAvg > 0) {
        improvementRate = Math.round(((lastAvg - firstAvg) / firstAvg) * 100)
      } else if (lastAvg > 0) {
        // If started at 0 but improved, show as 100% improvement
        improvementRate = 100
      }
    }

    // === MODULE PERFORMANCE ===
    const rwQuestions: Array<{ isCorrect: boolean; timeSpent: number }> = []
    const mathQuestions: Array<{ isCorrect: boolean; timeSpent: number }> = []
    const rwSATScores: number[] = []
    const mathSATScores: number[] = []

    testResults.forEach(result => {
      result.questionResults.forEach(qr => {
        const questionData = { isCorrect: qr.isCorrect, timeSpent: qr.timeSpent }
        if (qr.question.moduleType === 'reading-writing') {
          rwQuestions.push(questionData)
        } else if (qr.question.moduleType === 'math') {
          mathQuestions.push(questionData)
        }
      })
      if (result.satReadingScore) rwSATScores.push(result.satReadingScore)
      if (result.satMathScore) mathSATScores.push(result.satMathScore)
    })

    const modulePerformance = {
      readingWriting: {
        averageScore: rwQuestions.length > 0 
          ? Math.round((rwQuestions.filter(q => q.isCorrect).length / rwQuestions.length) * 100)
          : 0,
        averageSATScore: rwSATScores.length > 0
          ? Math.round(rwSATScores.reduce((a, b) => a + b, 0) / rwSATScores.length)
          : 0,
        totalQuestions: rwQuestions.length,
        correctAnswers: rwQuestions.filter(q => q.isCorrect).length,
        averageTimePerQuestion: rwQuestions.length > 0
          ? Math.round(rwQuestions.reduce((sum, q) => sum + q.timeSpent, 0) / rwQuestions.length)
          : 0
      },
      math: {
        averageScore: mathQuestions.length > 0
          ? Math.round((mathQuestions.filter(q => q.isCorrect).length / mathQuestions.length) * 100)
          : 0,
        averageSATScore: mathSATScores.length > 0
          ? Math.round(mathSATScores.reduce((a, b) => a + b, 0) / mathSATScores.length)
          : 0,
        totalQuestions: mathQuestions.length,
        correctAnswers: mathQuestions.filter(q => q.isCorrect).length,
        averageTimePerQuestion: mathQuestions.length > 0
          ? Math.round(mathQuestions.reduce((sum, q) => sum + q.timeSpent, 0) / mathQuestions.length)
          : 0
      }
    }

    // === CATEGORY PERFORMANCE ===
    const categoryStats: Record<string, { 
      correct: number; 
      total: number; 
      totalTime: number; 
      moduleType: string 
    }> = {}
    
    testResults.forEach(result => {
      result.questionResults.forEach(qr => {
        const category = qr.question.category
        if (!categoryStats[category]) {
          categoryStats[category] = { 
            correct: 0, 
            total: 0, 
            totalTime: 0, 
            moduleType: qr.question.moduleType 
          }
        }
        categoryStats[category].total++
        categoryStats[category].totalTime += qr.timeSpent
        if (qr.isCorrect) categoryStats[category].correct++
      })
    })

    const categoryPerformance = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        totalQuestions: stats.total,
        correctAnswers: stats.correct,
        percentage: Math.round((stats.correct / stats.total) * 100),
        averageTime: Math.round(stats.totalTime / stats.total),
        moduleType: stats.moduleType
      }))
      .filter(item => item.totalQuestions >= 3)
      .sort((a, b) => b.totalQuestions - a.totalQuestions)
      .slice(0, 10)

    // === DIFFICULTY PERFORMANCE ===
    const difficultyStats: Record<string, { correct: number; total: number }> = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 }
    }

    testResults.forEach(result => {
      result.questionResults.forEach(qr => {
        const difficulty = qr.question.difficulty
        if (difficultyStats[difficulty]) {
          difficultyStats[difficulty].total++
          if (qr.isCorrect) difficultyStats[difficulty].correct++
        }
      })
    })

    const difficultyPerformance = {
      easy: {
        ...difficultyStats.easy,
        percentage: difficultyStats.easy.total > 0
          ? Math.round((difficultyStats.easy.correct / difficultyStats.easy.total) * 100)
          : 0
      },
      medium: {
        ...difficultyStats.medium,
        percentage: difficultyStats.medium.total > 0
          ? Math.round((difficultyStats.medium.correct / difficultyStats.medium.total) * 100)
          : 0
      },
      hard: {
        ...difficultyStats.hard,
        percentage: difficultyStats.hard.total > 0
          ? Math.round((difficultyStats.hard.correct / difficultyStats.hard.total) * 100)
          : 0
      }
    }

    // === STRENGTHS & WEAKNESSES ===
    const strongAreas = categoryPerformance
      .filter(item => item.percentage >= 75 && item.totalQuestions >= 5)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3)
      .map(item => item.category)

    const weakAreas = categoryPerformance
      .filter(item => item.percentage < 60 && item.totalQuestions >= 5)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3)
      .map(item => item.category)

    // === SCORE PROGRESSION ===
    const scoreProgression = overviewSource
      .slice(0, 10)
      .reverse()
      .map((result, index) => {
        // Calculate the actual test number from the beginning
        const displayCount = Math.min(10, overviewSource.length)
        const actualTestNumber = overviewSource.length - displayCount + index + 1
        return {
          testNumber: actualTestNumber,
          score: result.score,
          satScore: result.satTotalScore || 0,
          date: result.completedAt.toISOString()
        }
      })

    // === TEST HISTORY ===
    const testHistory = testResults.map(result => {
      const drillMeta = drillMetaById[result.id]
      const rwCount = result.questionResults.filter(qr => qr.question.moduleType === 'reading-writing').length
      const mathCount = result.questionResults.filter(qr => qr.question.moduleType === 'math').length
      
      let moduleFocus = 'Mixed'
      if (drillMeta?.isDrill) {
        moduleFocus = `Drill${drillMeta.drillLength ? ` (${drillMeta.drillLength}Q)` : ''}`
      } else if (rwCount > mathCount * 2) moduleFocus = 'Reading & Writing'
      else if (mathCount > rwCount * 2) moduleFocus = 'Math'

      return {
        id: result.id,
        completedAt: result.completedAt.toISOString(),
        score: result.score,
        satTotalScore: result.satTotalScore || 0,
        satReadingScore: result.satReadingScore || 0,
        satMathScore: result.satMathScore || 0,
        totalTimeSpent: result.totalTimeSpent,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        moduleFocus,
        isDrill: !!drillMeta?.isDrill,
        drillCategory: drillMeta?.drillCategory || null,
        drillLength: drillMeta?.drillLength || null,
      }
    })

    const drillTotal = drillResults.length
    const drillAccuracy = drillTotal > 0
      ? Math.round((drillResults.reduce((sum, r) => sum + r.correctAnswers, 0) / Math.max(drillResults.reduce((sum, r) => sum + r.totalQuestions, 0), 1)) * 100)
      : 0
    const drillQuestions = drillResults.reduce((sum, r) => sum + r.totalQuestions, 0)
    const drillTimeMinutes = Math.round(drillResults.reduce((sum, r) => sum + (r.totalTimeSpent || 0), 0) / 60)
    const drillByLength = [1, 3, 5, 10, 20, 30].map((len) => ({
      length: len,
      count: drillResults.filter(r => drillMetaById[r.id]?.drillLength === len).length,
    }))

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          testsCompleted,
          averageScore,
          bestScore,
          totalStudyTime,
          averageSATScore,
          bestSATScore,
          latestSATScore,
          improvementRate
        },
        modulePerformance,
        categoryPerformance,
        difficultyPerformance,
        strongAreas,
        weakAreas,
        drillOverview: {
          drillsCompleted: drillTotal,
          averageAccuracy: drillAccuracy,
          questionsAnswered: drillQuestions,
          totalTimeMinutes: drillTimeMinutes,
          byLength: drillByLength,
        },
        scoreProgression,
        testHistory
      }
    })

  } catch (error: unknown) {
    console.error('Progress API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch progress data' 
    }, { status: 500 })
  }
}
