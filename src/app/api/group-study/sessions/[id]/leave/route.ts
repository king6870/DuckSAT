import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/group-study/sessions/[id]/leave - participant leaves session
export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const userId = session.user.id

  const membership = await prisma.groupStudyParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId: id,
        userId,
      },
    },
    include: {
      session: {
        select: {
          hostId: true,
          status: true,
        },
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  if (membership.session.hostId === userId && membership.session.status !== 'completed') {
    await prisma.$transaction([
      prisma.groupStudySession.update({
        where: { id },
        data: {
          status: 'canceled',
          endedAt: new Date(),
        },
      }),
      prisma.groupStudyParticipant.updateMany({
        where: { sessionId: id },
        data: {
          progressStatus: 'done',
          isReady: false,
        },
      }),
    ])

    return NextResponse.json({ success: true, hostEndedSession: true })
  }

  await prisma.groupStudyParticipant.update({
    where: { id: membership.id },
    data: {
      inviteStatus: 'left',
      isReady: false,
      progressStatus: 'done',
      lastSeenAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
