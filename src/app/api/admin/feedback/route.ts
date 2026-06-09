import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25')))
    const ratingFilter = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined
    const skip = (page - 1) * limit

    const where = ratingFilter ? { rating: ratingFilter } : {}

    const [feedback, total, summary] = await Promise.all([
      prisma.userFeedback.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          review: true,
          pageUrl: true,
          userAgent: true,
          submittedAt: true,
          sessionId: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.userFeedback.count({ where }),
      prisma.userFeedback.groupBy({
        by: ['rating'],
        _count: { rating: true },
      }),
    ])

    const ratingCounts = Object.fromEntries(
      [1, 2, 3, 4, 5].map((r) => [r, summary.find((s) => s.rating === r)?._count.rating ?? 0])
    )
    const totalCount = Object.values(ratingCounts).reduce((a, b) => a + b, 0)
    const averageRating =
      totalCount > 0
        ? Object.entries(ratingCounts).reduce((sum, [r, c]) => sum + Number(r) * c, 0) / totalCount
        : 0

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total: totalCount,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingCounts,
        withReview: feedback.filter((f) => f.review).length,
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/feedback]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
    }

    await prisma.userFeedback.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/admin/feedback]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
