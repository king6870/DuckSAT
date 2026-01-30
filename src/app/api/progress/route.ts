import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface QuestionResult {
  category?: string
  moduleType?: string
  isCorrect: boolean
}

interface TestResult {
  questionResults: QuestionResult[]
  score: number
  createdAt: Date
}

export async function GET(_request: NextRequest) {
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

    // Get test results
    const testResults = await prisma.testResult.findMany({
      where: { userId: user.id },
      include: {
        questionResults: true
      },
      orderBy: { completedAt: 'desc' }
    })

    // Calculate analytics
    const testsCompleted = testResults.length
    const scores = testResults.map(result => result.score)
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    
    // Calculate time spent (in minutes)
    const totalTimeSpent = testResults.reduce((total, result) => {
      return total + (result.totalTimeSpent || 0)
    }, 0)

    // Get category performance
    const categoryStats: Record<string, { correct: number, total: number }> = {}
    
    testResults.forEach(result => {
      result.questionResults.forEach((qr: QuestionResult) => {
        const category = qr.category || 'Unknown'
        if (!categoryStats[category]) {
          categoryStats[category] = { correct: 0, total: 0 }
        }
        categoryStats[category].total++
        if (qr.isCorrect) {
          categoryStats[category].correct++
        }
      })
    })

    // Determine strong and weak areas
    const categoryPerformance = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total
    })).filter(item => item.total >= 3) // Only include categories with at least 3 questions

    const strongAreas = categoryPerformance
      .filter(item => item.percentage >= 75)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3)
      .map(item => item.category)

    const weakAreas = categoryPerformance
      .filter(item => item.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3)
      .map(item => item.category)

    // Recent test scores (last 5)
    const recentScores = scores.slice(0, 5)

    // Module performance
    const moduleStats: Record<string, { correct: number, total: number }> = {}
    testResults.forEach(result => {
      result.questionResults.forEach((qr: QuestionResult) => {
        const moduleType = qr.moduleType || 'Unknown'
        if (!moduleStats[moduleType]) {
          moduleStats[moduleType] = { correct: 0, total: 0 }
        }
        moduleStats[moduleType].total++
        if (qr.isCorrect) {
          moduleStats[moduleType].correct++
        }
      })
    })

    const modulePerformance = Object.entries(moduleStats).map(([moduleType, stats]) => ({
      module: moduleType,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total
    }))

    return NextResponse.json({
      success: true,
      data: {
        testsCompleted,
        averageScore,
        strongAreas,
        weakAreas,
        recentScores,
        timeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
        categoryPerformance,
        modulePerformance,
        testHistory: testResults.map(result => ({
          id: result.id,
          score: result.score,
          completedAt: result.completedAt,
          timeSpent: result.totalTimeSpent
        }))
      }
    })

  } catch (error: unknown) {
    console.error('Progress API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch progress data' 
    }, { status: 500 })
  }
}
