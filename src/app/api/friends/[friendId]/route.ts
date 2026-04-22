import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canonicalFriendPair } from '@/lib/groupStudy'

interface RouteContext {
  params: Promise<{ friendId: string }>
}

// DELETE /api/friends/[friendId] - remove a friend relationship
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { friendId } = await context.params
  const userId = session.user.id

  if (!friendId || friendId === userId) {
    return NextResponse.json({ error: 'invalid_friend_id' }, { status: 400 })
  }

  const pair = canonicalFriendPair(userId, friendId)

  await prisma.$transaction([
    prisma.friendship.deleteMany({
      where: {
        userAId: pair.userAId,
        userBId: pair.userBId,
      },
    }),
    prisma.friendRequest.updateMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: friendId, status: 'pending' },
          { fromUserId: friendId, toUserId: userId, status: 'pending' },
        ],
      },
      data: { status: 'canceled' },
    }),
  ])

  return NextResponse.json({ success: true })
}
