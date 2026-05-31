"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface TriggerEmailDelivery {
  id: string
  automationName: string
  email: string
  triggerType: string
  triggerKey: string
  status: string
  error: string | null
  createdAt: string
}

interface TriggerEmailSummary {
  total: number
  sent: number
  queued: number
  failed: number
}

interface TriggerEmailActivityResponse {
  deliveries: TriggerEmailDelivery[]
  summary: TriggerEmailSummary
}

export default function AdminDashboard() {
  const [emailActivity, setEmailActivity] = useState<TriggerEmailActivityResponse | null>(null)
  const [emailLoading, setEmailLoading] = useState(true)
  const [emailError, setEmailError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setEmailLoading(true)
        setEmailError(null)

        const response = await fetch('/api/admin/email-activity?limit=8', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          const message = response.status === 403 ? 'Admin authorization required' : 'Unable to load trigger email activity'
          throw new Error(message)
        }

        const data = (await response.json()) as TriggerEmailActivityResponse

        if (mounted) {
          setEmailActivity(data)
        }
      } catch (error) {
        if (mounted) {
          setEmailError(error instanceof Error ? error.message : 'Unexpected error loading trigger email activity')
        }
      } finally {
        if (mounted) {
          setEmailLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const summary = useMemo<TriggerEmailSummary>(
    () =>
      emailActivity?.summary || {
        total: 0,
        sent: 0,
        queued: 0,
        failed: 0,
      },
    [emailActivity],
  )

  const deliveries = emailActivity?.deliveries || []

  const formatTimestamp = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return 'Unknown time'
    }

    return date.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 Admin Dashboard</h1>
            <p className="text-xl text-gray-600">Manage questions, email systems, coupon offers, and test modules</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Module Testing */}
            <Link href="/admin/test" className="group">
              <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Test Modules</h3>
                <p className="text-gray-600">Start any module directly for testing</p>
              </div>
            </Link>

            {/* Question Management */}
            <Link href="/admin/questions" className="group">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Questions</h3>
                <p className="text-gray-600">View and edit existing questions</p>
              </div>
            </Link>

            {/* AI Question Generation */}
            <Link href="/admin/question-generation" className="group">
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Question Generation</h3>
                <p className="text-gray-600">Generate questions with AI (single or batch mode)</p>
              </div>
            </Link>

            {/* Question Validation */}
            <Link href="/admin/validate-questions" className="group">
              <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Validate Questions</h3>
                <p className="text-gray-600">Review and approve questions</p>
              </div>
            </Link>

            {/* Practice Test Publishing */}
            <Link href="/admin/practice-tests" className="group">
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🧪</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Practice Tests</h3>
                <p className="text-gray-600">Publish tests and view validation issues</p>
              </div>
            </Link>

            {/* Data Dashboard */}
            <Link href="/admin/data" className="group">
              <div className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border-2 border-yellow-200 hover:border-yellow-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Data Dashboard</h3>
                <p className="text-gray-600">User metrics, feedback, and activity</p>
              </div>
            </Link>

            {/* Reviews & Ratings */}
            <Link href="/admin/reviews" className="group">
              <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border-2 border-pink-200 hover:border-pink-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Reviews & Ratings</h3>
                <p className="text-gray-600">Browse all submitted question ratings</p>
              </div>
            </Link>

            {/* Topics & Subtopics */}
            <Link href="/admin/topics" className="group">
              <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200 hover:border-teal-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🗂️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Topics & Subtopics</h3>
                <p className="text-gray-600">Manage topics, subtopics, and question targets</p>
              </div>
            </Link>

            {/* Email Workspace */}
            <Link href="/admin/email" className="group">
              <div className="p-6 bg-gradient-to-br from-cyan-50 to-emerald-50 rounded-2xl border-2 border-cyan-200 hover:border-cyan-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">📬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email Workspace</h3>
                <p className="text-gray-600">Jump into the three-step email flow: create email, assign triggers, or send and track activity</p>
              </div>
            </Link>

            {/* Inbound Inbox */}
            <Link href="/admin/inbound-emails" className="group">
              <div className="p-6 bg-gradient-to-br from-slate-50 to-zinc-100 rounded-2xl border-2 border-slate-200 hover:border-slate-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">📥</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Inbound Inbox</h3>
                <p className="text-gray-600">Review emails sent to DuckSAT addresses and confirm they were forwarded to ducksat1600@gmail.com</p>
              </div>
            </Link>

            {/* Email Automations */}
            <Link href="/admin/email-automations" className="group">
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 hover:border-amber-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email Studio</h3>
                <p className="text-gray-600">Create templates with AI, manage triggers, and attach coupon offers from one admin surface</p>
              </div>
            </Link>

            {/* Promo Codes */}
            <Link href="/admin/email-automations#promo-manager" className="group">
              <div className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border-2 border-violet-200 hover:border-violet-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🎟️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Coupon Codes</h3>
                <p className="text-gray-600">Create any promo code, control email eligibility, and reuse it instantly across campaigns and automations</p>
              </div>
            </Link>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Trigger Email Activity</h2>
                <p className="text-gray-600">Live status of emails sent by automation triggers like drill events and lifecycle events</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/email-overview"
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-colors"
                >
                  Open Email Overview
                </Link>
                <Link
                  href="/admin/email-automations"
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  Manage Triggers
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Sent</p>
                <p className="text-2xl font-bold text-emerald-900">{summary.sent}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">Queued</p>
                <p className="text-2xl font-bold text-amber-900">{summary.queued}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-700">Failed</p>
                <p className="text-2xl font-bold text-rose-900">{summary.failed}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Most Recent Trigger Deliveries</p>
              </div>

              {emailLoading ? (
                <div className="p-4 text-sm text-slate-600">Loading trigger email activity...</div>
              ) : emailError ? (
                <div className="p-4 text-sm text-rose-700">{emailError}</div>
              ) : deliveries.length === 0 ? (
                <div className="p-4 text-sm text-slate-600">No trigger-based email deliveries yet. Start a drill or fire a lifecycle event to populate this table.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b border-slate-200">
                      <tr>
                        <th className="text-left font-semibold text-slate-700 px-4 py-3">Automation</th>
                        <th className="text-left font-semibold text-slate-700 px-4 py-3">Recipient</th>
                        <th className="text-left font-semibold text-slate-700 px-4 py-3">Status</th>
                        <th className="text-left font-semibold text-slate-700 px-4 py-3">Trigger</th>
                        <th className="text-left font-semibold text-slate-700 px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map((delivery) => (
                        <tr key={delivery.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-slate-900">
                            <div className="font-medium">{delivery.automationName}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[280px]">{delivery.triggerKey}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{delivery.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                delivery.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : delivery.status === 'failed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {delivery.status}
                            </span>
                            {delivery.error ? <p className="text-xs text-rose-700 mt-1 max-w-[260px]">{delivery.error}</p> : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{delivery.triggerType}</td>
                          <td className="px-4 py-3 text-slate-600">{formatTimestamp(delivery.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
