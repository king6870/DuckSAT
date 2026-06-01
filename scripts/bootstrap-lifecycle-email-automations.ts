import { PrismaClient } from '@prisma/client'

import { generateEmailDraft } from '../src/lib/email-ai-generator'
import {
  SUPPORTED_LIFECYCLE_EMAIL_BLUEPRINTS,
  UNSUPPORTED_LIFECYCLE_EMAIL_BLUEPRINTS,
  type LifecycleEmailBlueprint,
} from '../src/lib/lifecycle-email-catalog'

const prisma = new PrismaClient()

async function upsertTemplate(blueprint: LifecycleEmailBlueprint, generated: Awaited<ReturnType<typeof generateEmailDraft>>) {
  const existing = await prisma.emailTemplate.findFirst({
    where: { name: blueprint.templateName },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  const data = {
    name: blueprint.templateName,
    description: blueprint.description,
    aiPrompt: blueprint.aiPrompt,
    promoCode: null,
    subjectTemplate: generated.subject,
    previewText: generated.previewText || null,
    eyebrow: generated.eyebrow || null,
    headline: generated.headline || null,
    bodyTemplate: generated.body,
    primaryButtonLabel: generated.primaryButtonLabel || null,
    primaryButtonUrl: generated.primaryButtonUrl || null,
    secondaryButtonLabel: generated.secondaryButtonLabel || null,
    secondaryButtonUrl: generated.secondaryButtonUrl || null,
    footer: generated.footer || null,
  }

  if (existing) {
    return prisma.emailTemplate.update({ where: { id: existing.id }, data, select: { id: true } })
  }

  return prisma.emailTemplate.create({ data, select: { id: true } })
}

async function upsertAutomation(
  blueprint: LifecycleEmailBlueprint,
  templateId: string,
  generated: Awaited<ReturnType<typeof generateEmailDraft>>,
) {
  const existing = await prisma.emailAutomation.findFirst({
    where: { name: blueprint.automationName },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  const data = {
    name: blueprint.automationName,
    description: blueprint.description,
    isActive: true,
    triggerType: blueprint.triggerType,
    triggerFilters: blueprint.triggerFilters ? JSON.stringify(blueprint.triggerFilters) : null,
    templateId,
    aiPrompt: blueprint.aiPrompt,
    promoCode: null,
    subjectTemplate: generated.subject,
    previewText: generated.previewText || null,
    eyebrow: generated.eyebrow || null,
    headline: generated.headline || null,
    bodyTemplate: generated.body,
    primaryButtonLabel: generated.primaryButtonLabel || null,
    primaryButtonUrl: generated.primaryButtonUrl || null,
    secondaryButtonLabel: generated.secondaryButtonLabel || null,
    secondaryButtonUrl: generated.secondaryButtonUrl || null,
    footer: generated.footer || null,
  }

  if (existing) {
    return prisma.emailAutomation.update({ where: { id: existing.id }, data, select: { id: true } })
  }

  return prisma.emailAutomation.create({ data, select: { id: true } })
}

async function main() {
  const results: Array<{ key: string; templateId: string; automationId: string; model: string }> = []
  const failures: Array<{ key: string; error: string }> = []

  for (const blueprint of SUPPORTED_LIFECYCLE_EMAIL_BLUEPRINTS) {
    try {
      console.log(`Generating ${blueprint.key}...`)

      const generated = await generateEmailDraft({
        prompt: blueprint.aiPrompt,
        triggerType: blueprint.triggerType,
        triggerSummary: blueprint.triggerSummary,
        allowedTokens: blueprint.allowedTokens,
        defaultPrimaryButtonUrl: blueprint.defaultPrimaryButtonUrl,
      })

      const template = await upsertTemplate(blueprint, generated)
      const automation = await upsertAutomation(blueprint, template.id, generated)

      results.push({
        key: blueprint.key,
        templateId: template.id,
        automationId: automation.id,
        model: generated.model,
      })

      console.log(`Upserted ${blueprint.key}: template=${template.id} automation=${automation.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ key: blueprint.key, error: message })
      console.error(`Failed ${blueprint.key}: ${message}`)
    }
  }

  console.log('Lifecycle automation bootstrap complete.')
  console.log(JSON.stringify({ results, unsupported: UNSUPPORTED_LIFECYCLE_EMAIL_BLUEPRINTS }, null, 2))

  if (failures.length > 0) {
    throw new Error(`Lifecycle automation bootstrap failed for: ${failures.map((failure) => failure.key).join(', ')}`)
  }
}

main()
  .catch((error) => {
    console.error('Lifecycle automation bootstrap failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })