import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'
import { isAIAgentSchemaNotReady } from '@/lib/aiAgentStorage'

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

async function ensureAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await ensureAdmin()
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const daysParam = Number(searchParams.get('days') || 30)
    const days = Number.isFinite(daysParam) ? Math.min(365, Math.max(1, Math.round(daysParam))) : 30

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      totalRequests,
      successfulRequests,
      usageAggregate,
      answerBlockedCount,
      refusalCount,
      activePolicy,
      byTierRows,
      topModelRows,
      escalationRows,
    ] = await Promise.all([
      prisma.aIAgentUsageMetric.count({
        where: {
          createdAt: { gte: since },
        },
      }),
      prisma.aIAgentUsageMetric.count({
        where: {
          createdAt: { gte: since },
          requestSucceeded: true,
        },
      }),
      prisma.aIAgentUsageMetric.aggregate({
        where: {
          createdAt: { gte: since },
        },
        _avg: {
          latencyMs: true,
        },
        _sum: {
          estimatedCostUsd: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
      }),
      prisma.aIAgentMessage.count({
        where: {
          createdAt: { gte: since },
          answerBlocked: true,
        },
      }),
      prisma.aIAgentMessage.count({
        where: {
          createdAt: { gte: since },
          refusalDetected: true,
        },
      }),
      prisma.aIAgentPolicy.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.$queryRaw<
        Array<{ modelTier: string; requestCount: number; avgLatencyMs: number | null; totalCostUsd: number | null; totalTokens: number | null }>
      >`
        SELECT
          modelTier,
          COUNT(*) AS requestCount,
          AVG(CAST(latencyMs AS FLOAT)) AS avgLatencyMs,
          SUM(ISNULL(estimatedCostUsd, 0)) AS totalCostUsd,
          SUM(ISNULL(totalTokens, 0)) AS totalTokens
        FROM ai_agent_usage_metrics
        WHERE createdAt >= ${since}
        GROUP BY modelTier
        ORDER BY modelTier ASC
      `,
      prisma.$queryRaw<Array<{ modelUsed: string; requestCount: number; avgLatencyMs: number | null; totalCostUsd: number | null }>>`
        SELECT TOP 10
          modelUsed,
          COUNT(*) AS requestCount,
          AVG(CAST(latencyMs AS FLOAT)) AS avgLatencyMs,
          SUM(ISNULL(estimatedCostUsd, 0)) AS totalCostUsd
        FROM ai_agent_usage_metrics
        WHERE createdAt >= ${since}
        GROUP BY modelUsed
        ORDER BY requestCount DESC
      `,
      prisma.$queryRaw<Array<{ reason: string; count: number }>>`
        SELECT TOP 12
          reason,
          COUNT(*) AS count
        FROM ai_agent_escalation_events
        WHERE createdAt >= ${since}
        GROUP BY reason
        ORDER BY count DESC
      `,
    ])

    const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 1000) / 10 : 0

    return NextResponse.json({
      success: true,
      windowDays: days,
      since: since.toISOString(),
      summary: {
        totalRequests,
        successfulRequests,
        successRatePct: successRate,
        avgLatencyMs: usageAggregate._avg.latencyMs ? Math.round(usageAggregate._avg.latencyMs) : 0,
        totalEstimatedCostUsd: Number(usageAggregate._sum.estimatedCostUsd || 0),
        totalTokens: Number(usageAggregate._sum.totalTokens || 0),
        promptTokens: Number(usageAggregate._sum.promptTokens || 0),
        completionTokens: Number(usageAggregate._sum.completionTokens || 0),
        answerBlockedCount,
        refusalCount,
      },
      activePolicy: activePolicy
        ? {
            id: activePolicy.id,
            policyName: activePolicy.policyName,
            policyVersion: activePolicy.policyVersion,
            longMessageThreshold: activePolicy.longMessageThreshold,
            qualitySignals: parseSignals(activePolicy.qualitySignals),
            notes: activePolicy.notes,
            updatedAt: activePolicy.updatedAt,
            updatedByUserId: activePolicy.updatedByUserId,
          }
        : null,
      byTier: byTierRows.map((row) => ({
        modelTier: row.modelTier,
        requestCount: Number(row.requestCount),
        avgLatencyMs: row.avgLatencyMs ? Math.round(row.avgLatencyMs) : 0,
        totalCostUsd: Number(row.totalCostUsd || 0),
        totalTokens: Number(row.totalTokens || 0),
      })),
      topModels: topModelRows.map((row) => ({
        modelUsed: row.modelUsed,
        requestCount: Number(row.requestCount),
        avgLatencyMs: row.avgLatencyMs ? Math.round(row.avgLatencyMs) : 0,
        totalCostUsd: Number(row.totalCostUsd || 0),
      })),
      escalationReasons: escalationRows.map((row) => ({
        reason: row.reason,
        count: Number(row.count),
      })),
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

    console.error('[GET /api/admin/ai-agent/metrics] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
