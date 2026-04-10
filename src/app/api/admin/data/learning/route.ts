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
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Per-category drill aggregates
    const rows = await prisma.$queryRaw<{
      category: string
      drills: number
      completedDrills: number
      totalQuestions: number
      correctAnswers: number
      avgScore: number
      avgTimeMs: number
    }[]>`
      SELECT
        category,
        COUNT(*) AS drills,
        SUM(CASE WHEN abandoned = 0 THEN 1 ELSE 0 END) AS completedDrills,
        SUM(totalQuestions) AS totalQuestions,
        SUM(correctAnswers) AS correctAnswers,
        AVG(CAST(score AS FLOAT)) AS avgScore,
        AVG(CAST(avgTimePerQ AS FLOAT)) AS avgTimeMs
      FROM drill_attempts
      WHERE startedAt >= ${since}
      GROUP BY category
      ORDER BY totalQuestions DESC
    `

    return NextResponse.json({
      days,
      rows: rows.map((r) => ({
        category: r.category,
        drills: Number(r.drills),
        completedDrills: Number(r.completedDrills),
        totalQuestions: Number(r.totalQuestions),
        correctAnswers: Number(r.correctAnswers),
        avgScore: Math.round(Number(r.avgScore)),
        avgTimeMs: Math.round(Number(r.avgTimeMs)),
        accuracy:
          Number(r.totalQuestions) > 0
            ? Math.round((Number(r.correctAnswers) / Number(r.totalQuestions)) * 100)
            : 0,
      })),
    })
  } catch (err) {
    console.error('[GET /api/admin/data/learning]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
