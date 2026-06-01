import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'
import { isAIAgentSchemaNotReady } from '@/lib/aiAgentStorage'

const upsertPolicySchema = z.object({
  policyName: z.string().trim().min(1).max(80),
  policyVersion: z.string().trim().min(1).max(40).default('1.0.0'),
  longMessageThreshold: z.number().int().min(80).max(1200).default(280),
  qualitySignals: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  notes: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().default(true),
})

function parseSignals(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index)
  } catch {
    return []
  }
}

function normalizeSignals(signals: string[]): string[] {
  return signals
    .map((signal) => signal.trim().toLowerCase())
    .filter((signal, index, arr) => signal.length > 0 && arr.indexOf(signal) === index)
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }

  return { ok: true as const, userId: session.user.id }
}

export async function GET() {
  try {
    const auth = await ensureAdmin()
    if (!auth.ok) return auth.response

    const policies = await prisma.aIAgentPolicy.findMany({
      select: {
        id: true,
        policyName: true,
        policyVersion: true,
        longMessageThreshold: true,
        qualitySignals: true,
        notes: true,
        isActive: true,
        updatedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    })

    const mapped = policies.map((policy) => ({
      id: policy.id,
      policyName: policy.policyName,
      policyVersion: policy.policyVersion,
      longMessageThreshold: policy.longMessageThreshold,
      qualitySignals: parseSignals(policy.qualitySignals),
      notes: policy.notes,
      isActive: policy.isActive,
      updatedByUserId: policy.updatedByUserId,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      activePolicy: mapped.find((policy) => policy.isActive) || null,
      policies: mapped,
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

    console.error('[GET /api/admin/ai-agent/policy] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => ({}))
    const parsed = upsertPolicySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'invalid_request',
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const normalizedSignals = normalizeSignals(payload.qualitySignals)

    if (normalizedSignals.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'invalid_quality_signals',
          message: 'At least one non-empty quality signal is required.',
        },
        { status: 400 }
      )
    }

    const savedPolicy = await prisma.$transaction(async (tx) => {
      if (payload.isActive) {
        await tx.aIAgentPolicy.updateMany({
          where: {
            isActive: true,
          },
          data: {
            isActive: false,
          },
        })
      }

      return tx.aIAgentPolicy.create({
        data: {
          policyName: payload.policyName,
          policyVersion: payload.policyVersion,
          longMessageThreshold: payload.longMessageThreshold,
          qualitySignals: JSON.stringify(normalizedSignals),
          notes: payload.notes || null,
          isActive: payload.isActive,
          updatedByUserId: auth.userId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      policy: {
        id: savedPolicy.id,
        policyName: savedPolicy.policyName,
        policyVersion: savedPolicy.policyVersion,
        longMessageThreshold: savedPolicy.longMessageThreshold,
        qualitySignals: normalizedSignals,
        notes: savedPolicy.notes,
        isActive: savedPolicy.isActive,
        updatedByUserId: savedPolicy.updatedByUserId,
        createdAt: savedPolicy.createdAt,
        updatedAt: savedPolicy.updatedAt,
      },
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

    console.error('[POST /api/admin/ai-agent/policy] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
