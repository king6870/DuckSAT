import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    const [user, testResults, feedback, activityStats] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          promoCodeUsed: true,
          isTester: true,
          feedbackSubmittedAt: true,
        },
      }),
      prisma.testResult.findMany({
        where: { userId: id },
        orderBy: { completedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          score: true,
          completedAt: true,
          practiceTestId: true,
          practiceTest: { select: { name: true } },
        },
      }),
      prisma.userFeedback.findMany({
        where: { userId: id },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          rating: true,
          review: true,
          pageUrl: true,
          submittedAt: true,
        },
      }),
      prisma.userDailyActivity.groupBy({
        by: ['userId'],
        where: { userId: id },
        _sum: { totalTimeMs: true },
        _max: { date: true },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const activityStat = activityStats[0]

    return NextResponse.json({
      ...user,
      testCount: testResults.length,
      totalTimeMinutes: activityStat
        ? Math.round((activityStat._sum.totalTimeMs ?? 0) / 60000)
        : 0,
      lastActiveDate: activityStat?._max.date ?? null,
      testResults,
      feedback,
    })
  } catch (err) {
    console.error('[GET /api/admin/data/users/[id]]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
