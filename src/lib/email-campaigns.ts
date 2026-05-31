import 'server-only'

import { Prisma } from '@prisma/client'

import { buildEmailUnsubscribeUrl } from '@/lib/email-unsubscribe'
import { getPromoCodeDefinition } from '@/lib/promo-code-store'
import { buildPromoRedemptionUrl } from '@/lib/promo-codes'
import { prisma } from '@/lib/prisma'

const SYNTHETIC_EMAIL_SUFFIX = '@duck.local'
const DEFAULT_BRAND_URL = 'https://www.ducksat.com'
const DEFAULT_BODY_COPY = 'DuckSAT is here to help you study smarter and score higher.'

export type EmailCampaignPlanFilter = 'all' | 'free' | 'paid' | 'monthly' | 'yearly'

export interface EmailCampaignFilters {
  search?: string
  plan?: EmailCampaignPlanFilter
  joinedViaQr?: boolean
  includeTesters?: boolean
}

export interface EmailCampaignRecipient {
  id: string
  name: string | null
  username: string | null
  email: string
  createdAt: Date
  subscriptionPlan: string
  subscriptionStatus: string
  joinedViaQrCode: boolean
  isTester: boolean
  emailUnsubscribedAt: Date | null
  deliverableEmail: string | null
  isDeliverable: boolean
  skipReason: string | null
}

export interface EmailCampaignAudience {
  matchedCount: number
  deliverableCount: number
  skippedCount: number
  recipients: EmailCampaignRecipient[]
}

export interface CampaignEmailInput {
  promoCode?: string
  subject: string
  previewText?: string
  eyebrow?: string
  headline?: string
  body: string
  primaryButtonLabel?: string
  primaryButtonUrl?: string
  secondaryButtonLabel?: string
  secondaryButtonUrl?: string
  footer?: string
}

export interface RenderedCampaignEmail {
  subject: string
  html: string
  text: string
}

export interface CampaignRenderOptions {
  additionalTokens?: Record<string, unknown>
}

interface CampaignRecipientUserShape {
  id: string
  name: string | null
  username: string | null
  email: string
  createdAt: Date
  subscriptionPlan: string
  subscriptionStatus: string
  joinedViaQrCode: boolean
  isTester: boolean
  emailUnsubscribedAt: Date | null
}

interface ResolvedCampaignPromotion {
  code: string
  label: string
  description: string
  redemptionUrl: string
}

function buildUserWhere(filters: EmailCampaignFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}

  if (filters.plan && filters.plan !== 'all') {
    if (filters.plan === 'free') {
      where.subscriptionPlan = 'free'
    } else if (filters.plan === 'paid') {
      where.subscriptionPlan = { in: ['monthly', 'yearly'] }
      where.subscriptionStatus = 'active'
    } else {
      where.subscriptionPlan = filters.plan
    }
  }

  if (filters.joinedViaQr) {
    where.joinedViaQrCode = true
  }

  if (!filters.includeTesters) {
    where.isTester = false
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { username: { contains: filters.search } },
      { email: { contains: filters.search } },
    ]
  }

  return where
}

export function isDeliverableEmail(email: string | null | undefined): email is string {
  if (!email) return false
  return !email.toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX)
}

function resolveDeliverableEmail(email: string): { deliverableEmail: string | null; skipReason: string | null } {
  if (!isDeliverableEmail(email)) {
    return {
      deliverableEmail: null,
      skipReason: 'synthetic_credentials_email',
    }
  }

  return {
    deliverableEmail: email,
    skipReason: null,
  }
}

function resolveCampaignRecipient(user: CampaignRecipientUserShape): EmailCampaignRecipient {
  if (user.emailUnsubscribedAt) {
    return {
      ...user,
      deliverableEmail: null,
      isDeliverable: false,
      skipReason: 'unsubscribed',
    }
  }

  const { deliverableEmail, skipReason } = resolveDeliverableEmail(user.email)

  return {
    ...user,
    deliverableEmail,
    isDeliverable: !!deliverableEmail,
    skipReason,
  }
}

export function buildEmailCampaignRecipient(user: CampaignRecipientUserShape): EmailCampaignRecipient {
  return resolveCampaignRecipient(user)
}

