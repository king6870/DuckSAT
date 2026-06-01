'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import EmailWorkspaceNav from '@/components/admin/EmailWorkspaceNav'

interface EmailOverviewDeliveryItem {
  id: string
  email: string
  status: string
  resendId: string | null
  error: string | null
  sentAt: string | null
  createdAt: string
}

interface EmailOverviewDeliverySummary {
  total: number
  sent: number
  queued: number
  failed: number
}

interface EmailOverviewAutomationItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: string
  triggerLabel: string
  triggerSummary: string
  templateId: string | null
  promoCode: string | null
  subject: string
  updatedAt: string
  deliverySummary: EmailOverviewDeliverySummary
  recentDeliveries: EmailOverviewDeliveryItem[]
}

interface EmailOverviewTemplateItem {
  id: string
  name: string
  description: string | null
  promoCode: string | null
  updatedAt: string
  automationCount: number
  deliverySummary: EmailOverviewDeliverySummary
  automations: EmailOverviewAutomationItem[]
}

interface EmailOverviewErrorItem {
  id: string
  automationId: string
  automationName: string
  templateName: string | null
  email: string
  error: string
  createdAt: string
}

interface EmailOverviewResponse {
  summary: {
    templates: number
    automations: number
    activeAutomations: number
    totalDeliveries: number
    sent: number
    queued: number
    failed: number
  }
  templates: EmailOverviewTemplateItem[]
  unlinkedAutomations: EmailOverviewAutomationItem[]
  recentErrors: EmailOverviewErrorItem[]
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not sent yet'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusTone(status: string) {
  if (status === 'sent') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'failed') {
    return 'bg-rose-100 text-rose-700'
  }

  return 'bg-amber-100 text-amber-700'
}

