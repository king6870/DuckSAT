import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/tracking/pageview — log page view with dwell time
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const body = await request.json()

    const {
      sessionId,
      pagePath,
      pageSection,
      enteredAt,
      dwellTimeMs,
      scrollDepthPct,
      referrer,
      deviceType,
    } = body

    if (!sessionId || !pagePath || dwellTimeMs == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ignore very short views (under 500ms) — likely bots or accidental
    if (dwellTimeMs < 500) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Cap dwell time at 30 minutes to filter out idle tabs
    const cappedDwell = Math.min(dwellTimeMs, 30 * 60 * 1000)

    const userAgent = request.headers.get('user-agent') || null

    await prisma.pageView.create({
      data: {
        userId,
        sessionId,
        pagePath,
        pageSection: pageSection || null,
        enteredAt: new Date(enteredAt),
        dwellTimeMs: cappedDwell,
        scrollDepthPct: scrollDepthPct ?? null,
        referrer: referrer || null,
        userAgent,
        deviceType: deviceType || null,
      },
    })

    // Update daily activity page count
    if (userId) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await prisma.userDailyActivity.upsert({
        where: {
          userId_date: {
            userId,
            date: today
          }
        },
        update: {
          pagesVisited: { increment: 1 },
          totalTimeMs: { increment: cappedDwell },
        },
        create: {
          userId,
          date: today,
          pagesVisited: 1,
          totalTimeMs: cappedDwell,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/tracking/pageview] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
