import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/feedback — submit a site review (auth optional)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    const body = await request.json()
    const { rating, review, sessionId, pageUrl } = body

    // --- Validation ---
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'invalid_rating' }, { status: 400 })
    }

    if (review !== undefined && review !== null) {
      if (typeof review !== 'string') {
        return NextResponse.json({ error: 'invalid_review' }, { status: 400 })
      }
      if (review.length > 500) {
        return NextResponse.json({ error: 'review_too_long' }, { status: 400 })
      }
    }

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'session_required' }, { status: 400 })
    }

    // --- Duplicate check ---
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { feedbackSubmittedAt: true },
      })
      if (user?.feedbackSubmittedAt) {
        return NextResponse.json({ error: 'already_submitted' }, { status: 409 })
      }
    } else {
      const existing = await prisma.userFeedback.findFirst({
        where: { sessionId: String(sessionId) },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json({ error: 'already_submitted' }, { status: 409 })
      }
    }

    // --- Insert ---
    const userAgent = request.headers.get('user-agent') ?? undefined

    const feedback = await prisma.userFeedback.create({
      data: {
        userId: userId ?? undefined,
        sessionId: userId ? undefined : String(sessionId),
        rating: ratingNum,
        review: review?.trim() || undefined,
        userAgent,
        pageUrl: pageUrl ? String(pageUrl).slice(0, 255) : undefined,
      },
    })

    // Update user's feedbackSubmittedAt
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { feedbackSubmittedAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, feedbackId: feedback.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/feedback]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
