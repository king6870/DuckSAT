import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      feedbackTotal,
      feedbackRatingAgg,
      feedbackThisWeek,
      feedbackWithText,
      usersTotal,
      usersPaid,
      usersFree,
      usersNewThisWeek,
      usersQrTotal,
      usersQrThisWeek,
    ] = await Promise.all([
      prisma.userFeedback.count(),
      prisma.userFeedback.aggregate({ _avg: { rating: true } }),
      prisma.userFeedback.count({ where: { submittedAt: { gte: sevenDaysAgo } } }),
      prisma.userFeedback.count({
        where: { review: { not: null } },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          subscriptionPlan: { in: ['monthly', 'yearly'] },
          subscriptionStatus: 'active',
        },
      }),
      prisma.user.count({ where: { subscriptionPlan: 'free' } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { joinedViaQrCode: true } }),
      prisma.user.count({ where: { joinedViaQrCode: true, qrCodeJoinedAt: { gte: sevenDaysAgo } } }),
    ])

    return NextResponse.json({
      feedback: {
        total: feedbackTotal,
        averageRating: feedbackRatingAgg._avg.rating
          ? Math.round(feedbackRatingAgg._avg.rating * 10) / 10
          : 0,
        thisWeek: feedbackThisWeek,
        withText: feedbackWithText,
      },
      users: {
        total: usersTotal,
        paid: usersPaid,
        free: usersFree,
        newThisWeek: usersNewThisWeek,
        qrTotal: usersQrTotal,
        qrThisWeek: usersQrThisWeek,
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/data/summary]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
