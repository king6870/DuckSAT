import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTutorPolicySnapshot } from '@/lib/aiTutor'
import { getActiveTutorPolicyOverride } from '@/lib/aiTutorPolicy'
import { isAIAgentSchemaNotReady } from '@/lib/aiAgentStorage'

const createSessionSchema = z.object({
  source: z.string().trim().min(1).max(80).default('topic-drill'),
  moduleType: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(120).nullable().optional(),
  difficulty: z.string().trim().max(120).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

function toNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = createSessionSchema.safeParse(body)

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
    const activePolicyOverride = await getActiveTutorPolicyOverride()
    const policy = getTutorPolicySnapshot(activePolicyOverride || undefined)

    const createdSession = await prisma.$transaction(async (tx) => {
      const created = await tx.aIAgentSession.create({
        data: {
          userId: session.user.id,
          source: toNullableString(payload.source),
          moduleType: toNullableString(payload.moduleType),
          category: toNullableString(payload.category),
          difficulty: toNullableString(payload.difficulty),
          policyName: policy.policyName,
          policyVersion: policy.policyVersion,
          metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        },
      })

      await tx.aIAgentPolicySnapshot.create({
        data: {
          sessionId: created.id,
          userId: session.user.id,
          policyName: policy.policyName,
          policyVersion: policy.policyVersion,
          configJson: JSON.stringify(policy.config),
        },
      })

      return created
    })

    return NextResponse.json({
      success: true,
      session: {
        id: createdSession.id,
        status: createdSession.status,
        source: createdSession.source,
        moduleType: createdSession.moduleType,
        category: createdSession.category,
        difficulty: createdSession.difficulty,
        policyName: createdSession.policyName,
        policyVersion: createdSession.policyVersion,
        createdAt: createdSession.createdAt,
      },
    })
  } catch (error) {
    if (isAIAgentSchemaNotReady(error)) {
      return NextResponse.json(
        {
          success: true,
          error: 'ai_agent_schema_not_ready',
          message: 'AI agent tables are not available yet. Falling back to the legacy tutor path.',
          session: null,
        },
        { status: 200 }
      )
    }

    console.error('[POST /api/ai-agent/session] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
