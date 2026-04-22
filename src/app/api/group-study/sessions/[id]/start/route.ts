import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/group-study/sessions/[id]/start - host starts session from lobby
export async function POST(_request: NextRequest, context: RouteContext) {
  return (async () => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id } = await context.params
  const userId = session.user.id

  const studySession = await prisma.groupStudySession.findUnique({
    where: { id },
    include: {
      participants: true,
      questions: { select: { id: true } },
    },
  })

  if (!studySession) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  if (studySession.hostId !== userId) {
    return NextResponse.json({ error: 'only_host_can_start' }, { status: 403 })
  }

  if (studySession.status !== 'lobby') {
    return NextResponse.json({ error: 'session_not_in_lobby' }, { status: 409 })
  }

  const acceptedParticipants = studySession.participants.filter(
    (participant) => participant.inviteStatus === 'accepted'
  )

  if (acceptedParticipants.length < 2) {
    return NextResponse.json({ error: 'need_at_least_two_participants' }, { status: 400 })
  }

  if (studySession.questions.length === 0) {
    return NextResponse.json({ error: 'no_questions_in_session' }, { status: 400 })
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.groupStudySession.update({
      where: { id },
      data: {
        status: 'active',
        startedAt: now,
        currentQuestionIndex: 0,
        currentQuestionStartedAt: now,
        revealStartedAt: null,
        revealEndsAt: null,
      },
    }),
    prisma.groupStudyParticipant.updateMany({
      where: { sessionId: id, inviteStatus: 'accepted' },
      data: {
        progressStatus: 'thinking',
        isReady: true,
        lastSeenAt: now,
      },
    }),
  ])

    return NextResponse.json({ success: true })
  })().catch((error) => {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('group-study'), { status: 503 })
    }

    console.error('[POST /api/group-study/sessions/[id]/start] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  })
}
