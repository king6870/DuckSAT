import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/tracking/survey — log survey step answers with timing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { surveyType, responses } = body

    if (!surveyType || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Missing surveyType or responses array' }, { status: 400 })
    }

    // Limit to 20 steps max
    const capped = responses.slice(0, 20)

    await prisma.surveyResponse.createMany({
      data: capped.map((r: { stepNumber: number; stepName: string; answer?: unknown; timeSpentMs: number; skipped?: boolean }) => ({
        userId: session.user.id,
        surveyType,
        stepNumber: r.stepNumber,
        stepName: r.stepName,
        answer: r.answer != null ? JSON.stringify(r.answer) : null,
        timeSpentMs: Math.max(0, r.timeSpentMs),
        skipped: r.skipped ?? false,
      })),
    })

    return NextResponse.json({ success: true, count: capped.length })
  } catch (error) {
    console.error('[/api/tracking/survey] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
