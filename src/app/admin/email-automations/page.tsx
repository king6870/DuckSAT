"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import EmailWorkspaceNav from '@/components/admin/EmailWorkspaceNav'

type PromoCodeEffectType = 'tester_access' | 'bonus_practice_tests'

type TriggerType = 'user_event' | 'page_dwell' | 'drill_completed' | 'practice_test_completed'

interface TriggerFiltersDraft {
  userId: string
  userEmail: string
  eventType: string
  eventName: string
  pagePath: string
  minDwellTimeMs: string
  maxDwellTimeMs: string
  category: string
  moduleType: string
  difficulty: string
  minScore: string
  practiceTestId: string
  metadataKey: string
  metadataValue: string
}

interface AutomationDraft {
  id?: string
  name: string
  description: string
  isActive: boolean
  triggerType: TriggerType
  triggerFilters: TriggerFiltersDraft
  templateId: string
  aiPrompt: string
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
  createdAt?: string
  updatedAt?: string
}

interface AutomationRecord {
  id: string
  name: string
  description?: string
  isActive: boolean
  triggerType: TriggerType
  triggerFilters?: Partial<TriggerFiltersDraft>
  templateId?: string
  template?: {
    id: string
    name: string
  }
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
  createdAt: string
  updatedAt: string
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
  updatedAt: string
}

