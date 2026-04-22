import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canonicalFriendPair } from '@/lib/groupStudy'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/friends/requests/[id] body: { action: 'accept' | 'decline' }
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const userId = session.user.id
    const body = await request.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : ''

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    }

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id },
      select: { id: true, fromUserId: true, toUserId: true, status: true },
    })

    if (!friendRequest || friendRequest.toUserId !== userId) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 })
    }

    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'request_not_pending' }, { status: 409 })
    }

    if (action === 'decline') {
      await prisma.friendRequest.update({
        where: { id },
        data: { status: 'declined' },
      })
      return NextResponse.json({ success: true })
    }

    const pair = canonicalFriendPair(friendRequest.fromUserId, friendRequest.toUserId)

    await prisma.$transaction(async (tx) => {
      const existingFriendship = await tx.friendship.findUnique({
        where: { userAId_userBId: pair },
        select: { id: true },
      })

      await tx.friendRequest.update({
        where: { id },
        data: { status: 'accepted' },
      })

      if (!existingFriendship) {
        await tx.friendship.create({ data: pair })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('friends'), { status: 503 })
    }

    console.error('[PATCH /api/friends/requests/[id]] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// DELETE /api/friends/requests/[id] - cancel a sent request
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const userId = session.user.id

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id },
      select: { id: true, fromUserId: true, status: true },
    })

    if (!friendRequest || friendRequest.fromUserId !== userId) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 })
    }

    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'request_not_pending' }, { status: 409 })
    }

    await prisma.friendRequest.update({
      where: { id },
      data: { status: 'canceled' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('friends'), { status: 503 })
    }

    console.error('[DELETE /api/friends/requests/[id]] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
