import 'server-only'

import { Prisma } from '@prisma/client'

import {
  buildEmailCampaignRecipient,
  renderCampaignEmail,
  type CampaignEmailInput,
} from '@/lib/email-campaigns'
import { prisma } from '@/lib/prisma'
import { sendResendEmail } from '@/lib/resend'

interface EmailAutomationTemplateSummary {
  id: string
  name: string
}

export const EMAIL_AUTOMATION_TRIGGER_TYPES = [
  'user_event',
  'page_dwell',
  'drill_completed',
  'practice_test_completed',
] as const

export type EmailAutomationTriggerType = (typeof EMAIL_AUTOMATION_TRIGGER_TYPES)[number]

export interface EmailAutomationTriggerFilters {
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

export interface EmailAutomationInput extends CampaignEmailInput {
  name: string
  description?: string
  isActive?: boolean
  triggerType: EmailAutomationTriggerType
  triggerFilters?: EmailAutomationTriggerFilters
  templateId?: string
  aiPrompt?: string
}

export interface EmailAutomationRecord extends EmailAutomationInput {
  id: string
  template?: EmailAutomationTemplateSummary
  createdAt: Date
  updatedAt: Date
}

export interface EmailAutomationEvent {
  userId: string
  triggerType: EmailAutomationTriggerType
  triggerKey?: string
  eventType?: string
  eventName?: string
  pagePath?: string
  dwellTimeMs?: number
  category?: string
  moduleType?: string
  difficulty?: string
  score?: number
  practiceTestId?: string | null
  metadata?: Record<string, unknown>
}

const FIRST_MATCH_TRIGGER_KEY = 'first_match'

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
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

function normalizeTriggerFilters(filters: unknown): EmailAutomationTriggerFilters {
  if (!filters || typeof filters !== 'object') {
    return {}
  }

  const value = filters as Record<string, unknown>

  return {
    userId: normalizeString(value.userId),
    userEmail: normalizeString(value.userEmail)?.toLowerCase(),
    eventType: normalizeString(value.eventType),
    eventName: normalizeString(value.eventName),
    pagePath: normalizeString(value.pagePath),
    minDwellTimeMs: normalizeNumber(value.minDwellTimeMs),
    maxDwellTimeMs: normalizeNumber(value.maxDwellTimeMs),
    category: normalizeString(value.category),
    moduleType: normalizeString(value.moduleType),
    difficulty: normalizeString(value.difficulty),
    minScore: normalizeNumber(value.minScore),
    practiceTestId: normalizeString(value.practiceTestId),
    metadataKey: normalizeString(value.metadataKey),
    metadataValue: normalizeString(value.metadataValue),
  }
}

function parseTriggerFilters(raw: string | null): EmailAutomationTriggerFilters {
  if (!raw) {
    return {}
  }

  try {
    return normalizeTriggerFilters(JSON.parse(raw))
  } catch {
    return {}
  }
}

function serializeTriggerFilters(filters: EmailAutomationTriggerFilters | undefined): string | null {
  const normalized = normalizeTriggerFilters(filters)

  const entries = Object.entries(normalized).filter(([, value]) => value != null && value !== '')
  if (entries.length === 0) {
    return null
  }

  return JSON.stringify(Object.fromEntries(entries))
}

function toCampaignEmailInput(automation: {
  promoCode: string | null
  subjectTemplate: string
  previewText: string | null
  eyebrow: string | null
  headline: string | null
  bodyTemplate: string
  primaryButtonLabel: string | null
  primaryButtonUrl: string | null
  secondaryButtonLabel: string | null
  secondaryButtonUrl: string | null
  footer: string | null
}): CampaignEmailInput {
  return {
    promoCode: automation.promoCode || undefined,
    subject: automation.subjectTemplate,
    previewText: automation.previewText || undefined,
    eyebrow: automation.eyebrow || undefined,
    headline: automation.headline || undefined,
    body: automation.bodyTemplate,
    primaryButtonLabel: automation.primaryButtonLabel || undefined,
    primaryButtonUrl: automation.primaryButtonUrl || undefined,
    secondaryButtonLabel: automation.secondaryButtonLabel || undefined,
    secondaryButtonUrl: automation.secondaryButtonUrl || undefined,
    footer: automation.footer || undefined,
  }
}

function toRecord(automation: {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: string
  triggerFilters: string | null
  templateId: string | null
  aiPrompt: string | null
  promoCode: string | null
  subjectTemplate: string
  previewText: string | null
  eyebrow: string | null
  headline: string | null
  bodyTemplate: string
  primaryButtonLabel: string | null
  primaryButtonUrl: string | null
  secondaryButtonLabel: string | null
  secondaryButtonUrl: string | null
  footer: string | null
  template?: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}): EmailAutomationRecord {
  return {
    id: automation.id,
    name: automation.name,
    description: automation.description || undefined,
    isActive: automation.isActive,
    triggerType: automation.triggerType as EmailAutomationTriggerType,
    triggerFilters: parseTriggerFilters(automation.triggerFilters),
    templateId: automation.templateId || undefined,
    aiPrompt: automation.aiPrompt || undefined,
    promoCode: automation.promoCode || undefined,
    subject: automation.subjectTemplate,
    previewText: automation.previewText || undefined,
    eyebrow: automation.eyebrow || undefined,
    headline: automation.headline || undefined,
    body: automation.bodyTemplate,
    primaryButtonLabel: automation.primaryButtonLabel || undefined,
    primaryButtonUrl: automation.primaryButtonUrl || undefined,
    secondaryButtonLabel: automation.secondaryButtonLabel || undefined,
    secondaryButtonUrl: automation.secondaryButtonUrl || undefined,
    footer: automation.footer || undefined,
    template: automation.template || undefined,
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
  }
}

async function buildAutomationData(input: EmailAutomationInput): Promise<Prisma.EmailAutomationUncheckedCreateInput> {
  const subject = input.subject?.trim()
  const previewText = input.previewText?.trim() || null
  const eyebrow = input.eyebrow?.trim() || null
  const headline = input.headline?.trim() || null
  const body = input.body?.trim()
  const promoCode = input.promoCode?.trim().toUpperCase() || null
  const primaryButtonLabel = input.primaryButtonLabel?.trim() || null
  const primaryButtonUrl = input.primaryButtonUrl?.trim() || null
  const secondaryButtonLabel = input.secondaryButtonLabel?.trim() || null
  const secondaryButtonUrl = input.secondaryButtonUrl?.trim() || null
  const footer = input.footer?.trim() || null

  let templateContent: {
    promoCode: string | null
    subjectTemplate: string
    previewText: string | null
    eyebrow: string | null
    headline: string | null
    bodyTemplate: string
    primaryButtonLabel: string | null
    primaryButtonUrl: string | null
    secondaryButtonLabel: string | null
    secondaryButtonUrl: string | null
    footer: string | null
  } | null = null

  if (input.templateId?.trim()) {
    templateContent = await prisma.emailTemplate.findUnique({
      where: { id: input.templateId.trim() },
      select: {
        promoCode: true,
        subjectTemplate: true,
        previewText: true,
        eyebrow: true,
        headline: true,
        bodyTemplate: true,
        primaryButtonLabel: true,
        primaryButtonUrl: true,
        secondaryButtonLabel: true,
        secondaryButtonUrl: true,
        footer: true,
      },
    })

    if (!templateContent) {
      throw new Error('Selected email template was not found')
    }
  }

  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    isActive: input.isActive ?? true,
    triggerType: input.triggerType,
    triggerFilters: serializeTriggerFilters(input.triggerFilters),
    templateId: input.templateId?.trim() || null,
    aiPrompt: input.aiPrompt?.trim() || null,
    promoCode: promoCode ?? templateContent?.promoCode ?? null,
    subjectTemplate: subject || templateContent?.subjectTemplate || '',
    previewText: previewText ?? templateContent?.previewText ?? null,
    eyebrow: eyebrow ?? templateContent?.eyebrow ?? null,
    headline: headline ?? templateContent?.headline ?? null,
    bodyTemplate: body || templateContent?.bodyTemplate || '',
    primaryButtonLabel: primaryButtonLabel ?? templateContent?.primaryButtonLabel ?? null,
    primaryButtonUrl: primaryButtonUrl ?? templateContent?.primaryButtonUrl ?? null,
    secondaryButtonLabel: secondaryButtonLabel ?? templateContent?.secondaryButtonLabel ?? null,
    secondaryButtonUrl: secondaryButtonUrl ?? templateContent?.secondaryButtonUrl ?? null,
    footer: footer ?? templateContent?.footer ?? null,
  }
}

