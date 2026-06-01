"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import EmailWorkspaceNav from '@/components/admin/EmailWorkspaceNav'

type PromoCodeEffectType = 'tester_access' | 'bonus_practice_tests'

type PlanFilter = 'all' | 'free' | 'paid' | 'monthly' | 'yearly'

interface AudienceRecipient {
  id: string
  name: string | null
  username: string | null
  email: string
  subscriptionPlan: string
  subscriptionStatus: string
  joinedViaQrCode: boolean
  isTester: boolean
  deliverableEmail: string | null
  isDeliverable: boolean
  skipReason: string | null
}

interface AudienceResponse {
  matchedCount: number
  deliverableCount: number
  skippedCount: number
  sample: AudienceRecipient[]
}

interface SendResult {
  success?: boolean
  error?: string
  sentCount?: number
  deliverableCount?: number
  skippedCount?: number
  failedCount?: number
  partialSuccess?: boolean
  failedRecipients?: Array<{ to: string; error: string }>
  sentTo?: string
}

interface PreviewResponse {
  matchedCount: number
  deliverableCount: number
  skippedCount: number
  subject: string
  html: string
  text: string
  usedFallbackRecipient: boolean
  previewRecipient: {
    name: string
    email: string
    plan: string
  }
}

interface CampaignDraft {
  search: string
  plan: PlanFilter
  joinedViaQr: boolean
  includeTesters: boolean
  selectedTemplateId: string
  promoCode: string
  subject: string
  previewText: string
  eyebrow: string
  headline: string
  body: string
  primaryButtonLabel: string
  primaryButtonUrl: string
  secondaryButtonLabel: string
  secondaryButtonUrl: string
  footer: string
  testEmail: string
  savedAt?: string
}

interface EmailTemplateRecord {
  id: string
  name: string
  description?: string
  aiPrompt?: string
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
  updatedAt: string
}

interface PromoCodeRecord {
  id: string
  code: string
  label: string
  description: string
  effectType: PromoCodeEffectType
  bonusPracticeTests?: number
  successMessage: string
  emailSelectable: boolean
  isActive: boolean
}

interface InboundEmailListItem {
  id: string
  fromEmail: string
  toEmails: string[]
  subject: string | null
  preview: string
  attachmentCount: number
  receivedAt: string
  forwardStatus: 'pending' | 'forwarded' | 'forward_failed'
  forwardTarget: string | null
  forwardedAt: string | null
  forwardError: string | null
}

interface EmailActivityDeliveryItem {
  id: string
  automationId: string
  automationName: string
  email: string
  triggerType: string
  triggerKey: string
  status: string
  resendId: string | null
  error: string | null
  sentAt: string | null
  createdAt: string
}

interface EmailActivitySummary {
  total: number
  sent: number
  queued: number
  failed: number
}

interface CampaignHistoryEntry {
  id: string
  mode: 'test' | 'send'
  subject: string
  createdAt: string
  sentCount?: number
  deliverableCount?: number
  skippedCount?: number
  failedCount?: number
  sentTo?: string
}

const DRAFT_STORAGE_KEY = 'ducksat-admin-email-campaign-draft-v1'
const HISTORY_STORAGE_KEY = 'ducksat-admin-email-campaign-history-v1'

const DEFAULT_CAMPAIGN_DRAFT: CampaignDraft = {
  search: '',
  plan: 'all',
  joinedViaQr: false,
  includeTesters: false,
  selectedTemplateId: '',
  promoCode: '',
  subject: 'DuckSAT update for {{firstName}}',
  previewText: 'A quick update from DuckSAT.',
  eyebrow: 'DuckSAT update',
  headline: 'Keep your SAT prep moving',
  body:
    'Hi {{firstName}},\n\nWe are building more tools to help you improve your SAT score with focused practice and smarter review.\n\nThanks for being part of DuckSAT.',
  primaryButtonLabel: 'Open DuckSAT',
  primaryButtonUrl: 'https://www.ducksat.com',
  secondaryButtonLabel: 'View Pricing',
  secondaryButtonUrl: 'https://www.ducksat.com/pricing',
  footer: 'You are receiving this email from DuckSAT.',
  testEmail: '',
}

