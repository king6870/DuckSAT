import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canonicalFriendPair } from '@/lib/groupStudy'

// GET /api/friends/requests - incoming and outgoing friend requests
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toUserId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
          select: { id: true, username: true, name: true, image: true, email: true },
        },
      },
    }),
    prisma.friendRequest.findMany({
      where: { fromUserId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        toUser: {
          select: { id: true, username: true, name: true, image: true, email: true },
        },
      },
    }),
  ])

  return NextResponse.json({
    incoming: incoming.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      fromUser: request.fromUser,
    })),
    outgoing: outgoing.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      toUser: request.toUser,
    })),
  })
}

// POST /api/friends/requests - send friend request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await request.json().catch(() => ({}))
  const toUserId = typeof body.toUserId === 'string' ? body.toUserId.trim() : ''

  if (!toUserId) {
    return NextResponse.json({ error: 'toUserId_required' }, { status: 400 })
  }
  if (toUserId === userId) {
    return NextResponse.json({ error: 'cannot_friend_self' }, { status: 400 })
  }

  const toUser = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true },
  })
  if (!toUser) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  }

  const pair = canonicalFriendPair(userId, toUserId)
  const existingFriendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: pair },
    select: { id: true },
  })
  if (existingFriendship) {
    return NextResponse.json({ error: 'already_friends' }, { status: 409 })
  }

  const reversePending = await prisma.friendRequest.findUnique({
    where: {
      fromUserId_toUserId: {
        fromUserId: toUserId,
        toUserId: userId,
      },
    },
    select: { id: true, status: true },
  })

  if (reversePending?.status === 'pending') {
    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: reversePending.id },
        data: { status: 'accepted' },
      }),
      prisma.friendship.create({
        data: pair,
      }),
    ])

    return NextResponse.json({ success: true, autoAccepted: true })
  }

  const existingOutgoing = await prisma.friendRequest.findUnique({
    where: {
      fromUserId_toUserId: {
        fromUserId: userId,
        toUserId,
      },
    },
    select: { id: true, status: true },
  })

  if (existingOutgoing?.status === 'pending') {
    return NextResponse.json({ error: 'request_already_pending' }, { status: 409 })
  }

  if (existingOutgoing) {
    await prisma.friendRequest.update({
      where: { id: existingOutgoing.id },
      data: { status: 'pending' },
    })
  } else {
    await prisma.friendRequest.create({
      data: {
        fromUserId: userId,
        toUserId,
        status: 'pending',
      },
    })
  }

  return NextResponse.json({ success: true })
}