interface PromoCodeDraft {
  id?: string
  code: string
  label: string
  description: string
  effectType: PromoCodeEffectType
  bonusPracticeTests: string
  successMessage: string
  emailSelectable: boolean
  isActive: boolean
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

const EMPTY_TRIGGER_FILTERS: TriggerFiltersDraft = {
  userId: '',
  userEmail: '',
  eventType: 'session',
  eventName: 'login',
  pagePath: '',
  minDwellTimeMs: '',
  maxDwellTimeMs: '',
  category: '',
  moduleType: '',
  difficulty: '',
  minScore: '',
  practiceTestId: '',
  metadataKey: '',
  metadataValue: '',
}

const DEFAULT_DRAFT: AutomationDraft = {
  name: 'Homepage bounce follow-up',
  description: 'Send a follow-up email after a user spends time on the homepage and leaves.',
  isActive: true,
  triggerType: 'page_dwell',
  triggerFilters: {
    ...EMPTY_TRIGGER_FILTERS,
    pagePath: '/',
    minDwellTimeMs: '15000',
  },
  templateId: '',
  aiPrompt: '',
  promoCode: '',
  subject: 'Still thinking about your SAT prep, {{firstName}}?',
  previewText: 'DuckSAT can help you turn intent into actual score gains.',
  eyebrow: 'Behavior-triggered email',
  headline: 'Pick back up where you left off',
  body:
    'Hi {{firstName}},\n\nYou spent time inside DuckSAT, which tells me you are serious about improving. The fastest way to turn that momentum into score growth is to come back for one focused session today.\n\nOpen DuckSAT, do one drill, and keep the streak moving.',
  primaryButtonLabel: 'Open DuckSAT',
  primaryButtonUrl: 'https://www.ducksat.com',
  secondaryButtonLabel: 'View Pricing',
  secondaryButtonUrl: 'https://www.ducksat.com/pricing',
  footer: 'You are receiving this email from DuckSAT.',
}

const DEFAULT_PROMO_CODE_DRAFT: PromoCodeDraft = {
  code: '',
  label: '1 Extra SAT Practice Test',
  description: 'Redeem on DuckSAT pricing to unlock 1 extra SAT practice test this month.',
  effectType: 'bonus_practice_tests',
  bonusPracticeTests: '1',
  successMessage: 'Promo code applied! You now have 1 extra SAT practice test available this month.',
  emailSelectable: true,
  isActive: true,
}

function formatTimestamp(value?: string) {
  if (!value) return 'Not saved yet'

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function triggerLabel(triggerType: TriggerType) {
  switch (triggerType) {
    case 'user_event':
      return 'User event'
    case 'page_dwell':
      return 'Page dwell'
    case 'drill_completed':
      return 'Drill completed'
    case 'practice_test_completed':
      return 'Practice test completed'
    default:
      return triggerType
  }
}

function toDraft(record: AutomationRecord): AutomationDraft {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    isActive: record.isActive,
    triggerType: record.triggerType,
    triggerFilters: {
      ...EMPTY_TRIGGER_FILTERS,
      ...record.triggerFilters,
      minDwellTimeMs: record.triggerFilters?.minDwellTimeMs ? String(record.triggerFilters.minDwellTimeMs) : '',
      maxDwellTimeMs: record.triggerFilters?.maxDwellTimeMs ? String(record.triggerFilters.maxDwellTimeMs) : '',
      minScore: record.triggerFilters?.minScore ? String(record.triggerFilters.minScore) : '',
    },
    templateId: record.templateId || record.template?.id || '',
    aiPrompt: record.aiPrompt || '',
    promoCode: record.promoCode || '',
    subject: record.subject,
    previewText: record.previewText || '',
    eyebrow: record.eyebrow || '',
    headline: record.headline || '',
    body: record.body,
    primaryButtonLabel: record.primaryButtonLabel || '',
    primaryButtonUrl: record.primaryButtonUrl || '',
    secondaryButtonLabel: record.secondaryButtonLabel || '',
    secondaryButtonUrl: record.secondaryButtonUrl || '',
    footer: record.footer || 'You are receiving this email from DuckSAT.',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function buildPayload(draft: AutomationDraft) {
  const triggerFilters = Object.fromEntries(
    Object.entries(draft.triggerFilters).filter(([, value]) => String(value).trim() !== ''),
  )

  return {
    name: draft.name,
    description: draft.description,
    isActive: draft.isActive,
    triggerType: draft.triggerType,
    triggerFilters,
    templateId: draft.templateId || undefined,
    aiPrompt: draft.aiPrompt,
    promoCode: draft.promoCode || undefined,
    subject: draft.subject,
    previewText: draft.previewText,
    eyebrow: draft.eyebrow,
    headline: draft.headline,
    body: draft.body,
    primaryButtonLabel: draft.primaryButtonLabel,
    primaryButtonUrl: draft.primaryButtonUrl,
    secondaryButtonLabel: draft.secondaryButtonLabel,
    secondaryButtonUrl: draft.secondaryButtonUrl,
    footer: draft.footer,
  }
}

function toPromoDraft(record: PromoCodeRecord): PromoCodeDraft {
  return {
    id: record.id,
    code: record.code,
    label: record.label,
    description: record.description,
    effectType: record.effectType,
    bonusPracticeTests: record.bonusPracticeTests ? String(record.bonusPracticeTests) : '1',
    successMessage: record.successMessage,
    emailSelectable: record.emailSelectable,
    isActive: record.isActive,
  }
}

export default function AdminEmailAutomationsPage() {
  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([])
  const [draft, setDraft] = useState<AutomationDraft>(DEFAULT_DRAFT)
  const [promoDraft, setPromoDraft] = useState<PromoCodeDraft>(DEFAULT_PROMO_CODE_DRAFT)
  const [loading, setLoading] = useState(true)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [promoCodesLoading, setPromoCodesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [promoCodeSaving, setPromoCodeSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)

  async function loadAutomations(selectedId?: string) {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-automations')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load automations')
      }

      const nextAutomations = data.automations as AutomationRecord[]
      setAutomations(nextAutomations)
      setPageError(null)

      if (selectedId) {
        const selected = nextAutomations.find((automation) => automation.id === selectedId)
        if (selected) {
          setDraft(toDraft(selected))
        }
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  async function loadTemplates() {
    try {
      setTemplateLoading(true)
      const response = await fetch('/api/admin/email-templates')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load templates')
      }

      setTemplates(data.templates as EmailTemplateRecord[])
      setPageError(null)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load templates')
    } finally {
      setTemplateLoading(false)
    }
  }

  async function loadPromoCodes(selectedId?: string) {
    try {
      setPromoCodesLoading(true)
      const response = await fetch('/api/admin/promo-codes')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load promo codes')
      }

      const nextPromoCodes = data.promoCodes as PromoCodeRecord[]
      setPromoCodes(nextPromoCodes)
      setPageError(null)

      if (selectedId) {
        const selected = nextPromoCodes.find((promoCode) => promoCode.id === selectedId)
        if (selected) {
          setPromoDraft(toPromoDraft(selected))
        }
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load promo codes')
    } finally {
      setPromoCodesLoading(false)
    }
  }

  useEffect(() => {
    loadAutomations()
    loadTemplates()
    loadPromoCodes()
  }, [])

  useEffect(() => {
    let isCancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const response = await fetch('/api/admin/email-campaigns/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promoCode: draft.promoCode || undefined,
            subject: draft.subject,
            previewText: draft.previewText,
            eyebrow: draft.eyebrow,
            headline: draft.headline,
            body: draft.body,
            primaryButtonLabel: draft.primaryButtonLabel,
            primaryButtonUrl: draft.primaryButtonUrl,
            secondaryButtonLabel: draft.secondaryButtonLabel,
            secondaryButtonUrl: draft.secondaryButtonUrl,
            footer: draft.footer,
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to render preview')
        }

        if (!isCancelled) {
          setPreview(data)
        }
      } catch (error) {
        if (!isCancelled) {
          setPageError(error instanceof Error ? error.message : 'Failed to render preview')
          setPreview(null)
        }
      } finally {
        if (!isCancelled) {
          setPreviewLoading(false)
        }
      }
    }, 300)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [draft])

  function selectAutomation(record: AutomationRecord) {
    setDraft(toDraft(record))
    setSaveMessage(null)
  }

  function updateField<Key extends keyof AutomationDraft>(key: Key, value: AutomationDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateTriggerFilter(key: keyof TriggerFiltersDraft, value: string) {
    setDraft((current) => ({
      ...current,
      triggerFilters: {
        ...current.triggerFilters,
        [key]: value,
      },
    }))
  }

  function updatePromoDraftField<Key extends keyof PromoCodeDraft>(key: Key, value: PromoCodeDraft[Key]) {
    setPromoDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function startNewAutomation() {
    setDraft({
      ...DEFAULT_DRAFT,
      triggerFilters: { ...DEFAULT_DRAFT.triggerFilters },
    })
    setSaveMessage(null)
  }

  function startNewPromoCode() {
    setPromoDraft(DEFAULT_PROMO_CODE_DRAFT)
    setPromoMessage(null)
  }

  function selectPromoCode(record: PromoCodeRecord) {
    setPromoDraft(toPromoDraft(record))
    setPromoMessage(null)
  }

  function usePromoCodeInDraft(code: string) {
    updateField('promoCode', code)
    setSaveMessage(`Selected coupon ${code} for this automation.`)
  }

  function applyTemplate(template: EmailTemplateRecord) {
    setDraft((current) => ({
      ...current,
      templateId: template.id,
      aiPrompt: template.aiPrompt || current.aiPrompt,
      promoCode: template.promoCode || '',
      subject: template.subject,
      previewText: template.previewText || '',
      eyebrow: template.eyebrow || '',
      headline: template.headline || '',
      body: template.body,
      primaryButtonLabel: template.primaryButtonLabel || '',
      primaryButtonUrl: template.primaryButtonUrl || '',
      secondaryButtonLabel: template.secondaryButtonLabel || '',
      secondaryButtonUrl: template.secondaryButtonUrl || '',
      footer: template.footer || 'You are receiving this email from DuckSAT.',
    }))
    setSaveMessage(`Loaded template "${template.name}".`)
  }

  function clearTemplateSelection() {
    setDraft((current) => ({
      ...current,
      templateId: '',
    }))
    setSaveMessage('Template detached. The current copied email content will stay in this automation draft.')
  }

  async function saveCurrentAsTemplate() {
    try {
      if (!draft.name.trim()) {
        throw new Error('Add an automation name before saving this email as a template')
      }

      setTemplateSaving(true)
      setSaveMessage(null)

      const isEditingTemplate = Boolean(draft.templateId)
      const response = await fetch(
        isEditingTemplate ? `/api/admin/email-templates/${draft.templateId}` : '/api/admin/email-templates',
        {
          method: isEditingTemplate ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: draft.name,
            description: draft.description,
            aiPrompt: draft.aiPrompt,
            promoCode: draft.promoCode || undefined,
            subject: draft.subject,
            previewText: draft.previewText,
            eyebrow: draft.eyebrow,
            headline: draft.headline,
            body: draft.body,
            primaryButtonLabel: draft.primaryButtonLabel,
            primaryButtonUrl: draft.primaryButtonUrl,
            secondaryButtonLabel: draft.secondaryButtonLabel,
            secondaryButtonUrl: draft.secondaryButtonUrl,
            footer: draft.footer,
          }),
        },
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template')
      }

      setDraft((current) => ({
        ...current,
        templateId: data.template.id,
      }))
      await loadTemplates()
      setSaveMessage(isEditingTemplate ? 'Saved changes to the selected template.' : 'Saved this automation email as a reusable template.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setTemplateSaving(false)
    }
  }

  async function savePromoCode() {
    try {
      setPromoCodeSaving(true)
      setPromoMessage(null)

      const isEditing = Boolean(promoDraft.id)
      const response = await fetch(
        isEditing ? `/api/admin/promo-codes/${promoDraft.id}` : '/api/admin/promo-codes',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: promoDraft.code,
            label: promoDraft.label,
            description: promoDraft.description,
            effectType: promoDraft.effectType,
            bonusPracticeTests:
              promoDraft.effectType === 'bonus_practice_tests'
                ? Number(promoDraft.bonusPracticeTests || '1')
                : undefined,
            successMessage: promoDraft.successMessage,
            emailSelectable: promoDraft.emailSelectable,
            isActive: promoDraft.isActive,
          }),
        },
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save promo code')
      }

      await loadPromoCodes(data.promoCode.id)

      if (draft.promoCode && promoDraft.code.trim().toUpperCase() === draft.promoCode) {
        updateField('promoCode', data.promoCode.code)
      }

      setPromoMessage(isEditing ? 'Coupon code updated.' : 'Coupon code created.')
    } catch (error) {
      setPromoMessage(error instanceof Error ? error.message : 'Failed to save promo code')
    } finally {
      setPromoCodeSaving(false)
    }
  }

  async function saveAutomation() {
    try {
      setSaving(true)
      setSaveMessage(null)

      const isEditing = Boolean(draft.id)
      const response = await fetch(
        isEditing ? `/api/admin/email-automations/${draft.id}` : '/api/admin/email-automations',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(draft)),
        },
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save automation')
      }

      await loadAutomations(data.automation.id)
      setSaveMessage(isEditing ? 'Automation updated.' : 'Automation created.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  async function generateWithAi() {
    try {
      setGenerating(true)
      setSaveMessage(null)

      const response = await fetch('/api/admin/email-automations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: draft.aiPrompt,
          triggerType: draft.triggerType,
          triggerSummary: JSON.stringify(buildPayload(draft).triggerFilters),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate email')
      }

      setDraft((current) => ({
        ...current,
        subject: data.generated.subject || current.subject,
        previewText: data.generated.previewText || current.previewText,
        eyebrow: data.generated.eyebrow || current.eyebrow,
        headline: data.generated.headline || current.headline,
        body: data.generated.body || current.body,
        primaryButtonLabel: data.generated.primaryButtonLabel || current.primaryButtonLabel,
        primaryButtonUrl: data.generated.primaryButtonUrl || current.primaryButtonUrl,
        secondaryButtonLabel: data.generated.secondaryButtonLabel || current.secondaryButtonLabel,
        secondaryButtonUrl: data.generated.secondaryButtonUrl || current.secondaryButtonUrl,
        footer: data.generated.footer || current.footer,
      }))
      setSaveMessage(`Email copy generated with ${data.model}.`)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to generate email')
    } finally {
      setGenerating(false)
    }
  }

  const activeCount = automations.filter((automation) => automation.isActive).length
  const selectedTemplate = templates.find((template) => template.id === draft.templateId) || null
  const activeSelectablePromoCodes = promoCodes.filter((promoCode) => promoCode.isActive && promoCode.emailSelectable)
  const selectedPromo = promoCodes.find((promoCode) => promoCode.code === draft.promoCode) || null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,#f8fafc_38%,#dbeafe_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EmailWorkspaceNav
          active="triggers"
          title="Assign saved emails to user triggers"
          description="Use this page to map reusable emails to events like practice test completion, drill behavior, or session activity. Build the email itself on the create page first."
        />

        <section className="rounded-[28px] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Assign Triggers</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Attach saved emails to real user behavior</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-600">
                Automations run from DuckSAT’s server-side event and completion data. Every live send includes a working unsubscribe link,
                and you can still refine the final copy here if you need a trigger-specific version.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/email-create" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Create email
              </Link>
              <Link href="/admin/email-campaigns" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Send + track
              </Link>
              <Link href="/admin/email-overview" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Email overview
              </Link>
              <button onClick={startNewAutomation} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                New automation
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Saved automations</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{automations.length}</div>
          </div>
          <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Active now</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{activeCount}</div>
          </div>
          <div className="rounded-[26px] border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Unsubscribe handling</div>
            <div className="mt-2 text-lg font-bold text-slate-900">Enabled on every live send</div>
          </div>
        </section>

        {pageError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{pageError}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Saved rules</h2>
                <p className="text-sm text-slate-500">Pick one to edit it, or start a new automation from scratch.</p>
              </div>
              {loading ? <div className="text-sm text-slate-500">Loading…</div> : null}
            </div>

            <div className="space-y-3">
              {automations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                  No automations saved yet. Create one on the right and save it.
                </div>
              ) : (
                automations.map((automation) => {
                  const isSelected = automation.id === draft.id

                  return (
                    <button
                      key={automation.id}
                      onClick={() => selectAutomation(automation)}
                      className={`w-full rounded-[24px] border px-5 py-4 text-left transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold">{automation.name}</div>
                          <div className={`mt-1 text-xs uppercase tracking-[0.22em] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {triggerLabel(automation.triggerType)}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${automation.isActive ? (isSelected ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-100 text-emerald-700') : (isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600')}`}>
                          {automation.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className={`mt-3 text-sm leading-6 ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                        {automation.description || automation.subject}
                      </p>
                      {automation.template ? (
                        <div className={`mt-2 text-xs font-semibold ${isSelected ? 'text-amber-200' : 'text-amber-700'}`}>
                          Template: {automation.template.name}
                        </div>
                      ) : null}
                      {automation.promoCode ? (
                        <div className={`mt-2 text-xs font-semibold ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                          Promo: {automation.promoCode}
                        </div>
                      ) : null}
                      <div className={`mt-3 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        Updated {formatTimestamp(automation.updatedAt)}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Automation editor</h2>
                  <p className="text-sm text-slate-500">Saved {formatTimestamp(draft.updatedAt)}. Live emails will automatically include the unsubscribe footer.</p>
                </div>
                <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={draft.isActive} onChange={(event) => updateField('isActive', event.target.checked)} />
                  Active
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Name
                  <input value={draft.name} onChange={(event) => updateField('name', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                </label>

                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Trigger type
                  <select value={draft.triggerType} onChange={(event) => updateField('triggerType', event.target.value as TriggerType)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500">
                    <option value="user_event">User event</option>
                    <option value="page_dwell">Page dwell</option>
                    <option value="drill_completed">Drill completed</option>
                    <option value="practice_test_completed">Practice test completed</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
                Description
                <textarea value={draft.description} onChange={(event) => updateField('description', event.target.value)} rows={3} className="w-full rounded-[22px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-500" />
              </label>

              <div className="mt-6 rounded-[26px] border border-sky-200 bg-sky-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Saved template library</h3>
                    <p className="mt-1 text-sm text-slate-600">Load a reusable email into this automation, or save the current email copy as a reusable template for manual sends and other triggers.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={saveCurrentAsTemplate} disabled={templateSaving} className="rounded-full bg-sky-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                      {templateSaving ? 'Saving template…' : draft.templateId ? 'Update saved template' : 'Save as template'}
                    </button>
                    {draft.templateId ? (
                      <button onClick={clearTemplateSelection} className="rounded-full border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50">
                        Clear template link
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <label className="space-y-2 text-sm font-semibold text-slate-700">
                    Use saved template
                    <select
                      value={draft.templateId}
                      onChange={(event) => {
                        const nextTemplateId = event.target.value
                        if (!nextTemplateId) {
                          clearTemplateSelection()
                          return
                        }

                        const template = templates.find((item) => item.id === nextTemplateId)
                        if (template) {
                          applyTemplate(template)
                        }
                      }}
                      className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                    >
                      <option value="">No saved template selected</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-[22px] border border-sky-200 bg-white px-4 py-4 text-sm text-slate-600">
                    <div className="font-semibold text-slate-900">Library status</div>
                    <div className="mt-2">{templateLoading ? 'Loading templates…' : `${templates.length} saved templates ready for reuse.`}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                      {selectedTemplate ? `Selected: ${selectedTemplate.name}` : 'No template selected'}
                    </div>
                  </div>
                </div>

                {selectedTemplate?.description ? (
                  <div className="mt-4 rounded-[22px] border border-sky-200 bg-white px-4 py-4 text-sm text-slate-700">
                    {selectedTemplate.description}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-[26px] border border-emerald-200 bg-emerald-50/70 p-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Coupon offer</h3>
                  <p className="mt-1 text-sm text-slate-600">Pick any existing email coupon created on the Create Email page to append a redeem block to this automation. You can also reference {'{{promoCode}}'}, {'{{promoBenefit}}'}, and {'{{promoRedeemUrl}}'} inside the copy.</p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <label className="space-y-2 text-sm font-semibold text-slate-700">
                    Promo code
                    <select
                      value={draft.promoCode}
                      onChange={(event) => updateField('promoCode', event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
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
                <div className="mt-4 rounded-[22px] border border-violet-200 bg-white px-4 py-4 text-sm text-slate-700">
                  Coupon codes are created and edited only on the Create Email page now.
                  <Link href="/admin/email-create#coupon-manager" className="mt-3 inline-flex text-sm font-semibold text-violet-700 underline underline-offset-4">
                    Open coupon manager on Create Email
                  </Link>
                </div>
              </div>

              <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
                <h3 className="text-lg font-bold text-slate-900">Trigger filters</h3>
                <p className="mt-1 text-sm text-slate-500">Combine a trigger type with optional filters for a specific page, category, event, user, or score threshold.</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-slate-700">
                    Specific user ID
                    <input value={draft.triggerFilters.userId} onChange={(event) => updateTriggerFilter('userId', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="optional" />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-slate-700">
                    Specific user email
                    <input value={draft.triggerFilters.userEmail} onChange={(event) => updateTriggerFilter('userEmail', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="optional" />
                  </label>
                </div>

                {draft.triggerType === 'user_event' ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Event type
                      <input value={draft.triggerFilters.eventType} onChange={(event) => updateTriggerFilter('eventType', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="drill, test, navigation, session" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Event name
                      <input value={draft.triggerFilters.eventName} onChange={(event) => updateTriggerFilter('eventName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="practice_test_completed" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Page path
                      <input value={draft.triggerFilters.pagePath} onChange={(event) => updateTriggerFilter('pagePath', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="/pricing" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Metadata key
                      <input value={draft.triggerFilters.metadataKey} onChange={(event) => updateTriggerFilter('metadataKey', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="plan" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      Metadata value
                      <input value={draft.triggerFilters.metadataValue} onChange={(event) => updateTriggerFilter('metadataValue', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="yearly" />
                    </label>
                  </div>
                ) : null}

                {draft.triggerType === 'page_dwell' ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-3">
                      Page path
                      <input value={draft.triggerFilters.pagePath} onChange={(event) => updateTriggerFilter('pagePath', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="/" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Min dwell ms
                      <input value={draft.triggerFilters.minDwellTimeMs} onChange={(event) => updateTriggerFilter('minDwellTimeMs', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="15000" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Max dwell ms
                      <input value={draft.triggerFilters.maxDwellTimeMs} onChange={(event) => updateTriggerFilter('maxDwellTimeMs', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="optional" />
                    </label>
                  </div>
                ) : null}

                {draft.triggerType === 'drill_completed' ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Category
                      <input value={draft.triggerFilters.category} onChange={(event) => updateTriggerFilter('category', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="algebra" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Module type
                      <input value={draft.triggerFilters.moduleType} onChange={(event) => updateTriggerFilter('moduleType', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="math" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Difficulty
                      <input value={draft.triggerFilters.difficulty} onChange={(event) => updateTriggerFilter('difficulty', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="hard" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Minimum score
                      <input value={draft.triggerFilters.minScore} onChange={(event) => updateTriggerFilter('minScore', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="80" />
                    </label>
                  </div>
                ) : null}

                {draft.triggerType === 'practice_test_completed' ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Practice test ID
                      <input value={draft.triggerFilters.practiceTestId} onChange={(event) => updateTriggerFilter('practiceTestId', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="optional specific test" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Minimum score
                      <input value={draft.triggerFilters.minScore} onChange={(event) => updateTriggerFilter('minScore', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" placeholder="80" />
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-[26px] border border-cyan-200 bg-cyan-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">AI-generated copy</h3>
                    <p className="mt-1 text-sm text-slate-600">Describe the email in plain English and DuckSAT will draft the subject and body for this trigger. If you selected a coupon, you can also reference promo tokens in the copy.</p>
                  </div>
                  <button onClick={generateWithAi} disabled={generating || !draft.aiPrompt.trim()} className="rounded-full bg-cyan-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {generating ? 'Generating…' : 'Generate with AI'}
                  </button>
                </div>

                <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
                  AI prompt
                  <textarea value={draft.aiPrompt} onChange={(event) => updateField('aiPrompt', event.target.value)} rows={4} className="w-full rounded-[22px] border border-cyan-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-cyan-500" placeholder="Example: Write a tight email for users who completed one math drill but haven’t subscribed. Make it direct, confident, and push them back into DuckSAT today." />
                </label>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Subject
                  <input value={draft.subject} onChange={(event) => updateField('subject', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                </label>
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Preview text
                  <input value={draft.previewText} onChange={(event) => updateField('previewText', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Eyebrow
                    <input value={draft.eyebrow} onChange={(event) => updateField('eyebrow', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Headline
                    <input value={draft.headline} onChange={(event) => updateField('headline', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Body
                  <textarea value={draft.body} onChange={(event) => updateField('body', event.target.value)} rows={10} className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-500" />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Primary button label
                    <input value={draft.primaryButtonLabel} onChange={(event) => updateField('primaryButtonLabel', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Primary button URL
                    <input value={draft.primaryButtonUrl} onChange={(event) => updateField('primaryButtonUrl', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Secondary button label
                    <input value={draft.secondaryButtonLabel} onChange={(event) => updateField('secondaryButtonLabel', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Secondary button URL
                    <input value={draft.secondaryButtonUrl} onChange={(event) => updateField('secondaryButtonUrl', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Footer note
                  <input value={draft.footer} onChange={(event) => updateField('footer', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500" />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={saveAutomation} disabled={saving} className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {saving ? 'Saving…' : draft.id ? 'Update automation' : 'Create automation'}
                </button>
                <button onClick={startNewAutomation} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  Reset draft
                </button>
                {saveMessage ? <div className="text-sm font-semibold text-slate-600">{saveMessage}</div> : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Live preview</h2>
                  <p className="text-sm text-slate-500">Rendered with the same email template path DuckSAT uses for actual sends.</p>
                </div>
                {preview ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Previewing as <span className="font-semibold text-slate-900">{preview.previewRecipient.name}</span> • {preview.previewRecipient.plan}
                  </div>
                ) : null}
              </div>

              {previewLoading ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">Rendering preview…</div>
              ) : preview ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Rendered subject</div>
                    <div className="mt-2 text-lg font-bold text-slate-900">{preview.subject}</div>
                  </div>
                  <iframe title="Email automation preview" srcDoc={preview.html} className="h-[680px] w-full rounded-[26px] border border-slate-200 bg-white" />
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">Preview unavailable.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}