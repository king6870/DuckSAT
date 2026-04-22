import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/group-study/sessions/[id]/ready body: { isReady: boolean }
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const userId = session.user.id
  const body = await request.json().catch(() => ({}))
  const isReady = typeof body.isReady === 'boolean' ? body.isReady : true

  const membership = await prisma.groupStudyParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId: id,
        userId,
      },
    },
    include: {
      session: {
        select: { status: true },
      },
    },
  })

  if (!membership || membership.inviteStatus !== 'accepted') {
    return NextResponse.json({ error: 'not_in_session' }, { status: 404 })
  }

  if (membership.session.status !== 'lobby') {
    return NextResponse.json({ error: 'session_not_in_lobby' }, { status: 409 })
  }

  await prisma.groupStudyParticipant.update({
    where: { id: membership.id },
    data: {
      isReady,
      lastSeenAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
