import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTutorReply, type TutorMessage, type TutorQuestionContext } from '@/lib/aiTutor'
import { getActiveTutorPolicyOverride, parseTutorPolicyOverrideFromSnapshot } from '@/lib/aiTutorPolicy'
import { isAIAgentSchemaNotReady } from '@/lib/aiAgentStorage'

const contextSchema = z
  .object({
    moduleType: z.string().trim().max(120).nullable().optional(),
    category: z.string().trim().max(120).nullable().optional(),
    difficulty: z.string().trim().max(120).nullable().optional(),
    subtopic: z.string().trim().max(120).nullable().optional(),
    question: z.string().trim().max(8000).nullable().optional(),
    passage: z.string().trim().max(12000).nullable().optional(),
    options: z.array(z.string().trim().max(500)).max(8).optional(),
    selectedAnswer: z.number().int().nullable().optional(),
    correctAnswer: z.number().int().nullable().optional(),
    isRevealed: z.boolean().optional(),
    allowAnswerReveal: z.boolean().optional(),
  })
  .optional()

const messageSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(2000),
  context: contextSchema,
})

function toNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toTutorContext(value: z.infer<typeof contextSchema>): TutorQuestionContext {
  return {
    moduleType: toNullableString(value?.moduleType),
    category: toNullableString(value?.category),
    difficulty: toNullableString(value?.difficulty),
    subtopic: toNullableString(value?.subtopic),
    question: toNullableString(value?.question),
    passage: toNullableString(value?.passage),
    options: Array.isArray(value?.options) ? value.options.filter((option) => option.trim().length > 0) : [],
    selectedAnswer: typeof value?.selectedAnswer === 'number' ? value.selectedAnswer : null,
    correctAnswer: typeof value?.correctAnswer === 'number' ? value.correctAnswer : null,
    isRevealed: !!value?.isRevealed,
    allowAnswerReveal: !!value?.allowAnswerReveal,
  }
}

function toTutorMessages(
  messages: Array<{ role: string; content: string }>
): TutorMessage[] {
  return messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .map((message) => ({ role: message.role as TutorMessage['role'], content: message.content }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = messageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const tutorContext = toTutorContext(payload.context)

    const agentSession = await prisma.aIAgentSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        policyName: true,
        policyVersion: true,
        policySnapshots: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            configJson: true,
          },
        },
      },
    })

    if (!agentSession) {
      return NextResponse.json({ success: false, error: 'session_not_found' }, { status: 404 })
    }

    if (agentSession.status !== 'active') {
      return NextResponse.json({ success: false, error: 'session_not_active' }, { status: 409 })
    }

    const userMessage = await prisma.aIAgentMessage.create({
      data: {
        sessionId: payload.sessionId,
        userId: session.user.id,
        role: 'user',
        content: payload.content,
        questionContext: payload.context ? JSON.stringify(payload.context) : null,
      },
      select: {
        id: true,
      },
    })

    const history = await prisma.aIAgentMessage.findMany({
      where: {
        sessionId: payload.sessionId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      select: {
        role: true,
        content: true,
      },
    })

    const tutorMessages = toTutorMessages(history.reverse())
    const sessionPolicyOverride = parseTutorPolicyOverrideFromSnapshot(
      agentSession.policySnapshots[0]?.configJson ?? null,
      agentSession.policyName,
      agentSession.policyVersion
    )
    const activePolicyOverride = sessionPolicyOverride ? null : await getActiveTutorPolicyOverride()

    const tutorReply = await generateTutorReply(
      tutorContext,
      tutorMessages,
      { policy: sessionPolicyOverride || activePolicyOverride || undefined }
    )

    const assistantMessage = await prisma.aIAgentMessage.create({
      data: {
        sessionId: payload.sessionId,
        userId: session.user.id,
        role: 'assistant',
        content: tutorReply.reply,
        questionContext: payload.context ? JSON.stringify(payload.context) : null,
        modelTier: tutorReply.tier,
        modelUsed: tutorReply.modelUsed,
        latencyMs: tutorReply.latencyMs,
        promptTokens: tutorReply.promptTokens ?? null,
        completionTokens: tutorReply.completionTokens ?? null,
        totalTokens: tutorReply.totalTokens ?? null,
        estimatedCostUsd: tutorReply.estimatedCostUsd ?? null,
        refusalDetected: tutorReply.refusalDetected,
        answerBlocked: tutorReply.answerBlocked,
      },
      select: {
        id: true,
      },
    })

    await prisma.aIAgentUsageMetric.create({
      data: {
        sessionId: payload.sessionId,
        userId: session.user.id,
        modelTier: tutorReply.tier,
        modelUsed: tutorReply.modelUsed,
        latencyMs: tutorReply.latencyMs,
        promptTokens: tutorReply.promptTokens ?? null,
        completionTokens: tutorReply.completionTokens ?? null,
        totalTokens: tutorReply.totalTokens ?? null,
        estimatedCostUsd: tutorReply.estimatedCostUsd ?? null,
        requestSucceeded: true,
      },
    })

    if (tutorReply.tier === 'quality' && tutorReply.escalationReason) {
      await prisma.aIAgentEscalationEvent.create({
        data: {
          sessionId: payload.sessionId,
          userId: session.user.id,
          fromTier: 'budget',
          toTier: 'quality',
          reason: tutorReply.escalationReason,
          details: JSON.stringify({ userMessageId: userMessage.id, assistantMessageId: assistantMessage.id }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      reply: tutorReply.reply,
      tier: tutorReply.tier,
      modelUsed: tutorReply.modelUsed,
      latencyMs: tutorReply.latencyMs,
      promptTokens: tutorReply.promptTokens ?? null,
      completionTokens: tutorReply.completionTokens ?? null,
      totalTokens: tutorReply.totalTokens ?? null,
      estimatedCostUsd: tutorReply.estimatedCostUsd ?? null,
      refusalDetected: tutorReply.refusalDetected,
      answerBlocked: tutorReply.answerBlocked,
      escalationReason: tutorReply.escalationReason ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('ai_tutor_not_configured')) {
      return NextResponse.json(
        {
          success: false,
          error: 'ai_tutor_not_configured',
          message: 'AI tutor is not configured yet. Add tutor provider keys in environment variables.',
        },
        { status: 503 }
      )
    }

    if (isAIAgentSchemaNotReady(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ai_agent_schema_not_ready',
          message: 'AI agent tables are not available yet. Run the latest database migration.',
        },
        { status: 503 }
      )
    }

    console.error('[POST /api/ai-agent/message] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
