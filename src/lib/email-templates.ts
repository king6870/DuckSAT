import 'server-only'

import { prisma } from '@/lib/prisma'
import type { CampaignEmailInput } from '@/lib/email-campaigns'

export interface EmailTemplateInput extends CampaignEmailInput {
  name: string
  description?: string
  aiPrompt?: string
}

export interface EmailTemplateRecord extends EmailTemplateInput {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface EmailTemplateSummary {
  id: string
  name: string
  description?: string
  updatedAt: Date
}

function toRecord(template: {
  id: string
  name: string
  description: string | null
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
  createdAt: Date
  updatedAt: Date
}): EmailTemplateRecord {
  return {
    id: template.id,
    name: template.name,
    description: template.description || undefined,
    aiPrompt: template.aiPrompt || undefined,
    promoCode: template.promoCode || undefined,
    subject: template.subjectTemplate,
    previewText: template.previewText || undefined,
    eyebrow: template.eyebrow || undefined,
    headline: template.headline || undefined,
    body: template.bodyTemplate,
    primaryButtonLabel: template.primaryButtonLabel || undefined,
    primaryButtonUrl: template.primaryButtonUrl || undefined,
    secondaryButtonLabel: template.secondaryButtonLabel || undefined,
    secondaryButtonUrl: template.secondaryButtonUrl || undefined,
    footer: template.footer || undefined,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

function buildTemplateData(input: EmailTemplateInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    aiPrompt: input.aiPrompt?.trim() || null,
    promoCode: input.promoCode?.trim().toUpperCase() || null,
    subjectTemplate: input.subject.trim(),
    previewText: input.previewText?.trim() || null,
    eyebrow: input.eyebrow?.trim() || null,
    headline: input.headline?.trim() || null,
    bodyTemplate: input.body.trim(),
    primaryButtonLabel: input.primaryButtonLabel?.trim() || null,
    primaryButtonUrl: input.primaryButtonUrl?.trim() || null,
    secondaryButtonLabel: input.secondaryButtonLabel?.trim() || null,
    secondaryButtonUrl: input.secondaryButtonUrl?.trim() || null,
    footer: input.footer?.trim() || null,
  }
}

export function emailTemplateToCampaignInput(template: Pick<EmailTemplateRecord, 'promoCode' | 'subject' | 'previewText' | 'eyebrow' | 'headline' | 'body' | 'primaryButtonLabel' | 'primaryButtonUrl' | 'secondaryButtonLabel' | 'secondaryButtonUrl' | 'footer'>): CampaignEmailInput {
  return {
    promoCode: template.promoCode,
    subject: template.subject,
    previewText: template.previewText,
    eyebrow: template.eyebrow,
    headline: template.headline,
    body: template.body,
    primaryButtonLabel: template.primaryButtonLabel,
    primaryButtonUrl: template.primaryButtonUrl,
    secondaryButtonLabel: template.secondaryButtonLabel,
    secondaryButtonUrl: template.secondaryButtonUrl,
    footer: template.footer,
  }
}

export async function listEmailTemplates(): Promise<EmailTemplateRecord[]> {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  })

  return templates.map(toRecord)
}

export async function listEmailTemplateSummaries(): Promise<EmailTemplateSummary[]> {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
    },
  })

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description || undefined,
    updatedAt: template.updatedAt,
  }))
}

export async function getEmailTemplateById(id: string): Promise<EmailTemplateRecord | null> {
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  })

  return template ? toRecord(template) : null
}

export async function createEmailTemplate(input: EmailTemplateInput): Promise<EmailTemplateRecord> {
  const template = await prisma.emailTemplate.create({
    data: buildTemplateData(input),
  })

  return toRecord(template)
}

export async function updateEmailTemplate(id: string, input: EmailTemplateInput): Promise<EmailTemplateRecord> {
  const template = await prisma.emailTemplate.update({
    where: { id },
    data: buildTemplateData(input),
  })

  return toRecord(template)
}