import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/tracking/events — batch log user events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const body = await request.json()

    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: 'Missing events array' }, { status: 400 })
    }

    // Limit batch size to prevent abuse
    const events = body.events.slice(0, 50)

    await prisma.userEvent.createMany({
      data: events.map((e: { eventType: string; eventName: string; metadata?: Record<string, unknown>; pagePath?: string; sessionId?: string }) => ({
        userId,
        sessionId: e.sessionId || body.sessionId || null,
        eventType: e.eventType,
        eventName: e.eventName,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null,
        pagePath: e.pagePath || null,
      })),
    })

    return NextResponse.json({ success: true, count: events.length })
  } catch (error) {
    console.error('[/api/tracking/events] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
