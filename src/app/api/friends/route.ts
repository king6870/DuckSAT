import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

// GET /api/friends - list accepted friends for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        userA: { select: { id: true, username: true, name: true, image: true, email: true } },
        userB: { select: { id: true, username: true, name: true, image: true, email: true } },
      },
    })

    const friends = friendships.map((friendship) => {
      const friend = friendship.userAId === userId ? friendship.userB : friendship.userA
      return {
        id: friend.id,
        username: friend.username,
        name: friend.name,
        image: friend.image,
        email: friend.email,
        friendshipCreatedAt: friendship.createdAt,
      }
    })

    return NextResponse.json({ friends })
  } catch (error) {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json({ friends: [], ...schemaProvisioningResponse('friends') })
    }

    console.error('[GET /api/friends] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