export async function listEmailAutomations(): Promise<EmailAutomationRecord[]> {
  const automations = await prisma.emailAutomation.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return automations.map(toRecord)
}

export async function createEmailAutomation(input: EmailAutomationInput): Promise<EmailAutomationRecord> {
  const automation = await prisma.emailAutomation.create({
    data: await buildAutomationData(input),
    include: {
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return toRecord(automation)
}

export async function updateEmailAutomation(id: string, input: EmailAutomationInput): Promise<EmailAutomationRecord> {
  const automation = await prisma.emailAutomation.update({
    where: { id },
    data: await buildAutomationData(input),
    include: {
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return toRecord(automation)
}

function matchesMetadata(filters: EmailAutomationTriggerFilters, metadata: Record<string, unknown> | undefined): boolean {
  if (!filters.metadataKey) {
    return true
  }

  const value = metadata?.[filters.metadataKey]
  if (value == null) {
    return false
  }

  if (!filters.metadataValue) {
    return true
  }

  return String(value) === filters.metadataValue
}

function matchesEvent(filters: EmailAutomationTriggerFilters, event: EmailAutomationEvent, userEmail: string): boolean {
  if (filters.userId && filters.userId !== event.userId) {
    return false
  }

  if (filters.userEmail && filters.userEmail !== userEmail.toLowerCase()) {
    return false
  }

  switch (event.triggerType) {
    case 'user_event':
      if (filters.eventType && filters.eventType !== event.eventType) return false
      if (filters.eventName && filters.eventName !== event.eventName) return false
      if (filters.pagePath && filters.pagePath !== event.pagePath) return false
      return matchesMetadata(filters, event.metadata)
    case 'page_dwell': {
      if (filters.pagePath && filters.pagePath !== event.pagePath) return false
      if (filters.minDwellTimeMs != null && (event.dwellTimeMs ?? 0) < filters.minDwellTimeMs) return false
      if (filters.maxDwellTimeMs != null && (event.dwellTimeMs ?? 0) > filters.maxDwellTimeMs) return false
      return true
    }
    case 'drill_completed':
      if (filters.category && filters.category !== event.category) return false
      if (filters.moduleType && filters.moduleType !== event.moduleType) return false
      if (filters.difficulty && filters.difficulty !== event.difficulty) return false
      if (filters.minScore != null && (event.score ?? 0) < filters.minScore) return false
      return true
    case 'practice_test_completed':
      if (filters.practiceTestId && filters.practiceTestId !== (event.practiceTestId || '')) return false
      if (filters.minScore != null && (event.score ?? 0) < filters.minScore) return false
      return true
    default:
      return false
  }
}

export async function processEmailAutomationEvent(event: EmailAutomationEvent): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: event.userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      createdAt: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      joinedViaQrCode: true,
      isTester: true,
      emailUnsubscribedAt: true,
    },
  })

  if (!user) {
    return
  }

  const recipient = buildEmailCampaignRecipient(user)
  if (!recipient.isDeliverable || !recipient.deliverableEmail) {
    return
  }

  const automations = await prisma.emailAutomation.findMany({
    where: {
      isActive: true,
      triggerType: event.triggerType,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  })

  for (const automation of automations) {
    const filters = parseTriggerFilters(automation.triggerFilters)
    if (!matchesEvent(filters, event, user.email)) {
      continue
    }

    const triggerKey = event.triggerKey?.trim() || FIRST_MATCH_TRIGGER_KEY

    let deliveryId: string | null = null
    let outboundMessageId: string | null = null

    try {
      const delivery = await prisma.emailAutomationDelivery.create({
        data: {
          automationId: automation.id,
          userId: user.id,
          email: recipient.deliverableEmail,
          triggerType: event.triggerType,
          triggerKey,
          status: 'queued',
        },
      })
      deliveryId = delivery.id
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        continue
      }

      throw error
    }

    try {
      const rendered = await renderCampaignEmail(toCampaignEmailInput(automation), recipient, {
        additionalTokens: event.metadata,
      })

      const outboundMessage = await prisma.outboundEmailMessage.create({
        data: {
          userId: user.id,
          toEmail: recipient.deliverableEmail,
          channel: 'automation',
          templateId: automation.templateId,
          automationId: automation.id,
          triggerType: event.triggerType,
          triggerKey,
          subject: rendered.subject,
          htmlBody: rendered.html,
          textBody: rendered.text,
          status: 'queued',
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        },
      })
      outboundMessageId = outboundMessage.id

      const response = await sendResendEmail({
        to: recipient.deliverableEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: [
          { name: 'feature', value: 'email_automations' },
          { name: 'automation_id', value: automation.id },
          { name: 'trigger', value: event.triggerType },
        ],
      })

      await prisma.emailAutomationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'sent',
          resendId: typeof response?.id === 'string' ? response.id : null,
          sentAt: new Date(),
        },
      })

      await prisma.outboundEmailMessage.update({
        where: { id: outboundMessageId },
        data: {
          status: 'sent',
          providerMessageId: typeof response?.id === 'string' ? response.id : null,
          sentAt: new Date(),
        },
      })
    } catch (error) {
      await prisma.emailAutomationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        },
      })

      if (outboundMessageId) {
        await prisma.outboundEmailMessage.update({
          where: { id: outboundMessageId },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }
  }
}