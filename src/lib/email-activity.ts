import 'server-only'

import { prisma } from '@/lib/prisma'

export interface EmailActivityDeliveryItem {
  id: string
  automationId: string
  automationName: string
  email: string
  triggerType: string
  triggerKey: string
  status: string
  resendId: string | null
  error: string | null
  sentAt: Date | null
  createdAt: Date
}

export interface EmailActivitySummary {
  total: number
  sent: number
  queued: number
  failed: number
}

export async function listRecentEmailActivity(limit = 20): Promise<{
  deliveries: EmailActivityDeliveryItem[]
  summary: EmailActivitySummary
}> {
  const deliveries = await prisma.emailAutomationDelivery.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: Math.max(1, Math.min(limit, 100)),
    select: {
      id: true,
      automationId: true,
      email: true,
      triggerType: true,
      triggerKey: true,
      status: true,
      resendId: true,
      error: true,
      sentAt: true,
      createdAt: true,
    },
  })

  const automationIds = Array.from(new Set(deliveries.map((delivery) => delivery.automationId)))
  const automationNames = automationIds.length
    ? await prisma.emailAutomation.findMany({
        where: {
          id: { in: automationIds },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : []

  const nameByAutomationId = new Map(automationNames.map((automation) => [automation.id, automation.name]))

  return {
    deliveries: deliveries.map((delivery) => ({
      ...delivery,
      automationName: nameByAutomationId.get(delivery.automationId) || 'Deleted automation',
    })),
    summary: deliveries.reduce<EmailActivitySummary>(
      (summary, delivery) => {
        summary.total += 1

        if (delivery.status === 'sent') {
          summary.sent += 1
        } else if (delivery.status === 'failed') {
          summary.failed += 1
        } else {
          summary.queued += 1
        }

        return summary
      },
      { total: 0, sent: 0, queued: 0, failed: 0 },
    ),
  }
}