export async function findCampaignAudience(filters: EmailCampaignFilters): Promise<EmailCampaignAudience> {
  const users = await prisma.user.findMany({
    where: buildUserWhere(filters),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      createdAt: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      joinedViaQrCode: true,
      isTester: true,
      emailUnsubscribedAt: true,
    },
  })

  const recipients = users.map<EmailCampaignRecipient>(resolveCampaignRecipient)

  const deliverableCount = recipients.filter((recipient) => recipient.isDeliverable).length

  return {
    matchedCount: recipients.length,
    deliverableCount,
    skippedCount: recipients.length - deliverableCount,
    recipients,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function resolveCampaignPromotion(
  promoCode: string | null | undefined,
  brandBaseUrl: string,
): Promise<ResolvedCampaignPromotion | null> {
  const definition = await getPromoCodeDefinition(promoCode)

  if (!definition?.emailSelectable) {
    return null
  }

  return {
    code: definition.code,
    label: definition.label,
    description: definition.description,
    redemptionUrl: buildPromoRedemptionUrl(definition.code, brandBaseUrl),
  }
}

function replaceTokens(
  template: string,
  recipient: EmailCampaignRecipient,
  promotion: ResolvedCampaignPromotion | null,
  additionalTokens?: Record<string, unknown>,
): string {
  const fullName = recipient.name?.trim() || recipient.username?.trim() || recipient.email
  const firstName = fullName.split(' ')[0] || 'there'

  let rendered = template
    .replace(/{{\s*name\s*}}/gi, fullName)
    .replace(/{{\s*firstName\s*}}/gi, firstName)
    .replace(/{{\s*email\s*}}/gi, recipient.deliverableEmail ?? recipient.email)
    .replace(/{{\s*username\s*}}/gi, recipient.username ?? '')
    .replace(/{{\s*plan\s*}}/gi, recipient.subscriptionPlan)
    .replace(/{{\s*promoCode\s*}}/gi, promotion?.code ?? '')
    .replace(/{{\s*promoLabel\s*}}/gi, promotion?.label ?? '')
    .replace(/{{\s*promoBenefit\s*}}/gi, promotion?.description ?? '')
    .replace(/{{\s*promoRedeemUrl\s*}}/gi, promotion?.redemptionUrl ?? '')

  if (!additionalTokens) {
    return rendered
  }

  for (const [key, value] of Object.entries(additionalTokens)) {
    if (!key.trim() || value == null) {
      continue
    }

    rendered = rendered.replace(
      new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'gi'),
      String(value),
    )
  }

  return rendered
}

function getBrandBaseUrl(): string {
  const configuredUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || DEFAULT_BRAND_URL
  const normalizedUrl = configuredUrl.replace(/\/$/, '')

  if (normalizedUrl.includes('localhost')) {
    return DEFAULT_BRAND_URL
  }

  return normalizedUrl
}

