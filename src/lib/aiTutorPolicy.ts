import type { TutorRoutingPolicyConfig } from '@/lib/aiTutor'
import { prisma } from '@/lib/prisma'

function parseSignals(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parseSignals(parsed)
      }
    } catch {
      // ignore JSON parsing errors and fallback to comma split
    }

    return trimmed
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index)
  }

  return []
}

function parseThreshold(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(numberValue)) return undefined
  if (numberValue < 80 || numberValue > 1200) return undefined
  return Math.round(numberValue)
}

export async function getActiveTutorPolicyOverride(): Promise<Partial<TutorRoutingPolicyConfig> | null> {
  const activePolicy = await prisma.aIAgentPolicy.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      policyName: true,
      policyVersion: true,
      longMessageThreshold: true,
      qualitySignals: true,
    },
  })

  if (!activePolicy) return null

  const qualitySignals = parseSignals(activePolicy.qualitySignals)

  return {
    policyName: activePolicy.policyName,
    policyVersion: activePolicy.policyVersion,
    longMessageThreshold: activePolicy.longMessageThreshold,
    qualitySignals: qualitySignals.length > 0 ? qualitySignals : undefined,
  }
}

export function parseTutorPolicyOverrideFromSnapshot(
  configJson: string | null,
  policyName?: string | null,
  policyVersion?: string | null
): Partial<TutorRoutingPolicyConfig> | null {
  if (!configJson) {
    if (policyName || policyVersion) {
      return {
        policyName: policyName || undefined,
        policyVersion: policyVersion || undefined,
      }
    }
    return null
  }

  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>
    const longMessageThreshold = parseThreshold(parsed.longMessageThreshold)
    const qualitySignals = parseSignals(parsed.escalationSignals)

    return {
      policyName: policyName || undefined,
      policyVersion: policyVersion || undefined,
      longMessageThreshold,
      qualitySignals: qualitySignals.length > 0 ? qualitySignals : undefined,
    }
  } catch {
    return {
      policyName: policyName || undefined,
      policyVersion: policyVersion || undefined,
    }
  }
}
