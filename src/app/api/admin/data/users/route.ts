import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

type SortDir = 'asc' | 'desc'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const planFilter = searchParams.get('plan')
    const statusFilter = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const sortBy = searchParams.get('sortBy') ?? 'createdAt'
    const sortDir: SortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'

    const qrOnly = searchParams.get('qrOnly') === 'true'

    const where: Record<string, unknown> = {}
    if (planFilter) where.subscriptionPlan = planFilter
    if (statusFilter) where.subscriptionStatus = statusFilter
    if (qrOnly) where.joinedViaQrCode = true
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    // Fetch all matching users with test count (in-memory sort handles derived fields)
    const users = await prisma.user.findMany({
      where,
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
        joinedViaQrCode: true,
        qrCodeJoinedAt: true,
        _count: { select: { testResults: true } },
      },
    })

    // Fetch activity aggregates for all users in one query
    const activityStats = await prisma.userDailyActivity.groupBy({
      by: ['userId'],
      _sum: { totalTimeMs: true },
      _max: { date: true },
    })

    const activityMap = new Map(
      activityStats.map((a) => [
        a.userId,
        {
          totalTimeMinutes: Math.round((a._sum.totalTimeMs ?? 0) / 60000),
          lastActiveDate: a._max.date,
        },
      ])
    )

    // Merge
    const enriched = users.map((u) => {
      const activity = activityMap.get(u.id)
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        subscriptionPlan: u.subscriptionPlan,
        subscriptionStatus: u.subscriptionStatus,
        currentPeriodEnd: u.currentPeriodEnd,
        promoCodeUsed: u.promoCodeUsed,
        isTester: u.isTester,
        feedbackSubmittedAt: u.feedbackSubmittedAt,
        joinedViaQrCode: u.joinedViaQrCode,
        qrCodeJoinedAt: u.qrCodeJoinedAt,
        testCount: u._count.testResults,
        totalTimeMinutes: activity?.totalTimeMinutes ?? 0,
        lastActiveDate: activity?.lastActiveDate ?? null,
      }
    })

    // Sort in memory
    const compare = (a: (typeof enriched)[0], b: (typeof enriched)[0]) => {
      let valA: string | number | Date | null | undefined
      let valB: string | number | Date | null | undefined
      switch (sortBy) {
        case 'name':
          valA = a.name ?? ''
          valB = b.name ?? ''
          break
        case 'email':
          valA = a.email
          valB = b.email
          break
        case 'subscriptionPlan':
          valA = a.subscriptionPlan
          valB = b.subscriptionPlan
          break
        case 'testCount':
          valA = a.testCount
          valB = b.testCount
          break
        case 'totalTimeMinutes':
          valA = a.totalTimeMinutes
          valB = b.totalTimeMinutes
          break
        case 'lastActiveDate':
          valA = a.lastActiveDate ? new Date(a.lastActiveDate).getTime() : 0
          valB = b.lastActiveDate ? new Date(b.lastActiveDate).getTime() : 0
          break
        default:
          valA = a.createdAt
          valB = b.createdAt
      }
      if (valA == null) return sortDir === 'asc' ? -1 : 1
      if (valB == null) return sortDir === 'asc' ? 1 : -1
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    }

    enriched.sort(compare)

    // QR users always float to the top when not filtering by another sort
    if (sortBy === 'createdAt') {
      enriched.sort((a, b) => {
        if (a.joinedViaQrCode && !b.joinedViaQrCode) return -1
        if (!a.joinedViaQrCode && b.joinedViaQrCode) return 1
        return 0
      })
    }

    const total = enriched.length
    const paged = enriched.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      data: paged,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[GET /api/admin/data/users]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
