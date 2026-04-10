import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RawClickEvent {
  pagePath: unknown
  xPct: unknown
  yPct: unknown
  element?: unknown
  label?: unknown
  eventType?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const body = await req.json() as { sessionId?: string; events?: unknown[] }

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: 'Missing events array' }, { status: 400 })
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null

    // Validate + sanitize each event
    const valid = (body.events as RawClickEvent[]).slice(0, 100).filter((e) => {
      if (typeof e.pagePath !== 'string' || !e.pagePath.startsWith('/')) return false
      const x = Number(e.xPct)
      const y = Number(e.yPct)
      if (!Number.isFinite(x) || x < 0 || x > 100) return false
      if (!Number.isFinite(y) || y < 0 || y > 100) return false
      return true
    })

    if (valid.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Guard: if clickEvent model is missing from deployed Prisma client (old build), swallow silently
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(prisma as any).clickEvent) {
      return NextResponse.json({ success: true, count: 0 })
    }

    await prisma.clickEvent.createMany({
      data: valid.map((e) => ({
        userId,
        sessionId,
        pagePath: e.pagePath as string,
        xPct: Number(e.xPct),
        yPct: Number(e.yPct),
        element: typeof e.element === 'string' ? e.element.slice(0, 50) : null,
        label: typeof e.label === 'string' ? e.label.slice(0, 80) : null,
        eventType: e.eventType === 'move' ? 'move' : 'click',
      })),
    })

    return NextResponse.json({ success: true, count: valid.length })
  } catch (err) {
    console.error('[POST /api/tracking/clicks]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