function normalizeParagraphs(
  body: string,
  recipient: EmailCampaignRecipient,
  promotion: ResolvedCampaignPromotion | null,
  additionalTokens?: Record<string, unknown>,
): string[] {
  const normalized = replaceTokens(body, recipient, promotion, additionalTokens).trim()
  if (!normalized) {
    return [DEFAULT_BODY_COPY]
  }

  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function shouldIncludeUnsubscribeLink(recipient: EmailCampaignRecipient): boolean {
  return !recipient.id.startsWith('preview-') && !recipient.id.startsWith('test-')
}

export async function renderCampaignEmail(
  input: CampaignEmailInput,
  recipient: EmailCampaignRecipient,
  options?: CampaignRenderOptions,
): Promise<RenderedCampaignEmail> {
  const brandBaseUrl = getBrandBaseUrl()
  const logoUrl = `${brandBaseUrl}/duck-logo.svg`
  const promotion = await resolveCampaignPromotion(input.promoCode, brandBaseUrl)
  const additionalTokens = options?.additionalTokens
  const subject = replaceTokens(input.subject, recipient, promotion, additionalTokens)
  const previewText = replaceTokens(input.previewText?.trim() || '', recipient, promotion, additionalTokens)
  const eyebrow = replaceTokens(input.eyebrow?.trim() || 'DuckSAT update', recipient, promotion, additionalTokens)
  const headline = replaceTokens(input.headline?.trim() || 'A note from DuckSAT', recipient, promotion, additionalTokens)
  const footer = replaceTokens(
    input.footer?.trim() || 'You are receiving this email from DuckSAT.',
    recipient,
    promotion,
    additionalTokens,
  )
  const paragraphs = normalizeParagraphs(input.body, recipient, promotion, additionalTokens)
  const unsubscribeUrl = shouldIncludeUnsubscribeLink(recipient)
    ? buildEmailUnsubscribeUrl({ userId: recipient.id, email: recipient.email })
    : ''

  const primaryButtonLabel = input.primaryButtonLabel
    ? replaceTokens(input.primaryButtonLabel, recipient, promotion, additionalTokens)
    : ''
  const primaryButtonUrl = input.primaryButtonUrl
    ? replaceTokens(input.primaryButtonUrl, recipient, promotion, additionalTokens)
    : ''
  const secondaryButtonLabel = input.secondaryButtonLabel
    ? replaceTokens(input.secondaryButtonLabel, recipient, promotion, additionalTokens)
    : ''
  const secondaryButtonUrl = input.secondaryButtonUrl
    ? replaceTokens(input.secondaryButtonUrl, recipient, promotion, additionalTokens)
    : ''

  const htmlParagraphs = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7;">${escapeHtml(paragraph)}</p>`,
    )
    .join('')

  const buttonRow = primaryButtonLabel && primaryButtonUrl
    ? `
      <div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap;">
        <a href="${escapeHtml(primaryButtonUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:15px;">${escapeHtml(primaryButtonLabel)}</a>
        ${secondaryButtonLabel && secondaryButtonUrl
          ? `<a href="${escapeHtml(secondaryButtonUrl)}" style="display:inline-block;background:#e2e8f0;color:#0f172a;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:15px;">${escapeHtml(secondaryButtonLabel)}</a>`
          : ''}
      </div>
    `
    : ''

  const promotionRow = promotion
    ? `
      <div style="margin-top:28px;border:1px solid #99f6e4;background:linear-gradient(135deg,#ecfeff 0%,#f8fafc 100%);border-radius:24px;padding:22px;">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#0f766e;font-weight:700;margin-bottom:10px;">Bonus Offer</div>
        <div style="color:#0f172a;font-size:24px;line-height:1.2;font-weight:800;margin-bottom:8px;">Use code ${escapeHtml(promotion.code)}</div>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(promotion.description)}</p>
        <a href="${escapeHtml(promotion.redemptionUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;font-size:15px;">Redeem ${escapeHtml(promotion.code)}</a>
      </div>
    `
    : ''

  const unsubscribeRow = unsubscribeUrl
    ? `
      <p style="margin:14px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#0f766e;text-decoration:underline;">Unsubscribe from DuckSAT emails</a>
      </p>
    `
    : ''

  const html = `
    <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
        <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(previewText)}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 50px rgba(15,23,42,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#ecfeff 0%,#f1f5f9 100%);padding:32px 32px 20px;border-bottom:1px solid #e2e8f0;">
                    <img src="${escapeHtml(logoUrl)}" alt="DuckSAT" width="64" height="64" style="display:block;width:64px;height:64px;margin-bottom:18px;" />
                    <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#0f766e;font-weight:700;margin-bottom:12px;">${escapeHtml(eyebrow)}</div>
                    <h1 style="margin:0;color:#0f172a;font-size:32px;line-height:1.1;">${escapeHtml(headline)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    ${htmlParagraphs}
                    ${buttonRow}
                    ${promotionRow}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;">
                    <div style="height:1px;background:#e2e8f0;margin-bottom:18px;"></div>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(footer)}</p>
                    ${unsubscribeRow}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = [
    eyebrow,
    headline,
    '',
    ...paragraphs,
    primaryButtonLabel && primaryButtonUrl ? `\n${primaryButtonLabel}: ${primaryButtonUrl}` : '',
    secondaryButtonLabel && secondaryButtonUrl ? `${secondaryButtonLabel}: ${secondaryButtonUrl}` : '',
    promotion ? '' : '',
    promotion ? `${promotion.label}: ${promotion.code}` : '',
    promotion ? promotion.description : '',
    promotion ? `Redeem: ${promotion.redemptionUrl}` : '',
    '',
    footer,
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject,
    html,
    text,
  }
}