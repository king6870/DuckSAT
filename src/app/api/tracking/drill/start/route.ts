import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth'
import { processEmailAutomationEvent } from '@/lib/email-automations'
import { buildDrillScopeKey } from '@/lib/drill-question-selection'
import { prisma } from '@/lib/prisma'

// POST /api/tracking/drill/start — log drill start and trigger drill-start automation events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const category = typeof body?.category === 'string' ? body.category.trim() : ''
    const moduleType = typeof body?.moduleType === 'string' ? body.moduleType.trim() : ''
    const difficulty = typeof body?.difficulty === 'string' ? body.difficulty.trim() : ''
    const drillLength = Number(body?.drillLength)
    const startedAt = body?.startedAt ? new Date(body.startedAt) : new Date()

    if (!category) {
      return NextResponse.json({ error: 'Missing category' }, { status: 400 })
    }

    if (!Number.isFinite(drillLength) || drillLength <= 0) {
      return NextResponse.json({ error: 'Invalid drillLength' }, { status: 400 })
    }

    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid startedAt timestamp' }, { status: 400 })
    }

    const scopeKey = buildDrillScopeKey({
      moduleType: moduleType || 'mixed',
      category,
      difficulty: difficulty || 'mixed',
    })

    await prisma.userEvent.create({
      data: {
        userId: session.user.id,
        eventType: 'drill',
        eventName: 'drill_started',
        pagePath: `/practice/${category}`,
        metadata: JSON.stringify({
          category,
          moduleType: moduleType || null,
          difficulty: difficulty || null,
          drillLength,
          startedAt: startedAt.toISOString(),
          scopeKey,
        }),
      },
    })

    try {
      await processEmailAutomationEvent({
        userId: session.user.id,
        triggerType: 'user_event',
        triggerKey: `drill_started:${session.user.id}:${scopeKey}:${Math.floor(Date.now() / 60_000)}`,
        eventType: 'drill',
        eventName: 'drill_started',
        pagePath: `/practice/${category}`,
        metadata: {
          category,
          moduleType: moduleType || '',
          difficulty: difficulty || '',
          drillLength,
          startedAt: startedAt.toISOString(),
          scopeKey,
        },
      })
    } catch (automationError) {
      console.error('[/api/tracking/drill/start] Automation error:', automationError)
    }

    return NextResponse.json({
      success: true,
      data: {
        scopeKey,
        startedAt: startedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[/api/tracking/drill/start] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
