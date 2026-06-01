import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAIAgentSchemaNotReady } from '@/lib/aiAgentStorage'

interface RouteParams {
  params: Promise<{ id: string }>
}

function parseJsonField(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'session_id_required' }, { status: 400 })
    }

    const agentSession = await prisma.aIAgentSession.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        policySnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!agentSession) {
      return NextResponse.json({ success: false, error: 'session_not_found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: agentSession.id,
        status: agentSession.status,
        source: agentSession.source,
        moduleType: agentSession.moduleType,
        category: agentSession.category,
        difficulty: agentSession.difficulty,
        policyName: agentSession.policyName,
        policyVersion: agentSession.policyVersion,
        metadata: parseJsonField(agentSession.metadata),
        createdAt: agentSession.createdAt,
        updatedAt: agentSession.updatedAt,
        endedAt: agentSession.endedAt,
      },
      messages: agentSession.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        modelTier: message.modelTier,
        modelUsed: message.modelUsed,
        latencyMs: message.latencyMs,
        totalTokens: message.totalTokens,
        estimatedCostUsd: message.estimatedCostUsd,
        refusalDetected: message.refusalDetected,
        answerBlocked: message.answerBlocked,
        questionContext: parseJsonField(message.questionContext),
        createdAt: message.createdAt,
      })),
      policySnapshot: agentSession.policySnapshots[0]
        ? {
            policyName: agentSession.policySnapshots[0].policyName,
            policyVersion: agentSession.policySnapshots[0].policyVersion,
            config: parseJsonField(agentSession.policySnapshots[0].configJson),
            createdAt: agentSession.policySnapshots[0].createdAt,
          }
        : null,
    })
  } catch (error) {
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

    console.error('[GET /api/ai-agent/session/[id]] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
