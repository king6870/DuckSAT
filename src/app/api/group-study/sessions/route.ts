import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { areAllFriends } from '@/lib/groupStudy'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

const ALLOWED_MODULE_TYPES = new Set(['math', 'reading-writing'])
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])
const ALLOWED_COUNTS = new Set([5, 10, 15, 20])
const ALLOWED_TIME_LIMITS = new Set([30, 60, 90, 120])

// GET /api/group-study/sessions - sessions the current user is participating in
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const memberships = await prisma.groupStudyParticipant.findMany({
      where: {
        userId,
        inviteStatus: { in: ['invited', 'accepted'] },
        session: {
          status: { in: ['lobby', 'active', 'completed'] },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        session: {
          select: {
            id: true,
            hostId: true,
            status: true,
            questionCount: true,
            currentQuestionIndex: true,
            createdAt: true,
            startedAt: true,
            endedAt: true,
            category: true,
            moduleType: true,
            difficulty: true,
            timeLimitSec: true,
            host: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      sessions: memberships.map((membership) => ({
        id: membership.session.id,
        status: membership.session.status,
        inviteStatus: membership.inviteStatus,
        questionCount: membership.session.questionCount,
        currentQuestionIndex: membership.session.currentQuestionIndex,
        category: membership.session.category,
        moduleType: membership.session.moduleType,
        difficulty: membership.session.difficulty,
        timeLimitSec: membership.session.timeLimitSec,
        createdAt: membership.session.createdAt,
        startedAt: membership.session.startedAt,
        endedAt: membership.session.endedAt,
        hostId: membership.session.hostId,
        isHost: membership.session.hostId === userId,
        host: membership.session.host,
      })),
    })
  } catch (error) {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json({ sessions: [], ...schemaProvisioningResponse('group-study') })
    }

    console.error('[GET /api/group-study/sessions] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// POST /api/group-study/sessions - create a new session and invite friends
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json().catch(() => ({}))

    const invitedUserIds = Array.isArray(body.invitedUserIds)
      ? body.invitedUserIds.filter((id: unknown): id is string => typeof id === 'string')
      : []

    const uniqueInvitedUserIds = Array.from(new Set(invitedUserIds.filter((id) => id !== userId)))

    const questionCount = Number(body.questionCount)
    const timeLimitSec = body.timeLimitSec == null ? null : Number(body.timeLimitSec)
    const moduleType = typeof body.moduleType === 'string' ? body.moduleType : null
    const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : null
    const difficulty = typeof body.difficulty === 'string' ? body.difficulty : null

    if (uniqueInvitedUserIds.length === 0) {
      return NextResponse.json({ error: 'invite_at_least_one_friend' }, { status: 400 })
    }
    if (!ALLOWED_COUNTS.has(questionCount)) {
      return NextResponse.json({ error: 'invalid_question_count' }, { status: 400 })
    }
    if (timeLimitSec !== null && !ALLOWED_TIME_LIMITS.has(timeLimitSec)) {
      return NextResponse.json({ error: 'invalid_time_limit' }, { status: 400 })
    }
    if (moduleType && !ALLOWED_MODULE_TYPES.has(moduleType)) {
      return NextResponse.json({ error: 'invalid_module_type' }, { status: 400 })
    }
    if (difficulty && !ALLOWED_DIFFICULTIES.has(difficulty)) {
      return NextResponse.json({ error: 'invalid_difficulty' }, { status: 400 })
    }

    const areFriends = await areAllFriends(userId, uniqueInvitedUserIds)
    if (!areFriends) {
      return NextResponse.json({ error: 'can_only_invite_friends' }, { status: 403 })
    }

    const where: {
      isActive: true
      isReserved: false
      moduleType?: string
      category?: string
      difficulty?: string
    } = {
      isActive: true,
      isReserved: false,
    }

    if (moduleType) where.moduleType = moduleType
    if (category) where.category = category
    if (difficulty) where.difficulty = difficulty

    const candidateQuestions = await prisma.question.findMany({
      where,
      select: { id: true },
      take: 400,
      orderBy: { createdAt: 'desc' },
    })

    const shuffled = [...candidateQuestions].sort(() => Math.random() - 0.5)
    const selectedQuestions = shuffled.slice(0, questionCount)

    if (selectedQuestions.length < questionCount) {
      return NextResponse.json({ error: 'not_enough_questions_for_filters' }, { status: 400 })
    }

    const now = new Date()

    const created = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.groupStudySession.create({
        data: {
          hostId: userId,
          status: 'lobby',
          questionCount,
          timeLimitSec,
          moduleType,
          category,
          difficulty,
        },
        select: { id: true },
      })

      await tx.groupStudyParticipant.createMany({
        data: [
          {
            sessionId: createdSession.id,
            userId,
            inviteStatus: 'accepted',
            isReady: true,
            progressStatus: 'waiting',
            joinedAt: now,
            lastSeenAt: now,
          },
          ...uniqueInvitedUserIds.map((invitedUserId) => ({
            sessionId: createdSession.id,
            userId: invitedUserId,
            inviteStatus: 'invited' as const,
            isReady: false,
            progressStatus: 'waiting' as const,
          })),
        ],
      })

      await tx.groupStudyQuestion.createMany({
        data: selectedQuestions.map((question, index) => ({
          sessionId: createdSession.id,
          questionId: question.id,
          orderIndex: index,
        })),
      })

      return createdSession
    })

    return NextResponse.json({ success: true, sessionId: created.id })
  } catch (error) {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('group-study'), { status: 503 })
    }

    console.error('[POST /api/group-study/sessions] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
