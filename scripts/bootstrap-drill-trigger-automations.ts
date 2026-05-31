import { prisma } from '@/lib/prisma'

type DrillAutomationSeed = {
  name: string
  description: string
  triggerType: 'user_event'
  triggerFilters: Record<string, unknown>
  subjectTemplate: string
  previewText: string
  eyebrow: string
  headline: string
  bodyTemplate: string
  primaryButtonLabel: string
  primaryButtonUrl: string
  footer: string
}

const seeds: DrillAutomationSeed[] = [
  {
    name: 'Drill Trigger - Started Encouragement',
    description: 'Sends when a user starts a topic drill.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: 'drill',
      eventName: 'drill_started',
    },
    subjectTemplate: 'Great start - keep going on your {{category}} drill',
    previewText: 'You just started a drill. Keep the momentum going.',
    eyebrow: 'Drill started',
    headline: 'You started strong. Keep the streak alive.',
    bodyTemplate:
      'Nice work getting started on {{category}}. Short focused reps add up fast. Finish this drill, then try one more while your momentum is high.',
    primaryButtonLabel: 'Continue Drill Practice',
    primaryButtonUrl: 'https://www.ducksat.com/practice/{{category}}',
    footer: 'DuckSAT is tracking your progress in real time so each session gets smarter.',
  },
  {
    name: 'Drill Trigger - Completed Encouragement',
    description: 'Sends when a user completes a topic drill.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: 'drill',
      eventName: 'drill_completed',
    },
    subjectTemplate: 'Drill complete - you scored {{score}}%',
    previewText: 'Your drill is done. Keep improving with your next set.',
    eyebrow: 'Drill complete',
    headline: 'Great effort on your {{category}} drill.',
    bodyTemplate:
      'You completed your drill with a score of {{score}}% across {{totalQuestions}} questions. Keep building consistency by starting your next drill now.',
    primaryButtonLabel: 'Start Next Drill',
    primaryButtonUrl: 'https://www.ducksat.com/practice/{{category}}',
    footer: 'Every completed drill helps DuckSAT target your next weak spot faster.',
  },
]

async function upsertDrillAutomation(seed: DrillAutomationSeed) {
  const existing = await prisma.emailAutomation.findFirst({
    where: {
      name: seed.name,
    },
    select: { id: true },
  })

  const payload = {
    name: seed.name,
    description: seed.description,
    isActive: true,
    triggerType: seed.triggerType,
    triggerFilters: JSON.stringify(seed.triggerFilters),
    subjectTemplate: seed.subjectTemplate,
    previewText: seed.previewText,
    eyebrow: seed.eyebrow,
    headline: seed.headline,
    bodyTemplate: seed.bodyTemplate,
    primaryButtonLabel: seed.primaryButtonLabel,
    primaryButtonUrl: seed.primaryButtonUrl,
    secondaryButtonLabel: null,
    secondaryButtonUrl: null,
    footer: seed.footer,
    templateId: null,
    aiPrompt: null,
    promoCode: null,
  }

  if (existing) {
    await prisma.emailAutomation.update({
      where: { id: existing.id },
      data: payload,
    })
    return { action: 'updated', name: seed.name }
  }

  await prisma.emailAutomation.create({
    data: payload,
  })
  return { action: 'created', name: seed.name }
}

async function main() {
  const results = []
  for (const seed of seeds) {
    const result = await upsertDrillAutomation(seed)
    results.push(result)
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
