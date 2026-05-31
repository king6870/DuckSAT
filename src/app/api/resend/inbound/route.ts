import { NextRequest, NextResponse } from 'next/server'

import {
  getInboundEmailByResendEmailId,
  markInboundEmailForwardFailed,
  markInboundEmailForwarded,
  upsertInboundEmail,
} from '@/lib/inbound-emails'
import {
  forwardReceivedEmail,
  getInboundForwardTarget,
  getReceivedEmail,
  verifyInboundWebhook,
} from '@/lib/resend-receiving'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const payload = await request.text()

  let event

  try {
    event = verifyInboundWebhook(payload, {
      id: request.headers.get('svix-id'),
      timestamp: request.headers.get('svix-timestamp'),
      signature: request.headers.get('svix-signature'),
    })
  } catch (error) {
    console.error('[POST /api/resend/inbound] Invalid webhook', error)
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }

  try {
    const existing = await getInboundEmailByResendEmailId(event.data.email_id)

    if (existing?.forwardStatus === 'forwarded') {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const receivedEmail = await getReceivedEmail(event.data.email_id)
    await upsertInboundEmail(receivedEmail)

    const forwardTarget = getInboundForwardTarget()

    try {
      const forwarded = await forwardReceivedEmail(event.data.email_id)

      await markInboundEmailForwarded(event.data.email_id, {
        forwardTarget: forwarded.to,
        forwardedResendId: forwarded.id,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to forward inbound email'

      await markInboundEmailForwardFailed(event.data.email_id, {
        forwardTarget,
        error: message,
      })

      throw error
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[POST /api/resend/inbound]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}