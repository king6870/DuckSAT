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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const ratingFilter = searchParams.get('rating')
    const hasText = searchParams.get('hasText')
    const search = searchParams.get('search')?.trim()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const sortBy = searchParams.get('sortBy') ?? 'submittedAt'
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'
    const exportCsv = searchParams.get('exportCsv') === 'true'

    const where: Record<string, unknown> = {}
    if (ratingFilter) where.rating = parseInt(ratingFilter, 10)
    if (hasText === 'true') where.review = { not: null }
    if (from || to) {
      where.submittedAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }
    if (search) {
      where.OR = [
        { review: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const allowedSortFields: Record<string, boolean> = {
      submittedAt: true,
      rating: true,
    }
    const orderBy = allowedSortFields[sortBy]
      ? { [sortBy]: sortDir }
      : { submittedAt: 'desc' as const }

    const total = await prisma.userFeedback.count({ where })

    const rows = await prisma.userFeedback.findMany({
      where,
      orderBy,
      ...(exportCsv ? {} : { skip: (page - 1) * limit, take: limit }),
      include: {
        user: {
          select: { id: true, name: true, email: true, subscriptionPlan: true },
        },
      },
    })

    if (exportCsv) {
      const header = 'id,rating,review,pageUrl,submittedAt,userId,userName,userEmail,plan'
      const escape = (v: unknown) => {
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return `"${s}"`
      }
      const lines = rows.map((r) =>
        [
          escape(r.id),
          escape(r.rating),
          escape(r.review),
          escape(r.pageUrl),
          escape(r.submittedAt.toISOString()),
          escape(r.userId),
          escape(r.user?.name),
          escape(r.user?.email),
          escape(r.user?.subscriptionPlan),
        ].join(',')
      )
      const csv = [header, ...lines].join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="feedback-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({
      data: rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[GET /api/admin/data/feedback]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
