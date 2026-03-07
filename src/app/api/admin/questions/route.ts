import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

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
    const reviewer = searchParams.get('reviewer') // 'me', 'others', 'none'
    const category = searchParams.get('category')
    const subtopic = searchParams.get('subtopic')
    const hasDiagram = searchParams.get('hasDiagram')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) {
      where.reviewStatus = status
    }
    if (reviewer) {
      if (reviewer === 'me') {
        where.reviewedBy = session.user.email
      } else if (reviewer === 'others') {
        where.reviewedBy = {
          not: session.user.email,
          notIn: [null, ''] // Ensure it's actually reviewed by someone else
        }
      } else if (reviewer === 'none') {
        where.reviewedBy = null
      }
    }
    if (category) {
      where.category = category
    }
    if (subtopic) {
      where.subtopic = {
        contains: subtopic,
        mode: 'insensitive'
      }
    }
    if (hasDiagram === 'true') {
      where.OR = [
        { imageData: { not: null } },
        { imageUrl: { not: null } }
      ]
    }

    const [rawQuestions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        select: {
          id: true,
          questionIndex: true,
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
          imageData: true,
          imageMimeType: true,
          chartData: true,
          timeEstimate: true,
          source: true,
          tags: true,
          isActive: true,
          reviewStatus: true,
          reviewRating: true,
          diagramAccurate: true,
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
        orderBy: [
          { questionIndex: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.question.count({ where })
    ])

    // Convert binary imageData to base64 strings; treat empty buffers as null
    const questions = rawQuestions.map(q => ({
      ...q,
      imageData: q.imageData && q.imageData.length > 0
        ? Buffer.from(q.imageData).toString('base64')
        : null
    }))

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
    const { questionId, reviewStatus, reviewComments, reviewRating, diagramAccurate } = body

    if (!questionId || !reviewStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'pending'].includes(reviewStatus)) {
      return NextResponse.json({ error: 'Invalid review status' }, { status: 400 })
    }

    // Validate rating is required for approval/rejection and is 1-5
    if ((reviewStatus === 'approved' || reviewStatus === 'rejected')) {
      if (!reviewRating || typeof reviewRating !== 'number' || reviewRating < 1 || reviewRating > 5) {
        return NextResponse.json({ error: 'Rating (1-5) is required for approval or rejection' }, { status: 400 })
      }
    }

    // Get user to link the review
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use a transaction to ensure both updates happen or neither
    const [updatedQuestion] = await prisma.$transaction([
      prisma.question.update({
        where: { id: questionId },
        data: {
          reviewStatus,
          reviewRating: reviewRating || null,
          diagramAccurate: diagramAccurate !== undefined ? diagramAccurate : null,
          reviewComments: reviewComments || null,
          reviewedBy: session.user.email,
          reviewedAt: new Date()
        }
      }),
      // Create or update the review record
      prisma.questionReview.upsert({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: questionId
          }
        },
        create: {
          questionId,
          userId: user.id,
          rating: reviewRating || 0, // Default to 0 if not provided (though validation ensures it for approved/rejected)
          description: reviewComments || null,
          hasDiagram: diagramAccurate || false
        },
        update: {
          rating: reviewRating || 0,
          description: reviewComments || null,
          hasDiagram: diagramAccurate || false
        }
      })
    ])

    // Return minimal response to avoid sending back huge image data
    return NextResponse.json({
      success: true,
      question: {
        id: updatedQuestion.id,
        reviewStatus: updatedQuestion.reviewStatus
      }
    })

  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    if (filter !== 'auto-generated') {
      return NextResponse.json({ error: 'Invalid filter parameter' }, { status: 400 })
    }

    const result = await prisma.question.deleteMany({
      where: {
        question: {
          contains: 'auto-generated',
          mode: 'insensitive'
        }
      }
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Error deleting questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
