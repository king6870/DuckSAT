import 'server-only'

import { prisma } from '@/lib/prisma'

interface EmailOverviewTriggerFilters {
  userId?: string
  userEmail?: string
  eventType?: string
  eventName?: string
  pagePath?: string
  minDwellTimeMs?: number
  maxDwellTimeMs?: number
  category?: string
  moduleType?: string
  difficulty?: string
  minScore?: number
  practiceTestId?: string
  metadataKey?: string
  metadataValue?: string
}

export interface EmailOverviewDeliveryItem {
  id: string
  email: string
  status: string
  resendId: string | null
  error: string | null
  sentAt: Date | null
  createdAt: Date
}

export interface EmailOverviewDeliverySummary {
  total: number
  sent: number
  queued: number
  failed: number
}

export interface EmailOverviewAutomationItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: string
  triggerLabel: string
  triggerSummary: string
  templateId: string | null
  promoCode: string | null
  subject: string
  updatedAt: Date
  deliverySummary: EmailOverviewDeliverySummary
  recentDeliveries: EmailOverviewDeliveryItem[]
}

export interface EmailOverviewTemplateItem {
  id: string
  name: string
  description: string | null
  promoCode: string | null
  updatedAt: Date
  automationCount: number
  deliverySummary: EmailOverviewDeliverySummary
  automations: EmailOverviewAutomationItem[]
}

export interface EmailOverviewErrorItem {
  id: string
  automationId: string
  automationName: string
  templateName: string | null
  email: string
  error: string
  createdAt: Date
}

export interface EmailOverviewData {
  summary: {
    templates: number
    automations: number
    activeAutomations: number
    totalDeliveries: number
    sent: number
    queued: number
    failed: number
  }
  templates: EmailOverviewTemplateItem[]
  unlinkedAutomations: EmailOverviewAutomationItem[]
  recentErrors: EmailOverviewErrorItem[]
}

const TRIGGER_LABELS: Record<string, string> = {
  user_event: 'User event',
  page_dwell: 'Page dwell',
  drill_completed: 'Drill completed',
  practice_test_completed: 'Practice test completed',
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function parseTriggerFilters(raw: string | null): EmailOverviewTriggerFilters {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>

    return {
      userId: normalizeString(parsed.userId),
      userEmail: normalizeString(parsed.userEmail),
      eventType: normalizeString(parsed.eventType),
      eventName: normalizeString(parsed.eventName),
      pagePath: normalizeString(parsed.pagePath),
      minDwellTimeMs: normalizeNumber(parsed.minDwellTimeMs),
      maxDwellTimeMs: normalizeNumber(parsed.maxDwellTimeMs),
      category: normalizeString(parsed.category),
      moduleType: normalizeString(parsed.moduleType),
      difficulty: normalizeString(parsed.difficulty),
      minScore: normalizeNumber(parsed.minScore),
      practiceTestId: normalizeString(parsed.practiceTestId),
      metadataKey: normalizeString(parsed.metadataKey),
      metadataValue: normalizeString(parsed.metadataValue),
    }
  } catch {
    return {}
  }
}

function formatDuration(value: number): string {
  if (value >= 60_000) {
    return `${Math.round((value / 60_000) * 10) / 10} min`
  }

  return `${Math.round((value / 1_000) * 10) / 10} sec`
}

function formatTriggerSummary(triggerType: string, rawFilters: string | null): string {
  const filters = parseTriggerFilters(rawFilters)
  const summary: string[] = []

  if (filters.userEmail) summary.push(`User email: ${filters.userEmail}`)
  if (filters.userId) summary.push(`User ID: ${filters.userId}`)
  if (filters.eventType) summary.push(`Event type: ${filters.eventType}`)
  if (filters.eventName) summary.push(`Event name: ${filters.eventName}`)
  if (filters.pagePath) summary.push(`Page: ${filters.pagePath}`)
  if (filters.minDwellTimeMs != null) summary.push(`Min dwell: ${formatDuration(filters.minDwellTimeMs)}`)
  if (filters.maxDwellTimeMs != null) summary.push(`Max dwell: ${formatDuration(filters.maxDwellTimeMs)}`)
  if (filters.category) summary.push(`Category: ${filters.category}`)
  if (filters.moduleType) summary.push(`Module: ${filters.moduleType}`)
  if (filters.difficulty) summary.push(`Difficulty: ${filters.difficulty}`)
  if (filters.minScore != null) summary.push(`Min score: ${filters.minScore}`)
  if (filters.practiceTestId) summary.push(`Practice test: ${filters.practiceTestId}`)

  if (filters.metadataKey && filters.metadataValue) {
    summary.push(`Metadata: ${filters.metadataKey} = ${filters.metadataValue}`)
  } else if (filters.metadataKey) {
    summary.push(`Metadata key: ${filters.metadataKey}`)
  }

  if (summary.length === 0) {
    return `Runs whenever the ${TRIGGER_LABELS[triggerType] || triggerType} trigger fires.`
  }

  return summary.join(' • ')
}

function emptyDeliverySummary(): EmailOverviewDeliverySummary {
  return { total: 0, sent: 0, queued: 0, failed: 0 }
}

