"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

import EmailWorkspaceNav from '@/components/admin/EmailWorkspaceNav'

type InboundEmailForwardStatus = 'pending' | 'forwarded' | 'forward_failed'

interface InboundEmailAttachmentRecord {
  id: string
  filename: string | null
  size: number
  contentType: string
  contentId: string | null
  contentDisposition: string | null
}

interface InboundEmailListItem {
  id: string
  resendEmailId: string
  fromEmail: string
  toEmails: string[]
  subject: string | null
  preview: string
  attachmentCount: number
  receivedAt: string
  forwardStatus: InboundEmailForwardStatus
  forwardTarget: string | null
  forwardedAt: string | null
  forwardError: string | null
}

interface InboundEmailDetail extends InboundEmailListItem {
  messageId: string | null
  ccEmails: string[]
  bccEmails: string[]
  replyToEmails: string[]
  textBody: string | null
  htmlBody: string | null
  headers: Record<string, string>
  attachments: InboundEmailAttachmentRecord[]
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function statusLabel(status: InboundEmailForwardStatus) {
  switch (status) {
    case 'forwarded':
      return 'Forwarded'
    case 'forward_failed':
      return 'Forward failed'
    default:
      return 'Pending forward'
  }
}

function statusTone(status: InboundEmailForwardStatus) {
  switch (status) {
    case 'forwarded':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'forward_failed':
      return 'bg-rose-100 text-rose-700 border-rose-200'
    default:
      return 'bg-amber-100 text-amber-700 border-amber-200'
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildIframeDocument(email: InboundEmailDetail | null) {
  if (!email?.htmlBody) {
    return `
      <html>
        <body style="margin:0;padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;background:#f8fafc;color:#0f172a;">
          <p style="margin:0;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(email?.textBody || 'No HTML body was available for this message.')}</p>
        </body>
      </html>
    `
  }

  return email.htmlBody
}

export default function AdminInboundEmailsPage() {
  const [emails, setEmails] = useState<InboundEmailListItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedEmail, setSelectedEmail] = useState<InboundEmailDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  async function loadEmails(preferredId?: string) {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/inbound-emails?limit=100')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load inbound emails')
      }

      const nextEmails = data.emails as InboundEmailListItem[]
      setEmails(nextEmails)
      setPageError(null)

      const nextSelectedId =
        preferredId && nextEmails.some((email) => email.id === preferredId)
          ? preferredId
          : nextEmails[0]?.id || ''

      setSelectedId(nextSelectedId)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load inbound emails')
      setEmails([])
      setSelectedId('')
    } finally {
      setLoading(false)
    }
  }

  async function loadEmailDetail(id: string) {
    try {
      setDetailLoading(true)
      const response = await fetch(`/api/admin/inbound-emails/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load email details')
      }

      setSelectedEmail(data.email as InboundEmailDetail)
      setPageError(null)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load email details')
      setSelectedEmail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadEmails()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelectedEmail(null)
      return
    }

    loadEmailDetail(selectedId)
  }, [selectedId])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f5f3ff_0%,#f8fafc_42%,#e2e8f0_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EmailWorkspaceNav
          active="operations"
          title="Inspect the full inbound inbox"
          description="This detail view is part of Send + Track. Use it when you need the raw incoming message, attachments, and forwarding outcome for DuckSAT mailbox traffic."
        />

        <section className="rounded-[28px] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Admin Inbound Inbox</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">See incoming DuckSAT email and forwarding status</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-600">
                Resend posts inbound email events to <span className="font-semibold text-slate-900">/api/resend/inbound</span>. DuckSAT stores the message,
                fetches the full body from Resend, and forwards it to ducksat1600@gmail.com.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/email-campaigns" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Back to send + track
              </Link>
              <button onClick={() => loadEmails(selectedId)} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Refresh inbox
              </button>
            </div>
          </div>
        </section>

        {pageError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{pageError}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Stored emails</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{emails.length}</div>
          </div>
          <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Forwarded</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{emails.filter((email) => email.forwardStatus === 'forwarded').length}</div>
          </div>
          <div className="rounded-[26px] border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Need attention</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{emails.filter((email) => email.forwardStatus === 'forward_failed').length}</div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Inbox</h2>
                <p className="text-sm text-slate-500">Newest messages first.</p>
              </div>
              {loading ? <div className="text-sm text-slate-500">Loading…</div> : null}
            </div>

            <div className="space-y-3">
              {emails.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-5 py-8 text-sm text-slate-500">
                  No inbound emails have been captured yet. If this stays empty after a test email, verify the Resend receiving domain is routing webhooks to /api/resend/inbound.
                </div>
              ) : (
                emails.map((email) => {
                  const isSelected = email.id === selectedId

                  return (
                    <button
                      key={email.id}
                      onClick={() => setSelectedId(email.id)}
                      className={`w-full rounded-[24px] border px-5 py-4 text-left transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">{email.fromEmail}</div>
                          <div className="mt-2 text-base font-bold">{email.subject || '(No subject)'}</div>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${isSelected ? 'border-white/20 bg-white/10 text-white' : statusTone(email.forwardStatus)}`}>
                          {statusLabel(email.forwardStatus)}
                        </span>
                      </div>

                      <p className={`mt-3 text-sm leading-6 ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>{email.preview}</p>

                      <div className={`mt-3 flex flex-wrap gap-3 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        <span>Received {formatTimestamp(email.receivedAt)}</span>
                        <span>{email.attachmentCount} attachment{email.attachmentCount === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Message detail</h2>
                  <p className="text-sm text-slate-500">View the stored email body, metadata, and forwarding result.</p>
                </div>
                {selectedEmail ? (
                  <span className={`rounded-full border px-4 py-2 text-sm font-bold ${statusTone(selectedEmail.forwardStatus)}`}>
                    {statusLabel(selectedEmail.forwardStatus)}
                  </span>
                ) : null}
              </div>

              {detailLoading ? (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">Loading email detail…</div>
              ) : selectedEmail ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Subject</div>
                    <div className="mt-2 text-xl font-bold text-slate-900">{selectedEmail.subject || '(No subject)'}</div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">From</div>
                      <div className="mt-2 break-all">{selectedEmail.fromEmail}</div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">To</div>
                      <div className="mt-2 break-all">{selectedEmail.toEmails.join(', ') || 'None'}</div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">Reply-To</div>
                      <div className="mt-2 break-all">{selectedEmail.replyToEmails.join(', ') || 'None'}</div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">Forward target</div>
                      <div className="mt-2 break-all">{selectedEmail.forwardTarget || 'Not assigned yet'}</div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">Received</div>
                      <div className="mt-2">{formatTimestamp(selectedEmail.receivedAt)}</div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">Forwarded</div>
                      <div className="mt-2">{formatTimestamp(selectedEmail.forwardedAt)}</div>
                    </div>
                  </div>

                  {selectedEmail.forwardError ? (
                    <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                      Forward error: {selectedEmail.forwardError}
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Attachments</div>
                    {selectedEmail.attachments.length ? (
                      <div className="mt-3 space-y-2">
                        {selectedEmail.attachments.map((attachment) => (
                          <div key={attachment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="font-semibold text-slate-900">{attachment.filename || 'Unnamed attachment'}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{attachment.contentType}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-slate-500">No attachments.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">Select an email to inspect it.</div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Stored body</h2>
                  <p className="text-sm text-slate-500">HTML is rendered in a sandboxed frame. Plain text is shown below it when available.</p>
                </div>
              </div>

              {selectedEmail ? (
                <div className="mt-6 space-y-5">
                  <iframe
                    title="Inbound email preview"
                    sandbox=""
                    srcDoc={buildIframeDocument(selectedEmail)}
                    className="h-[680px] w-full rounded-[26px] border border-slate-200 bg-white"
                  />

                  {selectedEmail.textBody ? (
                    <details className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-900">View plain-text body</summary>
                      <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedEmail.textBody}</pre>
                    </details>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">No email selected.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}