"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import EmailWorkspaceNav from '@/components/admin/EmailWorkspaceNav'

type PromoCodeEffectType = 'tester_access' | 'bonus_practice_tests'

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

interface TemplateDraft {
  id?: string
  name: string
  description: string
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
  updatedAt?: string
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

const DEFAULT_TEMPLATE_DRAFT: TemplateDraft = {
  name: 'New DuckSAT email',
  description: 'Reusable email template for admin campaigns and automations.',
  aiPrompt: '',
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

function toTemplateDraft(record: EmailTemplateRecord): TemplateDraft {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
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
    updatedAt: record.updatedAt,
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

export default function AdminEmailCreatePage() {
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([])
  const [draft, setDraft] = useState<TemplateDraft>(DEFAULT_TEMPLATE_DRAFT)
  const [promoDraft, setPromoDraft] = useState<PromoCodeDraft>(DEFAULT_PROMO_CODE_DRAFT)
  const [loading, setLoading] = useState(true)
  const [promoCodesLoading, setPromoCodesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [promoSaving, setPromoSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [promoMessage, setPromoMessage] = useState<string | null>(null)

  async function loadTemplates(selectedId?: string) {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/email-templates')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load templates')
      }

      const nextTemplates = data.templates as EmailTemplateRecord[]
      setTemplates(nextTemplates)
      setPageError(null)

      if (selectedId) {
        const selected = nextTemplates.find((template) => template.id === selectedId)
        if (selected) {
          setDraft(toTemplateDraft(selected))
        }
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load templates')
    } finally {
      setLoading(false)
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

  function selectTemplate(record: EmailTemplateRecord) {
    setDraft(toTemplateDraft(record))
    setSaveMessage(null)
  }

  function startNewTemplate() {
    setDraft({ ...DEFAULT_TEMPLATE_DRAFT })
    setSaveMessage(null)
  }

  function updateField<Key extends keyof TemplateDraft>(key: Key, value: TemplateDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updatePromoDraftField<Key extends keyof PromoCodeDraft>(key: Key, value: PromoCodeDraft[Key]) {
    setPromoDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function selectPromoCode(record: PromoCodeRecord) {
    setPromoDraft(toPromoDraft(record))
    setPromoMessage(null)
  }

  function startNewPromoCode() {
    setPromoDraft(DEFAULT_PROMO_CODE_DRAFT)
    setPromoMessage(null)
  }

  function applyPromoCodeToDraft(code: string) {
    updateField('promoCode', code)
    setSaveMessage(`Selected coupon ${code} for this email.`)
  }

  async function saveTemplate() {
    try {
      setSaving(true)
      setSaveMessage(null)

      const isEditing = Boolean(draft.id)
      const response = await fetch(
        isEditing ? `/api/admin/email-templates/${draft.id}` : '/api/admin/email-templates',
        {
          method: isEditing ? 'PATCH' : 'POST',
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

      await loadTemplates(data.template.id)
      setSaveMessage(isEditing ? 'Template updated.' : 'Template created.')
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function savePromoCode() {
    try {
      setPromoSaving(true)
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
      setPromoSaving(false)
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
          triggerType: 'user_event',
          triggerSummary: 'Reusable email template for DuckSAT admin sends and automations.',
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

  const selectedPromo = promoCodes.find((promoCode) => promoCode.code === draft.promoCode) || null
  const selectedTemplate = templates.find((template) => template.id === draft.id) || null
  const activeSelectablePromoCodes = promoCodes.filter((promoCode) => promoCode.isActive && promoCode.emailSelectable)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_40%,#cffafe_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EmailWorkspaceNav
          active="create"
          title="Create reusable DuckSAT emails"
          description="Use this page to write the email itself, save it as a reusable template, and manage coupon codes from the same workflow."
        />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Saved templates</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{templates.length}</div>
          </div>
          <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Active email coupons</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{activeSelectablePromoCodes.length}</div>
          </div>
          <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Selected template</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{selectedTemplate?.name || draft.name}</div>
          </div>
        </section>

        {pageError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{pageError}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.76fr_1.08fr_0.92fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Saved templates</h2>
                <p className="text-sm text-slate-500">Pick one to edit it, or start a new reusable email from scratch.</p>
              </div>
              {loading ? <div className="text-sm text-slate-500">Loading…</div> : null}
            </div>

            <div className="space-y-3">
              <button
                onClick={startNewTemplate}
                className={`w-full rounded-[24px] border px-5 py-4 text-left transition ${!draft.id ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white'}`}
              >
                <div className="text-base font-bold">New template draft</div>
                <div className={`mt-2 text-sm ${!draft.id ? 'text-slate-200' : 'text-slate-600'}`}>
                  Start fresh, add a coupon if needed, then save the template for sends and triggers.
                </div>
              </button>

              {templates.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                  No templates saved yet. Build the first one on the right.
                </div>
              ) : (
                templates.map((template) => {
                  const isSelected = template.id === draft.id

                  return (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className={`w-full rounded-[24px] border px-5 py-4 text-left transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold">{template.name}</div>
                          <div className={`mt-1 text-xs uppercase tracking-[0.22em] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            Updated {formatTimestamp(template.updatedAt)}
                          </div>
                        </div>
                        {template.promoCode ? (
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${isSelected ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-100 text-emerald-700'}`}>
                            {template.promoCode}
                          </span>
                        ) : null}
                      </div>
                      <p className={`mt-3 text-sm leading-6 ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                        {template.description || template.subject}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Template editor</h2>
                  <p className="text-sm text-slate-500">Save the email here first, then send it or wire it to a trigger from the other two pages.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href="/admin/email-campaigns" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Open send + track
                  </Link>
                  <Link href="/admin/email-automations" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Open triggers
                  </Link>
                  <Link href="/admin/email-overview" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Open overview
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Template name
                  <input value={draft.name} onChange={(event) => updateField('name', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
                Description
                <textarea value={draft.description} onChange={(event) => updateField('description', event.target.value)} rows={3} className="w-full rounded-[22px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-cyan-500" />
              </label>

              <div className={`mt-4 rounded-[22px] border px-4 py-4 text-sm ${selectedPromo ? 'border-emerald-200 bg-emerald-50 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <div className="font-semibold text-slate-900">Coupon source</div>
                <div className="mt-2">
                  {selectedPromo ? `This template is currently using ${selectedPromo.code} - ${selectedPromo.label}.` : 'No coupon is attached yet. Use the coupon sidebar on the right to attach or create one.'}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button onClick={saveTemplate} disabled={saving} className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-400">
                  {saving ? 'Saving…' : draft.id ? 'Update template' : 'Create template'}
                </button>
                <button onClick={startNewTemplate} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  Reset draft
                </button>
                {saveMessage ? <div className="text-sm font-semibold text-slate-600">{saveMessage}</div> : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan-200 bg-cyan-50/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">AI draft helper</h2>
                  <p className="text-sm text-slate-600">Describe the email you want in plain English and DuckSAT will draft the copy for this template.</p>
                </div>
                <button onClick={generateWithAi} disabled={generating || !draft.aiPrompt.trim()} className="rounded-full bg-cyan-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                  {generating ? 'Generating…' : 'Generate with AI'}
                </button>
              </div>

              <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
                AI prompt
                <textarea value={draft.aiPrompt} onChange={(event) => updateField('aiPrompt', event.target.value)} rows={4} className="w-full rounded-[22px] border border-cyan-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-cyan-500" placeholder="Write a direct upgrade email for users who finished a practice test but have not subscribed. Mention improved score gains and invite them back today." />
              </label>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-bold text-slate-900">Email copy</h2>
              <p className="mt-1 text-sm text-slate-500">Personalize with {'{{firstName}}'}, {'{{name}}'}, {'{{plan}}'}, {'{{email}}'}, {'{{promoCode}}'}, and {'{{promoRedeemUrl}}'}.</p>

              <div className="mt-5 space-y-4">
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Subject
                  <input value={draft.subject} onChange={(event) => updateField('subject', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                </label>
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Preview text
                  <input value={draft.previewText} onChange={(event) => updateField('previewText', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Eyebrow
                    <input value={draft.eyebrow} onChange={(event) => updateField('eyebrow', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Headline
                    <input value={draft.headline} onChange={(event) => updateField('headline', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                  </label>
                </div>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Body
                  <textarea value={draft.body} onChange={(event) => updateField('body', event.target.value)} rows={10} className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-cyan-500" />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Primary button label
                    <input value={draft.primaryButtonLabel} onChange={(event) => updateField('primaryButtonLabel', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Primary button URL
                    <input value={draft.primaryButtonUrl} onChange={(event) => updateField('primaryButtonUrl', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Secondary button label
                    <input value={draft.secondaryButtonLabel} onChange={(event) => updateField('secondaryButtonLabel', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                  </label>
                  <label className="block space-y-2 text-sm font-semibold text-slate-700">
                    Secondary button URL
                    <input value={draft.secondaryButtonUrl} onChange={(event) => updateField('secondaryButtonUrl', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                  </label>
                </div>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Footer
                  <textarea value={draft.footer} onChange={(event) => updateField('footer', event.target.value)} rows={3} className="w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-cyan-500" />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Live preview</h2>
                  <p className="text-sm text-slate-500">Rendered through the same server path used for real sends and automations.</p>
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
                  <iframe title="Email template preview" srcDoc={preview.html} className="h-[680px] w-full rounded-[26px] border border-slate-200 bg-white" />
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">Preview unavailable.</div>
              )}
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 self-start">
            <div className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Coupons for this email</h2>
                  <p className="mt-1 text-sm text-slate-500">Attach a code and manage the coupon library here without leaving the template creation flow.</p>
                </div>

                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Coupon attached
                  <select value={draft.promoCode} onChange={(event) => updateField('promoCode', event.target.value)} className="w-full rounded-2xl border border-emerald-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500">
                    <option value="">No coupon in this email</option>
                    {activeSelectablePromoCodes.map((promoCode) => (
                      <option key={promoCode.id} value={promoCode.code}>
                        {promoCode.code} - {promoCode.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={`rounded-[22px] border px-4 py-4 text-sm ${selectedPromo ? 'border-emerald-200 bg-emerald-50 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  <div className="font-semibold text-slate-900">Current coupon</div>
                  <div className="mt-2">
                    {selectedPromo ? `${selectedPromo.code} - ${selectedPromo.label}` : 'No coupon attached yet.'}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {selectedPromo ? selectedPromo.description : 'Create one below or select an existing active email coupon.'}
                  </div>
                  {selectedPromo ? (
                    <button onClick={() => updateField('promoCode', '')} className="mt-4 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">
                      Remove coupon from this template
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href="/admin/email-automations" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Assign to trigger
                  </Link>
                  <Link href="/admin/email-overview" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Open overview
                  </Link>
                </div>
              </div>
            </div>

            <div id="coupon-manager" className="rounded-[28px] border border-violet-200 bg-violet-50/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Coupon code manager</h2>
                  <p className="text-sm text-slate-600">Coupon adding lives only on this page. Changes here update the live coupon picker for templates and sends.</p>
                </div>
                <button onClick={startNewPromoCode} className="rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50">
                  New coupon code
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div className="rounded-[22px] border border-violet-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">Saved codes</div>
                    {promoCodesLoading ? <div className="text-xs text-slate-500">Loading…</div> : null}
                  </div>

                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {promoCodes.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                        No coupon codes saved yet.
                      </div>
                    ) : (
                      promoCodes.map((promoCode) => {
                        const isSelected = promoCode.id === promoDraft.id

                        return (
                          <button
                            key={promoCode.id}
                            onClick={() => selectPromoCode(promoCode)}
                            className={`w-full rounded-[18px] border px-4 py-4 text-left transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300 hover:bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-bold">{promoCode.code}</div>
                                <div className={`mt-1 text-xs uppercase tracking-[0.18em] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {promoCode.label}
                                </div>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${promoCode.isActive ? (isSelected ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-100 text-emerald-700') : (isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600')}`}>
                                {promoCode.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className={`mt-3 text-sm leading-6 ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                              {promoCode.description}
                            </div>
                            <div className={`mt-3 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              {promoCode.effectType === 'bonus_practice_tests'
                                ? `Bonus tests: ${promoCode.bonusPracticeTests || 1}`
                                : 'Tester access'}
                              {promoCode.emailSelectable ? ' • Email selectable' : ' • Hidden from email picker'}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-[22px] border border-violet-200 bg-white p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-900">Coupon editor</div>
                      <p className="text-sm text-slate-500">Create or edit the coupon code library here, then attach a code to the current template above.</p>
                    </div>
                    {promoDraft.id && promoDraft.isActive && promoDraft.emailSelectable ? (
                      <button onClick={() => applyPromoCodeToDraft(promoDraft.code)} className="rounded-full bg-violet-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800">
                        Use in current email
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Code
                      <input value={promoDraft.code} onChange={(event) => updatePromoDraftField('code', event.target.value.toUpperCase())} className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500" placeholder="DUCK30" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Effect type
                      <select value={promoDraft.effectType} onChange={(event) => updatePromoDraftField('effectType', event.target.value as PromoCodeEffectType)} className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500">
                        <option value="bonus_practice_tests">Bonus practice tests</option>
                        <option value="tester_access">Tester access</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Label
                      <input value={promoDraft.label} onChange={(event) => updatePromoDraftField('label', event.target.value)} className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500" />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-slate-700">
                      Bonus practice tests
                      <input value={promoDraft.bonusPracticeTests} onChange={(event) => updatePromoDraftField('bonusPracticeTests', event.target.value)} disabled={promoDraft.effectType !== 'bonus_practice_tests'} className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 disabled:bg-slate-100" />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
                    Description
                    <textarea value={promoDraft.description} onChange={(event) => updatePromoDraftField('description', event.target.value)} rows={3} className="w-full rounded-[22px] border border-violet-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-violet-500" />
                  </label>

                  <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
                    Success message
                    <textarea value={promoDraft.successMessage} onChange={(event) => updatePromoDraftField('successMessage', event.target.value)} rows={3} className="w-full rounded-[22px] border border-violet-200 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-violet-500" />
                  </label>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={promoDraft.emailSelectable} onChange={(event) => updatePromoDraftField('emailSelectable', event.target.checked)} />
                      Show in email coupon pickers
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={promoDraft.isActive} onChange={(event) => updatePromoDraftField('isActive', event.target.checked)} />
                      Active
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button onClick={savePromoCode} disabled={promoSaving} className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-400">
                      {promoSaving ? 'Saving coupon…' : promoDraft.id ? 'Update coupon code' : 'Create coupon code'}
                    </button>
                    <button onClick={startNewPromoCode} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                      Reset coupon draft
                    </button>
                    {promoMessage ? <div className="text-sm font-semibold text-slate-600">{promoMessage}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}