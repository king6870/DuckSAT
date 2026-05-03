/**
 * API Endpoint: Get Generation Status
 * GET /api/question-generation/status
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      totalQuestions,
      approvedQuestions,
      pendingQuestions,
      rejectedQuestions,
      generatedToday,
      latestQuestion,
    ] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { reviewStatus: 'approved' } }),
      prisma.question.count({ where: { reviewStatus: 'pending' } }),
      prisma.question.count({ where: { reviewStatus: 'rejected' } }),
      prisma.question.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.question.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          moduleType: true,
          category: true,
          subtopic: true,
          source: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      status: 'idle',
      message: 'Question generation endpoint is available.',
      summary: {
        totalQuestions,
        approvedQuestions,
        pendingQuestions,
        rejectedQuestions,
        generatedToday,
      },
      latestQuestion,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/question-generation/status]', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to load generation status',
      },
      { status: 500 },
    )
  }
}
