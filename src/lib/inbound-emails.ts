import 'server-only'

import type { GetReceivingEmailResponseSuccess, InboundAttachment } from 'resend'

import { prisma } from '@/lib/prisma'

export type InboundEmailForwardStatus = 'pending' | 'forwarded' | 'forward_failed'

export interface InboundEmailAttachmentRecord {
  id: string
  filename: string | null
  size: number
  contentType: string
  contentId: string | null
  contentDisposition: string | null
}

export interface InboundEmailListItem {
  id: string
  resendEmailId: string
  fromEmail: string
  toEmails: string[]
  subject: string | null
  preview: string
  attachmentCount: number
  receivedAt: Date
  forwardStatus: InboundEmailForwardStatus
  forwardTarget: string | null
  forwardedAt: Date | null
  forwardError: string | null
}

export interface InboundEmailDetail extends InboundEmailListItem {
  messageId: string | null
  ccEmails: string[]
  bccEmails: string[]
  replyToEmails: string[]
  textBody: string | null
  htmlBody: string | null
  headers: Record<string, string>
  attachments: InboundEmailAttachmentRecord[]
}

interface InboundEmailRow {
  id: string
  resendEmailId: string
  messageId: string | null
  fromEmail: string
  toEmails: string
  ccEmails: string | null
  bccEmails: string | null
  replyToEmails: string | null
  subject: string | null
  textBody: string | null
  htmlBody: string | null
  headersJson: string | null
  attachmentsJson: string | null
  attachmentCount: number
  receivedAt: Date
  forwardStatus: string
  forwardTarget: string | null
  forwardedAt: Date | null
  forwardError: string | null
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value)
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toStoredAttachment(attachment: InboundAttachment): InboundEmailAttachmentRecord {
  return {
    id: attachment.id,
    filename: attachment.filename,
    size: attachment.size,
    contentType: attachment.content_type,
    contentId: attachment.content_id,
    contentDisposition: attachment.content_disposition,
  }
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
}

function buildPreview(textBody: string | null, htmlBody: string | null): string {
  const source = textBody?.trim() || (htmlBody ? stripHtml(htmlBody).trim() : '')
  const normalized = source.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return 'No preview available.'
  }

  return normalized.slice(0, 180)
}

function toListItem(row: InboundEmailRow): InboundEmailListItem {
  return {
    id: row.id,
    resendEmailId: row.resendEmailId,
    fromEmail: row.fromEmail,
    toEmails: parseJson<string[]>(row.toEmails, []),
    subject: row.subject,
    preview: buildPreview(row.textBody, row.htmlBody),
    attachmentCount: row.attachmentCount,
    receivedAt: row.receivedAt,
    forwardStatus: row.forwardStatus as InboundEmailForwardStatus,
    forwardTarget: row.forwardTarget,
    forwardedAt: row.forwardedAt,
    forwardError: row.forwardError,
  }
}

function toDetail(row: InboundEmailRow): InboundEmailDetail {
  return {
    ...toListItem(row),
    messageId: row.messageId,
    ccEmails: parseJson<string[]>(row.ccEmails, []),
    bccEmails: parseJson<string[]>(row.bccEmails, []),
    replyToEmails: parseJson<string[]>(row.replyToEmails, []),
    textBody: row.textBody,
    htmlBody: row.htmlBody,
    headers: parseJson<Record<string, string>>(row.headersJson, {}),
    attachments: parseJson<InboundEmailAttachmentRecord[]>(row.attachmentsJson, []),
  }
}

export async function getInboundEmailByResendEmailId(resendEmailId: string): Promise<InboundEmailDetail | null> {
  const row = await prisma.inboundEmail.findUnique({
    where: { resendEmailId },
    select: {
      id: true,
      resendEmailId: true,
      messageId: true,
      fromEmail: true,
      toEmails: true,
      ccEmails: true,
      bccEmails: true,
      replyToEmails: true,
      subject: true,
      textBody: true,
      htmlBody: true,
      headersJson: true,
      attachmentsJson: true,
      attachmentCount: true,
      receivedAt: true,
      forwardStatus: true,
      forwardTarget: true,
      forwardedAt: true,
      forwardError: true,
    },
  })

  return row ? toDetail(row) : null
}

