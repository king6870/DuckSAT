import 'server-only'

import { Resend } from 'resend'

const RESEND_BATCH_LIMIT = 100

export interface ResendEmailPayload {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export interface ResendBatchSendResult {
  sent: Array<{ to: string; id: string }>
  failed: Array<{ to: string; error: string }>
}

interface ResendConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  replyToEmail: string
}

function getResendConfig(): ResendConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  return {
    apiKey,
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || 'info@ducksat.com',
    fromName: process.env.RESEND_FROM_NAME?.trim() || 'DuckSAT',
    replyToEmail: process.env.RESEND_REPLY_TO_EMAIL?.trim() || 'info@ducksat.com',
  }
}

function createResendClient(apiKey: string): Resend {
  return new Resend(apiKey)
}

function chunkMessages(messages: ResendEmailPayload[], chunkSize: number): ResendEmailPayload[][] {
  const chunks: ResendEmailPayload[][] = []

  for (let index = 0; index < messages.length; index += chunkSize) {
    chunks.push(messages.slice(index, index + chunkSize))
  }

  return chunks
}

function buildFromHeader(config: ResendConfig): string {
  return `${config.fromName} <${config.fromEmail}>`
}

function buildEmailRequest(message: ResendEmailPayload, config: ResendConfig) {
  return {
    from: buildFromHeader(config),
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo || config.replyToEmail,
    tags: message.tags,
  }
}

export async function sendResendEmail(message: ResendEmailPayload) {
  const config = getResendConfig()
  const resend = createResendClient(config.apiKey)
  const { data, error } = await resend.emails.send(buildEmailRequest(message, config))

  if (error || !data?.id) {
    throw new Error(error?.message || `Failed to send email to ${message.to}`)
  }

  return data
}

export async function sendResendBatch(messages: ResendEmailPayload[]) {
  const config = getResendConfig()
  const resend = createResendClient(config.apiKey)
  const chunks = chunkMessages(messages, RESEND_BATCH_LIMIT)
  const result: ResendBatchSendResult = {
    sent: [],
    failed: [],
  }

  for (const chunk of chunks) {
    const { data, error } = await resend.batch.send(
      chunk.map((message) => buildEmailRequest(message, config)),
      { batchValidation: 'permissive' },
    )

    if (error || !data) {
      for (const message of chunk) {
        result.failed.push({
          to: message.to,
          error: error?.message || `Failed to send email to ${message.to}`,
        })
      }

      continue
    }

    const errorByIndex = new Map(
      (data.errors || []).map((item) => [item.index, item.message]),
    )
    let successIndex = 0

    for (let index = 0; index < chunk.length; index += 1) {
      const message = chunk[index]
      const chunkError = errorByIndex.get(index)

      if (chunkError) {
        result.failed.push({ to: message.to, error: chunkError })
        continue
      }

      const sentEmail = data.data[successIndex]

      if (!sentEmail?.id) {
        result.failed.push({ to: message.to, error: `Failed to send email to ${message.to}` })
        continue
      }

      successIndex += 1
      result.sent.push({ to: message.to, id: sentEmail.id })
    }
  }

  return result
}