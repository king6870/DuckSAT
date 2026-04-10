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
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const eventType = searchParams.get('eventType') || null

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const rows = eventType
      ? await prisma.$queryRaw<{ eventName: string; eventType: string; cnt: number; uniqueUsers: number }[]>`
          SELECT
            eventName,
            eventType,
            COUNT(*) AS cnt,
            COUNT(DISTINCT userId) AS uniqueUsers
          FROM user_events
          WHERE createdAt >= ${since}
            AND eventType = ${eventType}
          GROUP BY eventName, eventType
          ORDER BY cnt DESC
          OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
        `
      : await prisma.$queryRaw<{ eventName: string; eventType: string; cnt: number; uniqueUsers: number }[]>`
          SELECT
            eventName,
            eventType,
            COUNT(*) AS cnt,
            COUNT(DISTINCT userId) AS uniqueUsers
          FROM user_events
          WHERE createdAt >= ${since}
          GROUP BY eventName, eventType
          ORDER BY cnt DESC
          OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
        `

    return NextResponse.json({
      days,
      rows: rows.map((r) => ({
        eventName: r.eventName,
        eventType: r.eventType,
        count: Number(r.cnt),
        uniqueUsers: Number(r.uniqueUsers),
      })),
    })
  } catch (err) {
    console.error('[GET /api/admin/data/events]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