function skipReasonLabel(skipReason: string | null) {
  if (skipReason === 'synthetic_credentials_email') {
    return 'Synthetic DuckSAT credentials email'
  }

  if (skipReason === 'unsubscribed') {
    return 'User unsubscribed'
  }

  return skipReason || 'Deliverable'
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'Not saved yet'
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export default function AdminEmailCampaignsPage() {
  const [search, setSearch] = useState(DEFAULT_CAMPAIGN_DRAFT.search)
  const [plan, setPlan] = useState<PlanFilter>(DEFAULT_CAMPAIGN_DRAFT.plan)
  const [joinedViaQr, setJoinedViaQr] = useState(DEFAULT_CAMPAIGN_DRAFT.joinedViaQr)
  const [includeTesters, setIncludeTesters] = useState(DEFAULT_CAMPAIGN_DRAFT.includeTesters)
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_CAMPAIGN_DRAFT.selectedTemplateId)
  const [promoCode, setPromoCode] = useState(DEFAULT_CAMPAIGN_DRAFT.promoCode)
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([])
  const [inboundEmails, setInboundEmails] = useState<InboundEmailListItem[]>([])
  const [templateLoading, setTemplateLoading] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [promoCodesLoading, setPromoCodesLoading] = useState(true)
  const [promoCodesError, setPromoCodesError] = useState<string | null>(null)
  const [inboundLoading, setInboundLoading] = useState(true)
  const [inboundError, setInboundError] = useState<string | null>(null)
  const [deliveryActivity, setDeliveryActivity] = useState<EmailActivityDeliveryItem[]>([])
  const [deliverySummary, setDeliverySummary] = useState<EmailActivitySummary>({ total: 0, sent: 0, queued: 0, failed: 0 })
  const [deliveryLoading, setDeliveryLoading] = useState(true)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [audience, setAudience] = useState<AudienceResponse | null>(null)
  const [audienceLoading, setAudienceLoading] = useState(true)
  const [audienceError, setAudienceError] = useState<string | null>(null)

  const [subject, setSubject] = useState(DEFAULT_CAMPAIGN_DRAFT.subject)
  const [previewText, setPreviewText] = useState(DEFAULT_CAMPAIGN_DRAFT.previewText)
  const [eyebrow, setEyebrow] = useState(DEFAULT_CAMPAIGN_DRAFT.eyebrow)
  const [headline, setHeadline] = useState(DEFAULT_CAMPAIGN_DRAFT.headline)
  const [body, setBody] = useState(DEFAULT_CAMPAIGN_DRAFT.body)
  const [primaryButtonLabel, setPrimaryButtonLabel] = useState(DEFAULT_CAMPAIGN_DRAFT.primaryButtonLabel)
  const [primaryButtonUrl, setPrimaryButtonUrl] = useState(DEFAULT_CAMPAIGN_DRAFT.primaryButtonUrl)
  const [secondaryButtonLabel, setSecondaryButtonLabel] = useState(DEFAULT_CAMPAIGN_DRAFT.secondaryButtonLabel)
  const [secondaryButtonUrl, setSecondaryButtonUrl] = useState(DEFAULT_CAMPAIGN_DRAFT.secondaryButtonUrl)
  const [footer, setFooter] = useState(DEFAULT_CAMPAIGN_DRAFT.footer)
  const [testEmail, setTestEmail] = useState(DEFAULT_CAMPAIGN_DRAFT.testEmail)

  const [sending, setSending] = useState<'test' | 'send' | null>(null)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [history, setHistory] = useState<CampaignHistoryEntry[]>([])

  useEffect(() => {
    const storedDraft = readStoredJson<CampaignDraft | null>(DRAFT_STORAGE_KEY, null)
    const storedHistory = readStoredJson<CampaignHistoryEntry[]>(HISTORY_STORAGE_KEY, [])

    if (storedDraft) {
      setSearch(storedDraft.search)
      setPlan(storedDraft.plan)
      setJoinedViaQr(storedDraft.joinedViaQr)
      setIncludeTesters(storedDraft.includeTesters)
      setSelectedTemplateId(storedDraft.selectedTemplateId || '')
      setPromoCode(storedDraft.promoCode || '')
      setSubject(storedDraft.subject)
      setPreviewText(storedDraft.previewText)
      setEyebrow(storedDraft.eyebrow)
      setHeadline(storedDraft.headline)
      setBody(storedDraft.body)
      setPrimaryButtonLabel(storedDraft.primaryButtonLabel)
      setPrimaryButtonUrl(storedDraft.primaryButtonUrl)
      setSecondaryButtonLabel(storedDraft.secondaryButtonLabel)
      setSecondaryButtonUrl(storedDraft.secondaryButtonUrl)
      setFooter(storedDraft.footer)
      setTestEmail(storedDraft.testEmail)
      setDraftSavedAt(storedDraft.savedAt || null)
    }

    setHistory(storedHistory)
    setDraftLoaded(true)
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function fetchPromoCodes() {
      try {
        setPromoCodesLoading(true)
        const response = await fetch('/api/admin/promo-codes')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load coupon codes')
        }

        if (!isCancelled) {
          setPromoCodes(data.promoCodes as PromoCodeRecord[])
          setPromoCodesError(null)
        }
      } catch (error) {
        if (!isCancelled) {
          setPromoCodesError(error instanceof Error ? error.message : 'Failed to load coupon codes')
          setPromoCodes([])
        }
      } finally {
        if (!isCancelled) {
          setPromoCodesLoading(false)
        }
      }
    }

    fetchPromoCodes()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function fetchDeliveryActivity() {
      try {
        setDeliveryLoading(true)
        const response = await fetch('/api/admin/email-activity?limit=8')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load send activity')
        }

        if (!isCancelled) {
          setDeliveryActivity(data.deliveries as EmailActivityDeliveryItem[])
          setDeliverySummary(data.summary as EmailActivitySummary)
          setDeliveryError(null)
        }
      } catch (error) {
        if (!isCancelled) {
          setDeliveryError(error instanceof Error ? error.message : 'Failed to load send activity')
          setDeliveryActivity([])
          setDeliverySummary({ total: 0, sent: 0, queued: 0, failed: 0 })
        }
      } finally {
        if (!isCancelled) {
          setDeliveryLoading(false)
        }
      }
    }

    fetchDeliveryActivity()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function fetchInboundEmails() {
      try {
        setInboundLoading(true)
        const response = await fetch('/api/admin/inbound-emails?limit=6')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load inbound inbox')
        }

        if (!isCancelled) {
          setInboundEmails(data.emails as InboundEmailListItem[])
          setInboundError(null)
        }
      } catch (error) {
        if (!isCancelled) {
          setInboundError(error instanceof Error ? error.message : 'Failed to load inbound inbox')
          setInboundEmails([])
        }
      } finally {
        if (!isCancelled) {
          setInboundLoading(false)
        }
      }
    }

    fetchInboundEmails()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function fetchTemplates() {
      try {
        setTemplateLoading(true)
        const response = await fetch('/api/admin/email-templates')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load templates')
        }

        if (!isCancelled) {
          setTemplates(data.templates as EmailTemplateRecord[])
          setTemplateError(null)
        }
      } catch (error) {
        if (!isCancelled) {
          setTemplateError(error instanceof Error ? error.message : 'Failed to load templates')
          setTemplates([])
        }
      } finally {
        if (!isCancelled) {
          setTemplateLoading(false)
        }
      }
    }

    fetchTemplates()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draftLoaded || typeof window === 'undefined') {
      return
    }

    const savedAt = new Date().toISOString()
    const draft: CampaignDraft = {
      search,
      plan,
      joinedViaQr,
      includeTesters,
      selectedTemplateId,
      promoCode,
      subject,
      previewText,
      eyebrow,
      headline,
      body,
      primaryButtonLabel,
      primaryButtonUrl,
      secondaryButtonLabel,
      secondaryButtonUrl,
      footer,
      testEmail,
      savedAt,
    }

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    setDraftSavedAt(savedAt)
  }, [
    body,
    draftLoaded,
    eyebrow,
    footer,
    headline,
    includeTesters,
    joinedViaQr,
    plan,
    previewText,
    primaryButtonLabel,
    primaryButtonUrl,
    promoCode,
    search,
    selectedTemplateId,
    secondaryButtonLabel,
    secondaryButtonUrl,
    subject,
    testEmail,
  ])

  const audienceQuery = useMemo(() => {
    const params = new URLSearchParams({
      plan,
      includeTesters: String(includeTesters),
      joinedViaQr: String(joinedViaQr),
    })

    if (search.trim()) {
      params.set('search', search.trim())
    }

    return params.toString()
  }, [includeTesters, joinedViaQr, plan, search])

  const requestPayload = useMemo(
    () => ({
      filters: {
        search: search.trim() || undefined,
        plan,
        joinedViaQr,
        includeTesters,
      },
      promoCode,
      subject,
      previewText,
      eyebrow,
      headline,
      body,
      primaryButtonLabel,
      primaryButtonUrl,
      secondaryButtonLabel,
      secondaryButtonUrl,
      footer,
    }),
    [
      body,
      eyebrow,
      footer,
      headline,
      includeTesters,
      joinedViaQr,
      plan,
      previewText,
      primaryButtonLabel,
      primaryButtonUrl,
      promoCode,
      search,
      secondaryButtonLabel,
      secondaryButtonUrl,
      subject,
    ],
  )

  useEffect(() => {
    let isCancelled = false

    async function fetchAudience() {
      try {
        setAudienceLoading(true)
        const response = await fetch(`/api/admin/email-campaigns/audience?${audienceQuery}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load audience')
        }

        if (!isCancelled) {
          setAudience(data)
          setAudienceError(null)
        }
      } catch (error) {
        if (!isCancelled) {
          setAudienceError(error instanceof Error ? error.message : 'Failed to load audience')
          setAudience(null)
        }
      } finally {
        if (!isCancelled) {
          setAudienceLoading(false)
        }
      }
    }

    fetchAudience()

    return () => {
      isCancelled = true
    }
  }, [audienceQuery])

  useEffect(() => {
    if (!draftLoaded) {
      return
    }

    let isCancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const response = await fetch('/api/admin/email-campaigns/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to render preview')
        }

        if (!isCancelled) {
          setPreview(data)
          setPreviewError(null)
        }
      } catch (error) {
        if (!isCancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Failed to render preview')
          setPreview(null)
        }
      } finally {
        if (!isCancelled) {
          setPreviewLoading(false)
        }
      }
    }, 250)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [draftLoaded, requestPayload])

  function resetDraft() {
    setSearch(DEFAULT_CAMPAIGN_DRAFT.search)
    setPlan(DEFAULT_CAMPAIGN_DRAFT.plan)
    setJoinedViaQr(DEFAULT_CAMPAIGN_DRAFT.joinedViaQr)
    setIncludeTesters(DEFAULT_CAMPAIGN_DRAFT.includeTesters)
    setSelectedTemplateId(DEFAULT_CAMPAIGN_DRAFT.selectedTemplateId)
    setPromoCode(DEFAULT_CAMPAIGN_DRAFT.promoCode)
    setSubject(DEFAULT_CAMPAIGN_DRAFT.subject)
    setPreviewText(DEFAULT_CAMPAIGN_DRAFT.previewText)
    setEyebrow(DEFAULT_CAMPAIGN_DRAFT.eyebrow)
    setHeadline(DEFAULT_CAMPAIGN_DRAFT.headline)
    setBody(DEFAULT_CAMPAIGN_DRAFT.body)
    setPrimaryButtonLabel(DEFAULT_CAMPAIGN_DRAFT.primaryButtonLabel)
    setPrimaryButtonUrl(DEFAULT_CAMPAIGN_DRAFT.primaryButtonUrl)
    setSecondaryButtonLabel(DEFAULT_CAMPAIGN_DRAFT.secondaryButtonLabel)
    setSecondaryButtonUrl(DEFAULT_CAMPAIGN_DRAFT.secondaryButtonUrl)
    setFooter(DEFAULT_CAMPAIGN_DRAFT.footer)
    setTestEmail(DEFAULT_CAMPAIGN_DRAFT.testEmail)
    setSendResult(null)

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
  }

  function applyTemplate(template: EmailTemplateRecord) {
    setSelectedTemplateId(template.id)
    setPromoCode(template.promoCode || '')
    setSubject(template.subject)
    setPreviewText(template.previewText || '')
    setEyebrow(template.eyebrow || '')
    setHeadline(template.headline || '')
    setBody(template.body)
    setPrimaryButtonLabel(template.primaryButtonLabel || '')
    setPrimaryButtonUrl(template.primaryButtonUrl || '')
    setSecondaryButtonLabel(template.secondaryButtonLabel || '')
    setSecondaryButtonUrl(template.secondaryButtonUrl || '')
    setFooter(template.footer || 'You are receiving this email from DuckSAT.')
    setSendResult(null)
  }

  function clearHistory() {
    setHistory([])

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY)
    }
  }

  async function submit(mode: 'test' | 'send') {
    try {
      setSending(mode)
      setSendResult(null)

      const response = await fetch('/api/admin/email-campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          testEmail,
          ...requestPayload,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setSendResult(data)
      setHistory((current) => {
        const next = [
          {
            id: `${mode}-${Date.now()}`,
            mode,
            subject,
            createdAt: new Date().toISOString(),
            sentCount: data.sentCount,
            deliverableCount: data.deliverableCount,
            skippedCount: data.skippedCount,
            failedCount: data.failedCount,
            sentTo: data.sentTo,
          },
          ...current,
        ].slice(0, 12)

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
        }

        return next
      })
    } catch (error) {
      setSendResult({ error: error instanceof Error ? error.message : 'Request failed' })
    } finally {
      setSending(null)
    }
  }

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null
  const activeSelectablePromoCodes = promoCodes.filter((definition) => definition.isActive && definition.emailSelectable)
  const selectedPromo = promoCodes.find((definition) => definition.code === promoCode) || null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_45%,#e2e8f0_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EmailWorkspaceNav
          active="operations"
          title="Send emails and track activity"
          description="Use this page for audience sends, outbound activity, and recent inbound inbox visibility. Build coupons and reusable templates on the create-email page first."
        />

        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Send + Track</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Send saved emails and watch the mailbox</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-600">
                This page is for operational work: choose the audience, send a test or live blast, review recent outbound activity, and keep the inbound inbox visible.
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <Link href="/admin/email-create" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Create email
              </Link>
              <Link href="/admin/email-automations" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Assign triggers
              </Link>
              <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <div className="font-semibold">Resend config</div>
                <div>Set <span className="font-mono">RESEND_API_KEY</span>, <span className="font-mono">RESEND_FROM_EMAIL</span>, <span className="font-mono">RESEND_REPLY_TO_EMAIL</span>, and <span className="font-mono">RESEND_WEBHOOK_SECRET</span>.</div>
                <div className="mt-2 text-xs text-amber-800">Draft autosave: {formatTimestamp(draftSavedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recent inbound inbox</h2>
              <p className="text-sm text-slate-500">Emails sent to DuckSAT addresses appear here after Resend posts the inbound webhook.</p>
            </div>
            <Link href="/admin/inbound-emails" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              View full inbox
            </Link>
          </div>

          {inboundError ? (
            <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{inboundError}</div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Stored messages</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{inboundEmails.length}</div>
            </div>
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Forwarded</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{inboundEmails.filter((email) => email.forwardStatus === 'forwarded').length}</div>
            </div>
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Failed forwards</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{inboundEmails.filter((email) => email.forwardStatus === 'forward_failed').length}</div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[1.15fr_1.1fr_0.85fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              <div>From</div>
              <div>Subject</div>
              <div>Status</div>
              <div>Received</div>
            </div>

            {inboundLoading ? (
              <div className="px-4 py-8 text-sm text-slate-500">Loading inbox…</div>
            ) : inboundEmails.length ? (
              <div className="divide-y divide-slate-100">
                {inboundEmails.map((email) => (
                  <Link key={email.id} href="/admin/inbound-emails" className="grid grid-cols-[1.15fr_1.1fr_0.85fr_0.9fr] gap-4 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50">
                    <div>
                      <div className="font-semibold text-slate-900">{email.fromEmail}</div>
                      <div className="mt-1 text-xs text-slate-500">{email.toEmails.join(', ')}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{email.subject || '(No subject)'}</div>
                      <div className="mt-1 text-xs text-slate-500">{email.preview}</div>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${email.forwardStatus === 'forwarded' ? 'bg-emerald-100 text-emerald-700' : email.forwardStatus === 'forward_failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {email.forwardStatus === 'forwarded' ? 'Forwarded' : email.forwardStatus === 'forward_failed' ? 'Forward failed' : 'Pending'}
                      </span>
                    </div>
                    <div className="text-slate-600">{formatTimestamp(email.receivedAt)}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-500">
                No inbound emails captured yet. If you already sent a test message, verify Resend is posting to <span className="font-semibold text-slate-900">/api/resend/inbound</span> for your receiving domain.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recent send activity</h2>
              <p className="text-sm text-slate-500">Server-side automation deliveries are tracked here. Manual campaign history still appears lower on this page in browser-local storage.</p>
            </div>
            <Link href="/admin/email-automations" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              Manage trigger sends
            </Link>
          </div>

          {deliveryError ? (
            <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{deliveryError}</div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Tracked</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{deliverySummary.total}</div>
            </div>
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Sent</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{deliverySummary.sent}</div>
            </div>
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Queued</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{deliverySummary.queued}</div>
            </div>
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Failed</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{deliverySummary.failed}</div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[1.1fr_0.95fr_0.8fr_0.9fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              <div>Automation</div>
              <div>Recipient</div>
              <div>Status</div>
              <div>Created</div>
            </div>

            {deliveryLoading ? (
              <div className="px-4 py-8 text-sm text-slate-500">Loading send activity…</div>
            ) : deliveryActivity.length ? (
              <div className="divide-y divide-slate-100">
                {deliveryActivity.map((delivery) => (
                  <div key={delivery.id} className="grid grid-cols-[1.1fr_0.95fr_0.8fr_0.9fr] gap-4 px-4 py-4 text-sm text-slate-700">
                    <div>
                      <div className="font-semibold text-slate-900">{delivery.automationName}</div>
                      <div className="mt-1 text-xs text-slate-500">{delivery.triggerType.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="break-all text-slate-600">{delivery.email}</div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${delivery.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : delivery.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {delivery.status}
                      </span>
                      {delivery.error ? <div className="mt-2 text-xs text-rose-600">{delivery.error}</div> : null}
                    </div>
                    <div className="text-slate-600">{formatTimestamp(delivery.sentAt || delivery.createdAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-500">No server-side automation sends recorded yet.</div>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Audience</h2>
                <p className="text-sm text-slate-500">Filter the DuckSAT user list and preview who can actually receive email.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Search
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="name, username, or email"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Plan
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value as PlanFilter)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500"
                >
                  <option value="all">All users</option>
                  <option value="free">Free users</option>
                  <option value="paid">Paid active users</option>
                  <option value="monthly">Monthly plan</option>
                  <option value="yearly">Yearly plan</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={joinedViaQr} onChange={(event) => setJoinedViaQr(event.target.checked)} />
                Only QR signups
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={includeTesters} onChange={(event) => setIncludeTesters(event.target.checked)} />
                Include testers
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Matched users', value: audience?.matchedCount ?? '—', tone: 'from-slate-50 to-slate-100 border-slate-200' },
                { label: 'Deliverable now', value: audience?.deliverableCount ?? '—', tone: 'from-teal-50 to-cyan-50 border-teal-200' },
                { label: 'Skipped', value: audience?.skippedCount ?? '—', tone: 'from-rose-50 to-orange-50 border-rose-200' },
              ].map((card) => (
                <div key={card.label} className={`rounded-3xl border bg-gradient-to-br ${card.tone} p-5`}>
                  <div className="text-sm font-semibold text-slate-600">{card.label}</div>
                  <div className="mt-2 text-3xl font-black text-slate-900">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[1.4fr_1.1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                <div>User</div>
                <div>Email</div>
                <div>Status</div>
              </div>

              {audienceLoading ? (
                <div className="px-4 py-8 text-sm text-slate-500">Loading audience preview…</div>
              ) : audienceError ? (
                <div className="px-4 py-8 text-sm text-rose-600">{audienceError}</div>
              ) : audience?.sample.length ? (
                <div className="divide-y divide-slate-100">
                  {audience.sample.map((recipient) => (
                    <div key={recipient.id} className="grid grid-cols-[1.4fr_1.1fr_1fr] gap-4 px-4 py-4 text-sm text-slate-700">
                      <div>
                        <div className="font-semibold text-slate-900">{recipient.name || recipient.username || 'Unnamed user'}</div>
                        <div className="text-xs text-slate-500">
                          {recipient.subscriptionPlan} • {recipient.subscriptionStatus}
                          {recipient.joinedViaQrCode ? ' • QR signup' : ''}
                          {recipient.isTester ? ' • tester' : ''}
                        </div>
                      </div>
                      <div className="break-all text-slate-600">{recipient.deliverableEmail || recipient.email}</div>
                      <div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${recipient.isDeliverable ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-700'}`}>
                          {skipReasonLabel(recipient.skipReason)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-sm text-slate-500">No users matched this audience.</div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-bold text-slate-900">Composer</h2>
              <p className="mt-1 text-sm text-slate-500">
                Personalize with tokens like {'{{firstName}}'}, {'{{name}}'}, {'{{plan}}'}, {'{{email}}'}, {'{{promoCode}}'}, and {'{{promoRedeemUrl}}'}.
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-cyan-200 bg-cyan-50/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Saved template</div>
                      <p className="mt-1 text-sm text-slate-600">Load any reusable email and send it manually to the audience on this page.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/admin/email-create" className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
                        Create email
                      </Link>
                      <Link href="/admin/email-create#coupon-manager" className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
                        Manage coupons
                      </Link>
                      {selectedTemplateId ? (
                        <button
                          onClick={() => setSelectedTemplateId('')}
                          className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
                        >
                          Clear selection
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                    <label className="block space-y-2 text-sm font-semibold text-slate-700">
                      Choose template
                      <select
                        value={selectedTemplateId}
                        onChange={(event) => {
                          const nextTemplateId = event.target.value
                          if (!nextTemplateId) {
                            setSelectedTemplateId('')
                            return
                          }

                          const template = templates.find((item) => item.id === nextTemplateId)
                          if (template) {
                            applyTemplate(template)
                          }
                        }}
                        className="w-full rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-500"
                      >
                        <option value="">No saved template selected</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-[22px] border border-cyan-200 bg-white px-4 py-4 text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">Library status</div>
                      <div className="mt-2">{templateLoading ? 'Loading templates…' : `${templates.length} reusable templates available.`}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {selectedTemplate ? `Selected: ${selectedTemplate.name}` : 'No template selected'}
                      </div>
                    </div>
                  </div>

                  {templateError ? (
                    <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{templateError}</div>
                  ) : null}

                  {selectedTemplate?.description ? (
                    <div className="mt-4 rounded-[22px] border border-cyan-200 bg-white px-4 py-4 text-sm text-slate-700">
                      {selectedTemplate.description}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Coupon offer</div>
                    <p className="mt-1 text-sm text-slate-600">Pick any active email coupon to append a redeem block to the email automatically.</p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                    <label className="block space-y-2 text-sm font-semibold text-slate-700">
                      Promo code
                      <select
                        value={promoCode}
                        onChange={(event) => setPromoCode(event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500"
                      >
                        <option value="">No coupon in this email</option>
                        {activeSelectablePromoCodes.map((definition) => (
                          <option key={definition.id} value={definition.code}>
                            {definition.code} - {definition.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-[22px] border border-emerald-200 bg-white px-4 py-4 text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">Offer preview</div>
                      <div className="mt-2">{selectedPromo ? selectedPromo.label : 'No promo selected'}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {selectedPromo ? selectedPromo.code : 'Coupon block disabled'}
                      </div>
                    </div>
                  </div>

                  {selectedPromo ? (
                    <div className="mt-4 rounded-[22px] border border-emerald-200 bg-white px-4 py-4 text-sm text-slate-700">
                      {selectedPromo.description}
                    </div>
                  ) : null}

                  {promoCodesError ? (
                    <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{promoCodesError}</div>
                  ) : null}

                  <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {promoCodesLoading ? 'Loading coupons…' : `${activeSelectablePromoCodes.length} active email coupon${activeSelectablePromoCodes.length === 1 ? '' : 's'} available`}
                  </div>
                </div>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Subject
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                </label>
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Preview text
                  <input value={previewText} onChange={(event) => setPreviewText(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Eyebrow
                    <input value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Headline
                    <input value={headline} onChange={(event) => setHeadline(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                  </label>
                </div>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Body
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-teal-500" />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Primary button label
                    <input value={primaryButtonLabel} onChange={(event) => setPrimaryButtonLabel(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Primary button URL
                    <input value={primaryButtonUrl} onChange={(event) => setPrimaryButtonUrl(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Secondary button label
                    <input value={secondaryButtonLabel} onChange={(event) => setSecondaryButtonLabel(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Secondary button URL
                    <input value={secondaryButtonUrl} onChange={(event) => setSecondaryButtonUrl(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                  </label>
                </div>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Footer
                  <textarea value={footer} onChange={(event) => setFooter(event.target.value)} rows={3} className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-teal-500" />
                </label>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Test email
                  <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-teal-500" />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => submit('test')}
                  disabled={sending !== null}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending === 'test' ? 'Sending test…' : 'Send test email'}
                </button>
                <button
                  onClick={() => submit('send')}
                  disabled={sending !== null || !audience?.deliverableCount}
                  className="rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending === 'send' ? 'Sending campaign…' : 'Send to audience'}
                </button>
                <button
                  onClick={resetDraft}
                  disabled={sending !== null}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset local draft
                </button>
              </div>

              {sendResult?.error ? (
                <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{sendResult.error}</div>
              ) : null}

              {sendResult?.success ? (
                <div className="mt-4 rounded-3xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  {'sentTo' in sendResult && sendResult.sentTo
                    ? `Test email sent to ${sendResult.sentTo}.`
                    : `Campaign sent to ${sendResult.sentCount} deliverable users. ${sendResult.skippedCount} users were skipped.${sendResult.failedCount ? ` ${sendResult.failedCount} recipients failed and need attention.` : ''}`}
                </div>
              ) : null}

              {sendResult?.success && sendResult.failedCount ? (
                <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="font-semibold">Some recipients were not accepted by Resend.</div>
                  <div className="mt-2 space-y-1">
                    {(sendResult.failedRecipients || []).map((recipient) => (
                      <div key={`${recipient.to}-${recipient.error}`} className="break-all">
                        {recipient.to}: {recipient.error}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Rendered preview</h2>
                  <p className="text-sm text-slate-500">This uses the same server-side renderer as the real send flow.</p>
                </div>
                {preview ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Previewing as {preview.previewRecipient.name}</div>
                    <div>{preview.previewRecipient.email}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{preview.previewRecipient.plan} plan</div>
                  </div>
                ) : null}
              </div>

              {previewLoading ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Rendering preview…</div>
              ) : previewError ? (
                <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">{previewError}</div>
              ) : preview ? (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-4">
                    {[
                      { label: 'Preview subject', value: preview.subject, tone: 'from-slate-50 to-slate-100 border-slate-200' },
                      { label: 'Matched', value: String(preview.matchedCount), tone: 'from-blue-50 to-cyan-50 border-blue-200' },
                      { label: 'Deliverable', value: String(preview.deliverableCount), tone: 'from-teal-50 to-cyan-50 border-teal-200' },
                      { label: 'Skipped', value: String(preview.skippedCount), tone: 'from-rose-50 to-orange-50 border-rose-200' },
                    ].map((card) => (
                      <div key={card.label} className={`rounded-3xl border bg-gradient-to-br ${card.tone} p-4`}>
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{card.label}</div>
                        <div className="mt-3 text-sm font-semibold text-slate-900">{card.value}</div>
                      </div>
                    ))}
                  </div>

                  {preview.usedFallbackRecipient ? (
                    <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      No deliverable recipient was available for token preview, so the preview is using a fallback DuckSAT sample contact.
                    </div>
                  ) : null}

                  <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                    <iframe
                      title="Campaign preview"
                      srcDoc={preview.html}
                      className="h-[680px] w-full bg-white"
                    />
                  </div>

                  <details className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">View plain-text version</summary>
                    <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{preview.text}</pre>
                  </details>
                </>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Local history</h2>
                  <p className="text-sm text-slate-500">Stored in this browser only until database-backed campaign history is added.</p>
                </div>
                <button
                  onClick={clearHistory}
                  disabled={!history.length}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear history
                </button>
              </div>

              {history.length ? (
                <div className="mt-5 space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{entry.subject}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.mode} • {formatTimestamp(entry.createdAt)}</div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {entry.sentTo
                            ? `Sent test to ${entry.sentTo}`
                            : `Sent ${entry.sentCount || 0} • deliverable ${entry.deliverableCount || 0} • skipped ${entry.skippedCount || 0}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No local send history yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}