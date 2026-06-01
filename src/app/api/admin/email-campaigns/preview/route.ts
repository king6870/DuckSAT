import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import {
  findCampaignAudience,
  renderCampaignEmail,
  type CampaignEmailInput,
  type EmailCampaignFilters,
  type EmailCampaignRecipient,
} from '@/lib/email-campaigns'

interface PreviewCampaignRequest extends CampaignEmailInput {
  filters?: EmailCampaignFilters
}

function buildFallbackPreviewRecipient(): EmailCampaignRecipient {
  return {
    id: 'preview-recipient',
    name: 'DuckSAT Student',
    username: 'preview-user',
    email: 'preview@ducksat.com',
    createdAt: new Date(),
    subscriptionPlan: 'free',
    subscriptionStatus: 'active',
    joinedViaQrCode: false,
    isTester: false,
    emailUnsubscribedAt: null,
    deliverableEmail: 'preview@ducksat.com',
    isDeliverable: true,
    skipReason: null,
  }
}

function validateInput(body: Partial<PreviewCampaignRequest>): string | null {
  if (!body.subject?.trim()) {
    return 'subject is required'
  }

  if (!body.body?.trim()) {
    return 'body is required'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<PreviewCampaignRequest>
    const validationError = validateInput(body)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const campaign: CampaignEmailInput = {
      promoCode: body.promoCode?.trim().toUpperCase(),
      subject: body.subject!.trim(),
      previewText: body.previewText?.trim(),
      eyebrow: body.eyebrow?.trim(),
      headline: body.headline?.trim(),
      body: body.body!.trim(),
      primaryButtonLabel: body.primaryButtonLabel?.trim(),
      primaryButtonUrl: body.primaryButtonUrl?.trim(),
      secondaryButtonLabel: body.secondaryButtonLabel?.trim(),
      secondaryButtonUrl: body.secondaryButtonUrl?.trim(),
      footer: body.footer?.trim(),
    }

    const audience = await findCampaignAudience(body.filters || {})
    const previewRecipient = audience.recipients.find((recipient) => recipient.isDeliverable) || buildFallbackPreviewRecipient()
    const rendered = await renderCampaignEmail(campaign, previewRecipient)

    return NextResponse.json({
      matchedCount: audience.matchedCount,
      deliverableCount: audience.deliverableCount,
      skippedCount: audience.skippedCount,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      usedFallbackRecipient: !audience.recipients.some((recipient) => recipient.isDeliverable),
      previewRecipient: {
        name: previewRecipient.name || previewRecipient.username || 'Preview user',
        email: previewRecipient.deliverableEmail || previewRecipient.email,
        plan: previewRecipient.subscriptionPlan,
      },
    })
  } catch (error) {
    console.error('[POST /api/admin/email-campaigns/preview]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}