function accumulateDeliveryStatus(summary: EmailOverviewDeliverySummary, status: string) {
  summary.total += 1

  if (status === 'sent') {
    summary.sent += 1
    return
  }

  if (status === 'failed') {
    summary.failed += 1
    return
  }

  summary.queued += 1
}

export async function getEmailOverview(): Promise<EmailOverviewData> {
  const [templates, automations, deliveries] = await Promise.all([
    prisma.emailTemplate.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        promoCode: true,
        updatedAt: true,
      },
    }),
    prisma.emailAutomation.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        triggerType: true,
        triggerFilters: true,
        templateId: true,
        promoCode: true,
        subjectTemplate: true,
        updatedAt: true,
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.emailAutomationDelivery.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        automationId: true,
        email: true,
        status: true,
        resendId: true,
        error: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  ])

  const deliverySummaryByAutomationId = new Map<string, EmailOverviewDeliverySummary>()
  const recentDeliveriesByAutomationId = new Map<string, EmailOverviewDeliveryItem[]>()

  for (const delivery of deliveries) {
    const summary = deliverySummaryByAutomationId.get(delivery.automationId) || emptyDeliverySummary()
    accumulateDeliveryStatus(summary, delivery.status)
    deliverySummaryByAutomationId.set(delivery.automationId, summary)

    const recentDeliveries = recentDeliveriesByAutomationId.get(delivery.automationId) || []
    if (recentDeliveries.length < 5) {
      recentDeliveries.push({
        id: delivery.id,
        email: delivery.email,
        status: delivery.status,
        resendId: delivery.resendId,
        error: delivery.error,
        sentAt: delivery.sentAt,
        createdAt: delivery.createdAt,
      })
      recentDeliveriesByAutomationId.set(delivery.automationId, recentDeliveries)
    }
  }

  const automationById = new Map(automations.map((automation) => [automation.id, automation]))

  const automationItems: EmailOverviewAutomationItem[] = automations.map((automation) => ({
    id: automation.id,
    name: automation.name,
    description: automation.description,
    isActive: automation.isActive,
    triggerType: automation.triggerType,
    triggerLabel: TRIGGER_LABELS[automation.triggerType] || automation.triggerType,
    triggerSummary: formatTriggerSummary(automation.triggerType, automation.triggerFilters),
    templateId: automation.templateId,
    promoCode: automation.promoCode,
    subject: automation.subjectTemplate,
    updatedAt: automation.updatedAt,
    deliverySummary: deliverySummaryByAutomationId.get(automation.id) || emptyDeliverySummary(),
    recentDeliveries: recentDeliveriesByAutomationId.get(automation.id) || [],
  }))

  const automationsByTemplateId = new Map<string, EmailOverviewAutomationItem[]>()
  const unlinkedAutomations: EmailOverviewAutomationItem[] = []

  for (const automation of automationItems) {
    if (!automation.templateId) {
      unlinkedAutomations.push(automation)
      continue
    }

    const existing = automationsByTemplateId.get(automation.templateId) || []
    existing.push(automation)
    automationsByTemplateId.set(automation.templateId, existing)
  }

  const templateItems: EmailOverviewTemplateItem[] = templates.map((template) => {
    const relatedAutomations = automationsByTemplateId.get(template.id) || []
    const deliverySummary = relatedAutomations.reduce<EmailOverviewDeliverySummary>((summary, automation) => {
      summary.total += automation.deliverySummary.total
      summary.sent += automation.deliverySummary.sent
      summary.queued += automation.deliverySummary.queued
      summary.failed += automation.deliverySummary.failed
      return summary
    }, emptyDeliverySummary())

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      promoCode: template.promoCode,
      updatedAt: template.updatedAt,
      automationCount: relatedAutomations.length,
      deliverySummary,
      automations: relatedAutomations,
    }
  })

  const summary = deliveries.reduce<EmailOverviewData['summary']>(
    (currentSummary, delivery) => {
      currentSummary.totalDeliveries += 1

      if (delivery.status === 'sent') {
        currentSummary.sent += 1
      } else if (delivery.status === 'failed') {
        currentSummary.failed += 1
      } else {
        currentSummary.queued += 1
      }

      return currentSummary
    },
    {
      templates: templates.length,
      automations: automations.length,
      activeAutomations: automations.filter((automation) => automation.isActive).length,
      totalDeliveries: 0,
      sent: 0,
      queued: 0,
      failed: 0,
    },
  )

  const recentErrors: EmailOverviewErrorItem[] = deliveries
    .filter((delivery) => delivery.status === 'failed' || delivery.error)
    .slice(0, 10)
    .map((delivery) => {
      const automation = automationById.get(delivery.automationId)

      return {
        id: delivery.id,
        automationId: delivery.automationId,
        automationName: automation?.name || 'Deleted automation',
        templateName: automation?.template?.name || null,
        email: delivery.email,
        error: delivery.error || 'Delivery failed without an error message.',
        createdAt: delivery.createdAt,
      }
    })

  return {
    summary,
    templates: templateItems,
    unlinkedAutomations,
    recentErrors,
  }
}