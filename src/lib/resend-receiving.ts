import 'server-only'

import {
  Resend,
  type EmailReceivedEvent,
  type GetReceivingEmailResponseSuccess,
} from 'resend'

const DEFAULT_FORWARD_TO = 'ducksat1600@gmail.com'

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  return apiKey
}

function getResendWebhookSecret(): string {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim()

  if (!webhookSecret) {
    throw new Error('RESEND_WEBHOOK_SECRET is not configured')
  }

  return webhookSecret
}

function getResendForwardFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'info@ducksat.com'
}

function createResendClient(): Resend {
  return new Resend(getResendApiKey())
}

export function getInboundForwardTarget(): string {
  return process.env.RESEND_INBOUND_FORWARD_TO?.trim() || DEFAULT_FORWARD_TO
}

export function verifyInboundWebhook(payload: string, headers: {
  id: string | null
  timestamp: string | null
  signature: string | null
}): EmailReceivedEvent {
  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new Error('Missing webhook signature headers')
  }

  const event = createResendClient().webhooks.verify({
    payload,
    headers: {
      id: headers.id,
      timestamp: headers.timestamp,
      signature: headers.signature,
    },
    webhookSecret: getResendWebhookSecret(),
  })

  if (event.type !== 'email.received') {
    throw new Error(`Unsupported webhook event: ${event.type}`)
  }

  return event
}

export async function getReceivedEmail(emailId: string): Promise<GetReceivingEmailResponseSuccess> {
  const { data, error } = await createResendClient().emails.receiving.get(emailId)

  if (error || !data) {
    throw new Error(error?.message || `Failed to retrieve received email ${emailId}`)
  }

  return data
}

export async function forwardReceivedEmail(emailId: string): Promise<{ id: string; to: string }> {
  const to = getInboundForwardTarget()

  const { data, error } = await createResendClient().emails.receiving.forward({
    emailId,
    to,
    from: getResendForwardFromAddress(),
  })

  if (error || !data) {
    throw new Error(error?.message || `Failed to forward received email ${emailId}`)
  }

  return {
    id: data.id,
    to,
  }
}