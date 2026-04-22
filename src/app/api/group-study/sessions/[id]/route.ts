import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeJsonArrayParse, syncGroupStudySession } from '@/lib/groupStudy'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

interface RouteContext {
  params: Promise<{ id: string }>
}

function safeJsonParseObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function toBase64(value: unknown): string | null {
  if (!value) return null
  try {
    return Buffer.from(value as Buffer).toString('base64')
  } catch {
    return null
  }
}

// GET /api/group-study/sessions/[id] - session state snapshot for polling UI
export async function GET(_request: NextRequest, context: RouteContext) {
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
    select: { id: true },
  })

  if (!membership) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  await syncGroupStudySession(id)

  const studySession = await prisma.groupStudySession.findUnique({
    where: { id },
    include: {
      host: {
        select: { id: true, username: true, name: true, image: true },
      },
      participants: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, username: true, name: true, image: true },
          },
        },
      },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          question: {
            select: {
              id: true,
              question: true,
              passage: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              wrongAnswerExplanations: true,
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
            },
          },
        },
      },
      answers: {
        select: {
          userId: true,
          groupStudyQuestionId: true,
          selectedAnswer: true,
          isCorrect: true,
          responseTimeMs: true,
        },
      },
    },
  })

  if (!studySession) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  const me = studySession.participants.find((participant) => participant.userId === userId)
  if (!me) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  const now = new Date()
  const isRevealPhase = !!studySession.revealEndsAt
  const isCompleted = studySession.status === 'completed'
  const canRevealAnswers = isRevealPhase || isCompleted
  const currentQuestionRef = studySession.questions[studySession.currentQuestionIndex] ?? null

  const currentAnswers = currentQuestionRef
    ? studySession.answers.filter((answer) => answer.groupStudyQuestionId === currentQuestionRef.id)
    : []

  const answeredCurrentUserIds = new Set(currentAnswers.map((answer) => answer.userId))
  const answerCountByUser = new Map<string, number>()

  for (const answer of studySession.answers) {
    answerCountByUser.set(answer.userId, (answerCountByUser.get(answer.userId) ?? 0) + 1)
  }

  const participants = studySession.participants.map((participant) => {
    const answeredCount = answerCountByUser.get(participant.userId) ?? 0
    return {
      id: participant.user.id,
      username: participant.user.username,
      name: participant.user.name,
      image: participant.user.image,
      inviteStatus: participant.inviteStatus,
      isReady: participant.isReady,
      progressStatus: participant.progressStatus,
      hasAnsweredCurrent: answeredCurrentUserIds.has(participant.userId),
      answeredCount,
      questionCount: studySession.questionCount,
      correctCount: participant.correctCount,
      totalResponseMs: participant.totalResponseMs,
      avgResponseMs:
        answeredCount > 0 ? Math.round(participant.totalResponseMs / answeredCount) : null,
      isHost: participant.userId === studySession.hostId,
    }
  })

  let currentQuestion: {
    id: string
    orderIndex: number
    question: string
    passage: string | null
    options: string[]
    correctAnswer: number | null
    explanation: string | null
    wrongAnswerExplanations: string[]
    moduleType: string
    difficulty: string
    category: string
    subtopic: string | null
    chartData: Record<string, unknown> | null
    imageUrl: string | null
    imageData: string | null
    imageMimeType: string | null
    imageAlt: string | null
    timeEstimate: number
  } | null = null

  if (currentQuestionRef) {
    currentQuestion = {
      id: currentQuestionRef.question.id,
      orderIndex: currentQuestionRef.orderIndex,
      question: currentQuestionRef.question.question,
      passage: currentQuestionRef.question.passage,
      options: safeJsonArrayParse(currentQuestionRef.question.options),
      correctAnswer: canRevealAnswers ? currentQuestionRef.question.correctAnswer : null,
      explanation: canRevealAnswers ? currentQuestionRef.question.explanation : null,
      wrongAnswerExplanations: canRevealAnswers
        ? safeJsonArrayParse(currentQuestionRef.question.wrongAnswerExplanations)
        : [],
      moduleType: currentQuestionRef.question.moduleType,
      difficulty: currentQuestionRef.question.difficulty,
      category: currentQuestionRef.question.category,
      subtopic: currentQuestionRef.question.subtopic,
      chartData: safeJsonParseObject(currentQuestionRef.question.chartData),
      imageUrl: currentQuestionRef.question.imageUrl,
      imageData: toBase64(currentQuestionRef.question.imageData),
      imageMimeType: currentQuestionRef.question.imageMimeType,
      imageAlt: currentQuestionRef.question.imageAlt,
      timeEstimate: currentQuestionRef.question.timeEstimate,
    }
  }

  let timeRemainingSec: number | null = null
  if (
    studySession.status === 'active' &&
    !isRevealPhase &&
    typeof studySession.timeLimitSec === 'number' &&
    studySession.currentQuestionStartedAt
  ) {
    const elapsedMs = now.getTime() - studySession.currentQuestionStartedAt.getTime()
    timeRemainingSec = Math.max(0, Math.ceil((studySession.timeLimitSec * 1000 - elapsedMs) / 1000))
  }

  let revealRemainingSec: number | null = null
  if (studySession.revealEndsAt) {
    revealRemainingSec = Math.max(
      0,
      Math.ceil((studySession.revealEndsAt.getTime() - now.getTime()) / 1000)
    )
  }

  const answersByUser = currentAnswers.map((answer) => ({
    userId: answer.userId,
    selectedAnswer: canRevealAnswers ? answer.selectedAnswer : null,
    isCorrect: canRevealAnswers ? answer.isCorrect : null,
    responseTimeMs: answer.responseTimeMs,
  }))

  const leaderboard = participants
    .filter((participant) => participant.inviteStatus === 'accepted')
    .sort((a, b) => {
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount
      const avgA = a.avgResponseMs ?? Number.MAX_SAFE_INTEGER
      const avgB = b.avgResponseMs ?? Number.MAX_SAFE_INTEGER
      return avgA - avgB
    })

    return NextResponse.json({
      session: {
        id: studySession.id,
        hostId: studySession.hostId,
        status: studySession.status,
        questionCount: studySession.questionCount,
        currentQuestionIndex: studySession.currentQuestionIndex,
        timeLimitSec: studySession.timeLimitSec,
        moduleType: studySession.moduleType,
        category: studySession.category,
        difficulty: studySession.difficulty,
        createdAt: studySession.createdAt,
        startedAt: studySession.startedAt,
        endedAt: studySession.endedAt,
        revealStartedAt: studySession.revealStartedAt,
        revealEndsAt: studySession.revealEndsAt,
        isRevealPhase,
        timeRemainingSec,
        revealRemainingSec,
        canRevealAnswers,
        host: studySession.host,
      },
      me: {
        inviteStatus: me.inviteStatus,
        isReady: me.isReady,
        progressStatus: me.progressStatus,
        isHost: me.userId === studySession.hostId,
        correctCount: me.correctCount,
        totalResponseMs: me.totalResponseMs,
      },
      participants,
      currentQuestion,
      answersByUser,
      leaderboard,
    })
  })().catch((error) => {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('group-study'), { status: 503 })
    }

    console.error('[GET /api/group-study/sessions/[id]] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  })
}
