import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/feedback/status — check if user/session has already submitted feedback
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { feedbackSubmittedAt: true },
      })
      return NextResponse.json({
        submitted: !!user?.feedbackSubmittedAt,
        submittedAt: user?.feedbackSubmittedAt ?? null,
      })
    }

    // Anonymous: check by sessionId query param
    const sessionId = request.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ submitted: false, submittedAt: null })
    }

    const existing = await prisma.userFeedback.findFirst({
      where: { sessionId },
      select: { submittedAt: true },
    })

    return NextResponse.json({
      submitted: !!existing,
      submittedAt: existing?.submittedAt ?? null,
    })
  } catch (err) {
    console.error('[GET /api/feedback/status]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
