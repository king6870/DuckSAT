import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import {
  findCampaignAudience,
  isDeliverableEmail,
  renderCampaignEmail,
  type CampaignEmailInput,
  type EmailCampaignFilters,
  type EmailCampaignRecipient,
} from '@/lib/email-campaigns'
import { sendResendBatch, sendResendEmail } from '@/lib/resend'

interface SendCampaignRequest extends CampaignEmailInput {
  filters?: EmailCampaignFilters
  mode?: 'test' | 'send'
  testEmail?: string
}

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

function buildTestRecipient(testEmail: string): EmailCampaignRecipient {
  return {
    id: 'test-recipient',
    name: 'DuckSAT Admin',
    username: 'admin',
    email: testEmail,
    createdAt: new Date(),
    subscriptionPlan: 'admin',
    subscriptionStatus: 'active',
    joinedViaQrCode: false,
    isTester: false,
    emailUnsubscribedAt: null,
    deliverableEmail: testEmail,
    isDeliverable: true,
    skipReason: null,
  }
}

function validateInput(body: Partial<SendCampaignRequest>): string | null {
  if (!body.subject?.trim()) {
    return 'subject is required'
  }

  if (!body.body?.trim()) {
    return 'body is required'
  }

  if (body.primaryButtonLabel && !body.primaryButtonUrl) {
    return 'primary button URL is required when button label is set'
  }

  if (body.secondaryButtonLabel && !body.secondaryButtonUrl) {
    return 'secondary button URL is required when button label is set'
  }

  if (body.mode === 'test' && !body.testEmail?.trim()) {
    return 'testEmail is required for test mode'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<SendCampaignRequest>
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

    if (body.mode === 'test') {
      const testEmail = body.testEmail!.trim()

      if (!isDeliverableEmail(testEmail)) {
        return NextResponse.json({ error: 'testEmail must be a real email address' }, { status: 400 })
      }

      const rendered = await renderCampaignEmail(campaign, buildTestRecipient(testEmail))

      await sendResendEmail({
        to: testEmail,
        subject: `[TEST] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
        tags: [
          { name: 'feature', value: 'admin_email_campaigns' },
          { name: 'mode', value: 'test' },
        ],
      })

      return NextResponse.json({ success: true, mode: 'test', sentTo: testEmail })
    }

    const audience = await findCampaignAudience(body.filters || {})
    const deliverableRecipients = audience.recipients.filter((recipient) => recipient.isDeliverable)

    if (deliverableRecipients.length === 0) {
      return NextResponse.json(
        {
          error: 'No deliverable recipients found for this audience',
          matchedCount: audience.matchedCount,
          skippedCount: audience.skippedCount,
        },
        { status: 400 },
      )
    }

    const messages = await Promise.all(
      deliverableRecipients.map(async (recipient) => {
        const rendered = await renderCampaignEmail(campaign, recipient)

        return {
          to: recipient.deliverableEmail!,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tags: [
            { name: 'feature', value: 'admin_email_campaigns' },
            { name: 'mode', value: 'send' },
          ],
        }
      }),
    )

    const deliveryResult = await sendResendBatch(messages)

    if (deliveryResult.sent.length === 0) {
      return NextResponse.json(
        {
          error: 'No campaign emails were accepted by Resend',
          matchedCount: audience.matchedCount,
          deliverableCount: audience.deliverableCount,
          skippedCount: audience.skippedCount,
          sentCount: 0,
          failedCount: deliveryResult.failed.length,
          failedRecipients: deliveryResult.failed.slice(0, 10),
        },
        { status: 502 },
      )
    }

    if (deliveryResult.failed.length > 0) {
      console.warn('[POST /api/admin/email-campaigns/send] Partial campaign send failure', {
        sentCount: deliveryResult.sent.length,
        failedCount: deliveryResult.failed.length,
      })
    }

    return NextResponse.json({
      success: true,
      mode: 'send',
      matchedCount: audience.matchedCount,
      deliverableCount: audience.deliverableCount,
      skippedCount: audience.skippedCount,
      sentCount: deliveryResult.sent.length,
      failedCount: deliveryResult.failed.length,
      partialSuccess: deliveryResult.failed.length > 0,
      failedRecipients: deliveryResult.failed.slice(0, 10),
    })
  } catch (error) {
    console.error('[POST /api/admin/email-campaigns/send]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}