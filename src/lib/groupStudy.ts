import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const GROUP_STUDY_REVEAL_MS = 8000

export type GroupStudyInviteStatus = 'invited' | 'accepted' | 'declined' | 'left'
export type GroupStudyProgressStatus = 'waiting' | 'thinking' | 'answered' | 'done'

export function canonicalFriendPair(userIdA: string, userIdB: string): { userAId: string; userBId: string } {
  return userIdA < userIdB
    ? { userAId: userIdA, userBId: userIdB }
    : { userAId: userIdB, userBId: userIdA }
}

export function safeJsonArrayParse(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export async function areAllFriends(userId: string, otherUserIds: string[]): Promise<boolean> {
  if (otherUserIds.length === 0) return true

  const pairs = otherUserIds.map((otherUserId) => canonicalFriendPair(userId, otherUserId))
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: pairs,
    },
    select: { userAId: true, userBId: true },
  })

  return friendships.length === otherUserIds.length
}

export async function syncGroupStudySession(sessionId: string) {
  const now = new Date()

  const session = await prisma.groupStudySession.findUnique({
    where: { id: sessionId },
    include: {
      participants: true,
      questions: {
        orderBy: { orderIndex: 'asc' },
        select: { id: true, orderIndex: true },
      },
    },
  })

  if (!session) return null
  if (session.status !== 'active') return session

  const acceptedParticipants = session.participants.filter((p) => p.inviteStatus === 'accepted')
  const currentQuestion = session.questions[session.currentQuestionIndex] ?? null

  // No valid question remaining: end the session defensively.
  if (!currentQuestion) {
    await prisma.$transaction([
      prisma.groupStudySession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          endedAt: now,
        },
      }),
      prisma.groupStudyParticipant.updateMany({
        where: { sessionId: session.id, inviteStatus: 'accepted' },
        data: { progressStatus: 'done' },
      }),
    ])
    return prisma.groupStudySession.findUnique({ where: { id: sessionId } })
  }

  if (!session.currentQuestionStartedAt) {
    await prisma.$transaction([
      prisma.groupStudySession.update({
        where: { id: session.id },
        data: { currentQuestionStartedAt: now },
      }),
      prisma.groupStudyParticipant.updateMany({
        where: { sessionId: session.id, inviteStatus: 'accepted' },
        data: { progressStatus: 'thinking' },
      }),
    ])

    return prisma.groupStudySession.findUnique({ where: { id: sessionId } })
  }

  // Reveal phase is active; advance when reveal timer ends.
  if (session.revealEndsAt) {
    if (now.getTime() >= session.revealEndsAt.getTime()) {
      const isLastQuestion = session.currentQuestionIndex + 1 >= session.questions.length

      if (isLastQuestion) {
        await prisma.$transaction([
          prisma.groupStudySession.update({
            where: { id: session.id },
            data: {
              status: 'completed',
              endedAt: now,
              revealStartedAt: null,
              revealEndsAt: null,
            },
          }),
          prisma.groupStudyParticipant.updateMany({
            where: { sessionId: session.id, inviteStatus: 'accepted' },
            data: { progressStatus: 'done' },
          }),
        ])
      } else {
        await prisma.$transaction([
          prisma.groupStudySession.update({
            where: { id: session.id },
            data: {
              currentQuestionIndex: { increment: 1 },
              currentQuestionStartedAt: now,
              revealStartedAt: null,
              revealEndsAt: null,
            },
          }),
          prisma.groupStudyParticipant.updateMany({
            where: { sessionId: session.id, inviteStatus: 'accepted' },
            data: { progressStatus: 'thinking' },
          }),
        ])
      }
    }

    return prisma.groupStudySession.findUnique({ where: { id: sessionId } })
  }

  const answeredCount = await prisma.groupStudyAnswer.count({
    where: { groupStudyQuestionId: currentQuestion.id },
  })

  const everyoneAnswered = acceptedParticipants.length > 0 && answeredCount >= acceptedParticipants.length
  const timerExpired =
    typeof session.timeLimitSec === 'number' &&
    now.getTime() - session.currentQuestionStartedAt.getTime() >= session.timeLimitSec * 1000

  if (everyoneAnswered || timerExpired) {
    const revealEndsAt = new Date(now.getTime() + GROUP_STUDY_REVEAL_MS)
    await prisma.groupStudySession.update({
      where: { id: session.id },
      data: {
        revealStartedAt: now,
        revealEndsAt,
      },
    })
  }

  return prisma.groupStudySession.findUnique({ where: { id: sessionId } })
}

export function groupStudyQuestionSelect(includeAnswerFields: boolean): Prisma.QuestionSelect {
  return {
    id: true,
    question: true,
    passage: true,
    options: true,
    correctAnswer: includeAnswerFields,
    explanation: includeAnswerFields,
    wrongAnswerExplanations: includeAnswerFields,
    moduleType: true,
    difficulty: true,
    category: true,
    subtopic: true,
    chartData: true,
    imageUrl: true,
    imageData: true,
    imageMimeType: true,
    imageAlt: true,
    timeEstimate: true,
  }
}
