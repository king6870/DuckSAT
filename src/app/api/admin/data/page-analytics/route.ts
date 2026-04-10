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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)))

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Group by pagePath: Prisma doesn't support groupBy + count for SQL Server well,
    // so we use raw query via $queryRawUnsafe with parametrized values
    const rows = await prisma.$queryRaw<
      { pagePath: string; visits: number; totalDwellMs: number; avgDwellMs: number; uniqueUsers: number }[]
    >`
      SELECT
        pagePath,
        COUNT(*) AS visits,
        SUM(dwellTimeMs) AS totalDwellMs,
        AVG(dwellTimeMs) AS avgDwellMs,
        COUNT(DISTINCT userId) AS uniqueUsers
      FROM page_views
      WHERE createdAt >= ${since}
      GROUP BY pagePath
      ORDER BY totalDwellMs DESC
      OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
    `

    return NextResponse.json({
      days,
      rows: rows.map((r) => ({
        pagePath: r.pagePath,
        visits: Number(r.visits),
        totalDwellMs: Number(r.totalDwellMs),
        avgDwellMs: Math.round(Number(r.avgDwellMs)),
        uniqueUsers: Number(r.uniqueUsers),
      })),
    })
  } catch (err) {
    console.error('[GET /api/admin/data/page-analytics]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