function deliveryMetricCard(label: string, value: number, tone: string) {
  return (
    <div className={`rounded-[22px] border px-4 py-4 ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  )
}

function AutomationCard({ automation }: { automation: EmailOverviewAutomationItem }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{automation.triggerLabel}</div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">{automation.name}</h3>
          <div className="mt-2 text-sm text-slate-600">{automation.description || automation.subject}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${automation.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            {automation.isActive ? 'Active' : 'Paused'}
          </span>
          {automation.promoCode ? (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">Coupon: {automation.promoCode}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trigger details</div>
        <div className="mt-2">{automation.triggerSummary}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {deliveryMetricCard('Sent', automation.deliverySummary.sent, 'border-emerald-200 bg-emerald-50 text-emerald-700')}
        {deliveryMetricCard('Queued', automation.deliverySummary.queued, 'border-amber-200 bg-amber-50 text-amber-700')}
        {deliveryMetricCard('Failed', automation.deliverySummary.failed, 'border-rose-200 bg-rose-50 text-rose-700')}
        {deliveryMetricCard('Total', automation.deliverySummary.total, 'border-slate-200 bg-white text-slate-900')}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent recipients</div>
          <div className="text-xs text-slate-500">Updated {formatDate(automation.updatedAt)}</div>
        </div>

        <div className="mt-3 space-y-3">
          {automation.recentDeliveries.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
              No deliveries recorded for this automation yet.
            </div>
          ) : (
            automation.recentDeliveries.map((delivery) => (
              <div key={delivery.id} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{delivery.email}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(delivery.sentAt || delivery.createdAt)}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(delivery.status)}`}>{delivery.status}</span>
                </div>

                {delivery.error ? <div className="mt-3 text-sm text-rose-600">{delivery.error}</div> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminEmailOverviewPage() {
  const [data, setData] = useState<EmailOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadOverview() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/email-overview', { cache: 'no-store' })
      const payload = (await response.json()) as EmailOverviewResponse | { error?: string }
      const responseError = 'error' in payload ? payload.error : undefined

      if (!response.ok) {
        throw new Error(responseError || 'Failed to load email overview.')
      }

      setData(payload as EmailOverviewResponse)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load email overview.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  const summary = data?.summary || {
    templates: 0,
    automations: 0,
    activeAutomations: 0,
    totalDeliveries: 0,
    sent: 0,
    queued: 0,
    failed: 0,
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#faf5ff_0%,#f8fafc_40%,#ede9fe_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EmailWorkspaceNav
          active="overview"
          title="Audit the whole DuckSAT email system"
          description="See every template, its attached triggers, the recent recipients for each automation, and the latest delivery failures from one page."
        />

        <section className="rounded-[28px] border border-violet-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">One joined view for templates, triggers, and sends</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Use this page to confirm which template powers each automation, how often it has fired, who received it recently, and whether any delivery errors need cleanup.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/email-create" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Create email
              </Link>
              <Link href="/admin/email-automations" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Assign triggers
              </Link>
              <Link href="/admin/email-campaigns" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Send + track
              </Link>
              <button onClick={loadOverview} disabled={loading} className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-400">
                {loading ? 'Refreshing…' : 'Refresh overview'}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {deliveryMetricCard('Templates', summary.templates, 'border-cyan-200 bg-cyan-50 text-cyan-700')}
          {deliveryMetricCard('Automations', summary.automations, 'border-slate-200 bg-white text-slate-900')}
          {deliveryMetricCard('Active', summary.activeAutomations, 'border-emerald-200 bg-emerald-50 text-emerald-700')}
          {deliveryMetricCard('Sent', summary.sent, 'border-emerald-200 bg-emerald-50 text-emerald-700')}
          {deliveryMetricCard('Queued', summary.queued, 'border-amber-200 bg-amber-50 text-amber-700')}
          {deliveryMetricCard('Failed', summary.failed, 'border-rose-200 bg-rose-50 text-rose-700')}
        </section>

        {data?.recentErrors?.length ? (
          <section className="rounded-[28px] border border-rose-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Recent delivery errors</h2>
                <p className="text-sm text-slate-600">These are the latest failures recorded across automation sends.</p>
              </div>
              <div className="text-sm text-slate-500">Total deliveries tracked: {summary.totalDeliveries}</div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {data.recentErrors.map((errorItem) => (
                <div key={errorItem.id} className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{errorItem.automationName}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-rose-700">
                        {errorItem.templateName ? `${errorItem.templateName} • ${errorItem.email}` : errorItem.email}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(errorItem.createdAt)}</div>
                  </div>
                  <div className="mt-3 text-sm text-rose-700">{errorItem.error}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {loading && !data ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-[28px] border border-slate-200 bg-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.06)]" />
            ))}
          </section>
        ) : null}

        {!loading && data && data.templates.length === 0 && data.unlinkedAutomations.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-bold text-slate-900">No templates or automations yet</h2>
            <p className="mt-3 text-sm text-slate-600">Create an email template first, then attach it to an automation trigger so activity starts showing up here.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/admin/email-create" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create email template
              </Link>
              <Link href="/admin/email-automations" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Open trigger builder
              </Link>
            </div>
          </section>
        ) : null}

        {data?.templates.map((template) => (
          <section key={template.id} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email template</div>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">{template.name}</h2>
                <div className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{template.description || 'No description saved for this template yet.'}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Updated {formatDate(template.updatedAt)}</span>
                  {template.promoCode ? <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">Coupon: {template.promoCode}</span> : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px] xl:grid-cols-4">
                {deliveryMetricCard('Triggers', template.automationCount, 'border-cyan-200 bg-cyan-50 text-cyan-700')}
                {deliveryMetricCard('Sent', template.deliverySummary.sent, 'border-emerald-200 bg-emerald-50 text-emerald-700')}
                {deliveryMetricCard('Failed', template.deliverySummary.failed, 'border-rose-200 bg-rose-50 text-rose-700')}
                {deliveryMetricCard('Total', template.deliverySummary.total, 'border-slate-200 bg-white text-slate-900')}
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {template.automations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-sm text-slate-500 xl:col-span-2">
                  This template is saved, but it is not attached to any trigger yet.
                </div>
              ) : (
                template.automations.map((automation) => <AutomationCard key={automation.id} automation={automation} />)
              )}
            </div>
          </section>
        ))}

        {data?.unlinkedAutomations.length ? (
          <section className="rounded-[30px] border border-amber-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Unlinked automations</div>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Automations not attached to a saved template</h2>
                <p className="mt-2 text-sm text-slate-600">These automations still work, but they are using inline content instead of a reusable template.</p>
              </div>
              <Link href="/admin/email-automations" className="rounded-full border border-amber-200 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-50">
                Review triggers
              </Link>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {data.unlinkedAutomations.map((automation) => (
                <AutomationCard key={automation.id} automation={automation} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}