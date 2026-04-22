import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSchemaProvisioningError } from '@/lib/schemaProvisioning'

// GET /api/users/search?query=foo - find users by username and attach relationship state
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const query = new URL(request.url).searchParams.get('query')?.trim().toLowerCase() ?? ''

    if (query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        username: {
          contains: query,
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        email: true,
      },
      orderBy: { username: 'asc' },
      take: 20,
    })

    const userIds = users.map((u) => u.id)
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] })
    }

    const [friendships, requests] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [
            { userAId: userId, userBId: { in: userIds } },
            { userBId: userId, userAId: { in: userIds } },
          ],
        },
        select: { userAId: true, userBId: true },
      }),
      prisma.friendRequest.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: { in: userIds }, status: 'pending' },
            { toUserId: userId, fromUserId: { in: userIds }, status: 'pending' },
          ],
        },
        select: { fromUserId: true, toUserId: true, status: true },
      }),
    ])

    const friendshipSet = new Set(
      friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId))
    )

    const outgoingSet = new Set(
      requests.filter((r) => r.fromUserId === userId).map((r) => r.toUserId)
    )
    const incomingSet = new Set(
      requests.filter((r) => r.toUserId === userId).map((r) => r.fromUserId)
    )

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        relationship:
          friendshipSet.has(u.id)
            ? 'friend'
            : outgoingSet.has(u.id)
              ? 'outgoing_pending'
              : incomingSet.has(u.id)
                ? 'incoming_pending'
                : 'none',
      })),
    })
  } catch (error) {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json({ users: [] })
    }

    console.error('[GET /api/users/search] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
