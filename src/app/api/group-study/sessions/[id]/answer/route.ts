import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncGroupStudySession } from '@/lib/groupStudy'
import { isSchemaProvisioningError, schemaProvisioningResponse } from '@/lib/schemaProvisioning'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/group-study/sessions/[id]/answer body: { selectedAnswer: number }
export async function POST(request: NextRequest, context: RouteContext) {
  return (async () => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { id } = await context.params
  const userId = session.user.id
  const body = await request.json().catch(() => ({}))
  const selectedAnswer = Number(body.selectedAnswer)

  if (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer > 3) {
    return NextResponse.json({ error: 'invalid_selected_answer' }, { status: 400 })
  }

  await syncGroupStudySession(id)

  const studySession = await prisma.groupStudySession.findUnique({
    where: { id },
    include: {
      participants: {
        where: { userId },
      },
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          question: {
            select: {
              correctAnswer: true,
              options: true,
            },
          },
        },
      },
    },
  })

  if (!studySession) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  const membership = studySession.participants[0]
  if (!membership || membership.inviteStatus !== 'accepted') {
    return NextResponse.json({ error: 'not_in_session' }, { status: 403 })
  }

  if (studySession.status !== 'active') {
    return NextResponse.json({ error: 'session_not_active' }, { status: 409 })
  }

  if (studySession.revealEndsAt) {
    return NextResponse.json({ error: 'question_in_reveal_phase' }, { status: 409 })
  }

  const currentQuestion = studySession.questions[studySession.currentQuestionIndex]
  if (!currentQuestion) {
    return NextResponse.json({ error: 'current_question_missing' }, { status: 409 })
  }

  let optionCount = 4
  try {
    const parsed = JSON.parse(currentQuestion.question.options)
    if (Array.isArray(parsed)) {
      optionCount = parsed.length
    }
  } catch {
    optionCount = 4
  }

  if (selectedAnswer >= optionCount) {
    return NextResponse.json({ error: 'selected_answer_out_of_range' }, { status: 400 })
  }

  const existingAnswer = await prisma.groupStudyAnswer.findUnique({
    where: {
      groupStudyQuestionId_userId: {
        groupStudyQuestionId: currentQuestion.id,
        userId,
      },
    },
    select: { id: true },
  })

  if (existingAnswer) {
    return NextResponse.json({ error: 'already_answered' }, { status: 409 })
  }

  const now = new Date()
  const questionStart = studySession.currentQuestionStartedAt ?? now
  const responseTimeMs = Math.max(0, now.getTime() - questionStart.getTime())
  const isCorrect = selectedAnswer === currentQuestion.question.correctAnswer

  await prisma.$transaction([
    prisma.groupStudyAnswer.create({
      data: {
        sessionId: id,
        groupStudyQuestionId: currentQuestion.id,
        userId,
        selectedAnswer,
        isCorrect,
        responseTimeMs,
      },
    }),
    prisma.groupStudyParticipant.update({
      where: { id: membership.id },
      data: {
        progressStatus: 'answered',
        correctCount: isCorrect ? { increment: 1 } : undefined,
        totalResponseMs: { increment: responseTimeMs },
        lastSeenAt: now,
      },
    }),
  ])

  await syncGroupStudySession(id)

    return NextResponse.json({ success: true, isCorrect })
  })().catch((error) => {
    if (isSchemaProvisioningError(error)) {
      return NextResponse.json(schemaProvisioningResponse('group-study'), { status: 503 })
    }

    console.error('[POST /api/group-study/sessions/[id]/answer] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  })
}
