import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ADMIN_EMAILS } from '@/middleware/adminAuth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // 'pending', 'approved', 'rejected', or null for all
    const category = searchParams.get('category')
    const subtopic = searchParams.get('subtopic')

    const skip = (page - 1) * limit

    const where: Record<string, any> = {}
    if (status) {
      where.reviewStatus = status
    }
    if (category) {
      where.category = category
    }
    if (subtopic) {
      where.subtopic = subtopic
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        select: {
          id: true,
          subtopicId: true,
          moduleType: true,
          difficulty: true,
          category: true,
          subtopic: true,
          question: true,
          passage: true,
          options: true,
          correctAnswer: true,
          explanation: true,
          wrongAnswerExplanations: true,
          imageUrl: true,
          imageAlt: true,
          chartData: true,
          timeEstimate: true,
          source: true,
          tags: true,
          isActive: true,
          reviewStatus: true,
          reviewComments: true,
          reviewedBy: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          subtopicRef: {
            select: {
              id: true,
              name: true,
              description: true,
              topicId: true,
              targetQuestions: true,
              currentCount: true,
              isActive: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.question.count({ where })
    ])

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, reviewStatus, reviewComments } = body

    if (!questionId || !reviewStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return NextResponse.json({ error: 'Invalid review status' }, { status: 400 })
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        reviewStatus,
        reviewComments: reviewComments || null,
        reviewedBy: session.user.email,
        reviewedAt: new Date()
      }
    })

    return NextResponse.json({ question: updatedQuestion })

  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
