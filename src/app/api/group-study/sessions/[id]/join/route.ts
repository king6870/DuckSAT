import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/group-study/sessions/[id]/join - accept invite and join session
export async function POST(_request: NextRequest, context: RouteContext) {
  return (async () => {
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
        select: { status: true },
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  if (membership.session.status === 'completed' || membership.session.status === 'canceled') {
    return NextResponse.json({ error: 'session_closed' }, { status: 409 })
  }

  const now = new Date()

  await prisma.groupStudyParticipant.update({
    where: { id: membership.id },
    data: {
      inviteStatus: 'accepted',
      joinedAt: membership.joinedAt ?? now,
      lastSeenAt: now,
      progressStatus: membership.session.status === 'active' ? 'thinking' : 'waiting',
    },
  })

    return NextResponse.json({ success: true })
  })().catch((error) => {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('group-study'), { status: 503 })
    }

    console.error('[POST /api/group-study/sessions/[id]/join] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  })
}