export async function upsertInboundEmail(email: GetReceivingEmailResponseSuccess): Promise<InboundEmailDetail> {
  const attachments = email.attachments.map(toStoredAttachment)

  const row = await prisma.inboundEmail.upsert({
    where: {
      resendEmailId: email.id,
    },
    update: {
      messageId: email.message_id || null,
      fromEmail: email.from,
      toEmails: stringifyJson(email.to || []),
      ccEmails: email.cc?.length ? stringifyJson(email.cc) : null,
      bccEmails: email.bcc?.length ? stringifyJson(email.bcc) : null,
      replyToEmails: email.reply_to?.length ? stringifyJson(email.reply_to) : null,
      subject: email.subject?.trim() || null,
      textBody: email.text || null,
      htmlBody: email.html || null,
      headersJson: email.headers ? stringifyJson(email.headers) : null,
      attachmentsJson: attachments.length ? stringifyJson(attachments) : null,
      attachmentCount: attachments.length,
      receivedAt: new Date(email.created_at),
    },
    create: {
      resendEmailId: email.id,
      messageId: email.message_id || null,
      fromEmail: email.from,
      toEmails: stringifyJson(email.to || []),
      ccEmails: email.cc?.length ? stringifyJson(email.cc) : null,
      bccEmails: email.bcc?.length ? stringifyJson(email.bcc) : null,
      replyToEmails: email.reply_to?.length ? stringifyJson(email.reply_to) : null,
      subject: email.subject?.trim() || null,
      textBody: email.text || null,
      htmlBody: email.html || null,
      headersJson: email.headers ? stringifyJson(email.headers) : null,
      attachmentsJson: attachments.length ? stringifyJson(attachments) : null,
      attachmentCount: attachments.length,
      receivedAt: new Date(email.created_at),
    },
    select: {
      id: true,
      resendEmailId: true,
      messageId: true,
      fromEmail: true,
      toEmails: true,
      ccEmails: true,
      bccEmails: true,
      replyToEmails: true,
      subject: true,
      textBody: true,
      htmlBody: true,
      headersJson: true,
      attachmentsJson: true,
      attachmentCount: true,
      receivedAt: true,
      forwardStatus: true,
      forwardTarget: true,
      forwardedAt: true,
      forwardError: true,
    },
  })

  return toDetail(row)
}

export async function markInboundEmailForwarded(
  resendEmailId: string,
  input: { forwardTarget: string; forwardedResendId: string },
): Promise<void> {
  await prisma.inboundEmail.update({
    where: { resendEmailId },
    data: {
      forwardStatus: 'forwarded',
      forwardTarget: input.forwardTarget,
      forwardedResendId: input.forwardedResendId,
      forwardedAt: new Date(),
      forwardError: null,
    },
  })
}

export async function markInboundEmailForwardFailed(
  resendEmailId: string,
  input: { forwardTarget: string; error: string },
): Promise<void> {
  await prisma.inboundEmail.update({
    where: { resendEmailId },
    data: {
      forwardStatus: 'forward_failed',
      forwardTarget: input.forwardTarget,
      forwardError: input.error,
    },
  })
}

export async function listInboundEmails(limit = 50): Promise<InboundEmailListItem[]> {
  const rows = await prisma.inboundEmail.findMany({
    orderBy: {
      receivedAt: 'desc',
    },
    take: Math.max(1, Math.min(limit, 200)),
    select: {
      id: true,
      resendEmailId: true,
      messageId: true,
      fromEmail: true,
      toEmails: true,
      ccEmails: true,
      bccEmails: true,
      replyToEmails: true,
      subject: true,
      textBody: true,
      htmlBody: true,
      headersJson: true,
      attachmentsJson: true,
      attachmentCount: true,
      receivedAt: true,
      forwardStatus: true,
      forwardTarget: true,
      forwardedAt: true,
      forwardError: true,
    },
  })

  return rows.map(toListItem)
}

export async function getInboundEmailById(id: string): Promise<InboundEmailDetail | null> {
  const row = await prisma.inboundEmail.findUnique({
    where: { id },
    select: {
      id: true,
      resendEmailId: true,
      messageId: true,
      fromEmail: true,
      toEmails: true,
      ccEmails: true,
      bccEmails: true,
      replyToEmails: true,
      subject: true,
      textBody: true,
      htmlBody: true,
      headersJson: true,
      attachmentsJson: true,
      attachmentCount: true,
      receivedAt: true,
      forwardStatus: true,
      forwardTarget: true,
      forwardedAt: true,
      forwardError: true,
    },
  })

  return row ? toDetail(row) : null
}