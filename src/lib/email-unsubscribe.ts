import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { prisma } from '@/lib/prisma'

const DEFAULT_BRAND_URL = 'https://www.ducksat.com'

interface EmailUnsubscribeIdentity {
  userId: string
  email: string
}

export interface EmailUnsubscribeResult {
  status: 'unsubscribed' | 'already_unsubscribed' | 'invalid'
  email?: string
}

function getBrandBaseUrl(): string {
  const configuredUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || DEFAULT_BRAND_URL
  const normalizedUrl = configuredUrl.replace(/\/$/, '')

  if (normalizedUrl.includes('localhost')) {
    return DEFAULT_BRAND_URL
  }

  return normalizedUrl
}

function getUnsubscribeSecret(): string {
  const secret =
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.RESEND_API_KEY?.trim()

  if (!secret) {
    throw new Error('Email unsubscribe secret is not configured')
  }

  return secret
}

function buildUnsubscribeToken({ userId, email }: EmailUnsubscribeIdentity): string {
  return createHmac('sha256', getUnsubscribeSecret())
    .update(`${userId}:${email.toLowerCase()}`)
    .digest('base64url')
}

export function buildEmailUnsubscribeUrl(identity: EmailUnsubscribeIdentity): string {
  const params = new URLSearchParams({
    userId: identity.userId,
    token: buildUnsubscribeToken(identity),
  })

  return `${getBrandBaseUrl()}/unsubscribe?${params.toString()}`
}

export function isValidEmailUnsubscribeToken(identity: EmailUnsubscribeIdentity, token: string): boolean {
  if (!token) {
    return false
  }

  const expected = Buffer.from(buildUnsubscribeToken(identity))
  const actual = Buffer.from(token)

  if (expected.length !== actual.length) {
    return false
  }

  return timingSafeEqual(expected, actual)
}

export async function unsubscribeUserFromEmails(userId: string, token: string): Promise<EmailUnsubscribeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailUnsubscribedAt: true,
    },
  })

  if (!user || !isValidEmailUnsubscribeToken({ userId: user.id, email: user.email }, token)) {
    return { status: 'invalid' }
  }

  if (user.emailUnsubscribedAt) {
    return { status: 'already_unsubscribed', email: user.email }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailUnsubscribedAt: new Date() },
  })

  return { status: 'unsubscribed', email: user.email }
}