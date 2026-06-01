import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { processEmailAutomationEvent } from '@/lib/email-automations'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// POST /api/tracking/pageview — log page view with dwell time
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const body = await request.json()

    const {
      sessionId,
      pagePath,
      pageSection,
      enteredAt,
      dwellTimeMs,
      scrollDepthPct,
      referrer,
      deviceType,
    } = body

    if (!sessionId || !pagePath || dwellTimeMs == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dwell = Number(dwellTimeMs)
    if (!Number.isFinite(dwell) || dwell < 0) {
      return NextResponse.json({ error: 'Invalid dwell time' }, { status: 400 })
    }

    // enteredAt may be missing or malformed for keepalive/beacon edge cases.
    const enteredAtDate = enteredAt ? new Date(enteredAt) : new Date(Date.now() - dwell)
    if (Number.isNaN(enteredAtDate.getTime())) {
      return NextResponse.json({ error: 'Invalid enteredAt timestamp' }, { status: 400 })
    }

    // Ignore very short views (under 500ms) — likely bots or accidental
    if (dwell < 500) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Cap dwell time at 30 minutes to filter out idle tabs
    const cappedDwell = Math.min(dwell, 30 * 60 * 1000)

    const safeReferrer = typeof referrer === 'string' && referrer.startsWith('/')
      ? referrer
      : null

    const userAgent = request.headers.get('user-agent') || null

    await prisma.pageView.create({
      data: {
        userId,
        sessionId,
        pagePath,
        pageSection: pageSection || null,
        enteredAt: enteredAtDate,
        dwellTimeMs: cappedDwell,
        scrollDepthPct: scrollDepthPct ?? null,
        referrer: safeReferrer,
        userAgent,
        deviceType: deviceType || null,
      },
    })

    // Update daily activity page count.
    // Avoid upsert on @db.Date keys because timezone/precision can cause false misses
    // and race into unique constraint errors in concurrent requests.
    if (userId) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const existing = await prisma.userDailyActivity.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: { id: true },
      })

      if (existing) {
        await prisma.userDailyActivity.update({
          where: { id: existing.id },
          data: {
            pagesVisited: { increment: 1 },
            totalTimeMs: { increment: cappedDwell },
          },
        })
      } else {
        try {
          await prisma.userDailyActivity.create({
            data: {
              userId,
              date: today,
              pagesVisited: 1,
              totalTimeMs: cappedDwell,
            },
          })
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            // Another request created today's row first; retry as update.
            const latest = await prisma.userDailyActivity.findFirst({
              where: {
                userId,
                date: {
                  gte: today,
                  lt: tomorrow,
                },
              },
              select: { id: true },
            })

            if (latest) {
              await prisma.userDailyActivity.update({
                where: { id: latest.id },
                data: {
                  pagesVisited: { increment: 1 },
                  totalTimeMs: { increment: cappedDwell },
                },
              })
            }
          } else {
            throw error
          }
        }
      }

      try {
        await processEmailAutomationEvent({
          userId,
          triggerType: 'page_dwell',
          pagePath,
          dwellTimeMs: cappedDwell,
        })
      } catch (automationError) {
        console.error('[/api/tracking/pageview] Automation error:', automationError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/tracking/pageview] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
