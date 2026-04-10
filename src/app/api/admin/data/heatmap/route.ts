import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = searchParams.get('page') || '/'
    const typeFilter = searchParams.get('type') || 'all' // 'click' | 'move' | 'all'
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Cap at 2000 points
    const whereType = typeFilter === 'click' || typeFilter === 'move' ? typeFilter : null

    const points = whereType
      ? await prisma.$queryRaw<{ xPct: number; yPct: number; eventType: string }[]>`
          SELECT TOP 2000 xPct, yPct, eventType
          FROM click_events
          WHERE pagePath = ${page}
            AND eventType = ${whereType}
            AND createdAt >= ${since}
          ORDER BY createdAt DESC
        `
      : await prisma.$queryRaw<{ xPct: number; yPct: number; eventType: string }[]>`
          SELECT TOP 2000 xPct, yPct, eventType
          FROM click_events
          WHERE pagePath = ${page}
            AND createdAt >= ${since}
          ORDER BY createdAt DESC
        `

    // Also get distinct pages that have click events
    const pages = await prisma.$queryRaw<{ pagePath: string; cnt: number }[]>`
      SELECT pagePath, COUNT(*) AS cnt
      FROM click_events
      WHERE createdAt >= ${since}
      GROUP BY pagePath
      ORDER BY cnt DESC
    `

    return NextResponse.json({
      page,
      days,
      total: points.length,
      points: points.map((p) => ({
        xPct: Number(p.xPct),
        yPct: Number(p.yPct),
        eventType: p.eventType,
      })),
      availablePages: pages.map((p) => ({ pagePath: p.pagePath, count: Number(p.cnt) })),
    })
  } catch (err) {
    console.error('[GET /api/admin/data/heatmap]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
