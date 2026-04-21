"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

// ───── Types ─────────────────────────────────────────────────────────────────

interface Summary {
  feedback: {
    total: number
    averageRating: number
    thisWeek: number
    withText: number
  }
  users: {
    total: number
    paid: number
    free: number
    newThisWeek: number
    qrTotal: number
    qrThisWeek: number
  }
}

interface FeedbackRow {
  id: string
  rating: number
  review: string | null
  pageUrl: string | null
  submittedAt: string
  userId: string | null
  user: {
    id: string
    name: string | null
    email: string
    subscriptionPlan: string
  } | null
}

interface FeedbackPage {
  data: FeedbackRow[]
  total: number
  page: number
  pages: number
}

interface UserRow {
  id: string
  name: string | null
  email: string
  createdAt: string
  subscriptionPlan: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  promoCodeUsed: string | null
  isTester: boolean
  feedbackSubmittedAt: string | null
  joinedViaQrCode: boolean
  qrCodeJoinedAt: string | null
  testCount: number
  totalTimeMinutes: number
  lastActiveDate: string | null
}

interface UsersPage {
  data: UserRow[]
  total: number
  page: number
  pages: number
}

interface UserDetail extends UserRow {
  testResults: {
    id: string
    score: number
    completedAt: string
    practiceTestId: string | null
    practiceTest: { name: string } | null
  }[]
  feedback: {
    id: string
    rating: number
    review: string | null
    pageUrl: string | null
    submittedAt: string
  }[]
}

// ───── Helpers ────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-500">
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function Badge({ plan, status }: { plan: string; status: string }) {
  const isPaid =
    (plan === 'monthly' || plan === 'yearly') && status === 'active'
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        isPaid
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isPaid ? plan : 'free'}
    </span>
  )
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (p: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center gap-2 mt-4 justify-center">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1 rounded border disabled:opacity-40"
      >
        ‹
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="px-3 py-1 rounded border disabled:opacity-40"
      >
        ›
      </button>
    </div>
  )
}

// ───── Summary Cards ──────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: Summary }) {
  const cards = [
    {
      label: 'Total Feedback',
      value: summary.feedback.total,
      sub: `${summary.feedback.thisWeek} this week`,
      color: 'from-amber-50 to-yellow-50 border-amber-200',
      icon: '💬',
    },
    {
      label: 'Avg Rating',
      value: `${summary.feedback.averageRating} / 5`,
      sub: `${summary.feedback.withText} with text`,
      color: 'from-yellow-50 to-orange-50 border-yellow-200',
      icon: '⭐',
    },
    {
      label: 'Total Users',
      value: summary.users.total,
      sub: `${summary.users.newThisWeek} new this week`,
      color: 'from-blue-50 to-indigo-50 border-blue-200',
      icon: '👥',
    },
    {
      label: 'Paid Users',
      value: summary.users.paid,
      sub: `${summary.users.free} on free plan`,
      color: 'from-green-50 to-emerald-50 border-green-200',
      icon: '💳',
    },
    {
      label: 'QR Code Signups',
      value: summary.users.qrTotal,
      sub: `${summary.users.qrThisWeek} this week`,
      color: 'from-violet-50 to-purple-50 border-violet-200',
      icon: '📲',
    },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`p-4 bg-gradient-to-br ${c.color} rounded-2xl border-2`}
        >
          <div className="text-2xl mb-1">{c.icon}</div>
          <div className="text-2xl font-bold text-gray-900">{c.value}</div>
          <div className="text-sm font-semibold text-gray-700">{c.label}</div>
          <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ───── Feedback Tab ───────────────────────────────────────────────────────────

function FeedbackTab() {
  const [data, setData] = useState<FeedbackPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [hasTextFilter, setHasTextFilter] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const buildParams = useCallback(
    (p: number) =>
      new URLSearchParams({
        page: String(p),
        limit: '20',
        ...(search ? { search } : {}),
        ...(ratingFilter ? { rating: ratingFilter } : {}),
        ...(hasTextFilter ? { hasText: hasTextFilter } : {}),
      }).toString(),
    [search, ratingFilter, hasTextFilter]
  )

  const fetchData = useCallback(
    async (p: number) => {
      try {
        setLoading(true)
        const res = await fetch(`/api/admin/data/feedback?${buildParams(p)}`)
        if (!res.ok) throw new Error('fetch failed')
        setData(await res.json())
        setError(null)
      } catch {
        setError('Failed to load feedback')
      } finally {
        setLoading(false)
      }
    },
    [buildParams]
  )

  useEffect(() => {
    setPage(1)
    fetchData(1)
  }, [search, ratingFilter, hasTextFilter, fetchData])

  useEffect(() => {
    fetchData(page)
  }, [page, fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback entry? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/data/feedback/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete failed')
      fetchData(page)
    } catch {
      alert('Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        exportCsv: 'true',
        ...(search ? { search } : {}),
        ...(ratingFilter ? { rating: ratingFilter } : {}),
        ...(hasTextFilter ? { hasText: hasTextFilter } : {}),
      })
      const res = await fetch(`/api/admin/data/feedback?${params}`)
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feedback-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search review or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-56"
        />
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} star{r !== 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <select
          value={hasTextFilter}
          onChange={(e) => setHasTextFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All entries</option>
          <option value="true">Has review text</option>
        </select>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : '⬇ Export CSV'}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No feedback found</div>
      ) : (
        <>
          <div className="text-xs text-gray-400 mb-2">{data.total} total entries</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3 border-b font-semibold text-gray-600">Rating</th>
                  <th className="p-3 border-b font-semibold text-gray-600">Review</th>
                  <th className="p-3 border-b font-semibold text-gray-600">User</th>
                  <th className="p-3 border-b font-semibold text-gray-600">Page</th>
                  <th className="p-3 border-b font-semibold text-gray-600">Date</th>
                  <th className="p-3 border-b font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Stars rating={row.rating} />
                    </td>
                    <td className="p-3 max-w-xs">
                      {row.review ? (
                        <span className="line-clamp-2 text-gray-700">{row.review}</span>
                      ) : (
                        <span className="text-gray-300 italic">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.user ? (
                        <div>
                          <div className="font-medium text-gray-800">
                            {row.user.name ?? row.user.email}
                          </div>
                          <div className="text-xs text-gray-500">{row.user.email}</div>
                          <Badge
                            plan={row.user.subscriptionPlan}
                            status=""
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Anonymous</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.pageUrl ? (
                        <span className="text-xs text-gray-500 truncate max-w-[120px] block">
                          {row.pageUrl.replace(/^https?:\/\/[^/]+/, '')}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmt(row.submittedAt)}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="text-red-400 hover:text-red-600 text-xs disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </div>
  )
}

// ───── User Detail Panel ──────────────────────────────────────────────────────

function UserDetailPanel({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setUser(null)
    fetch(`/api/admin/data/users/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setUser)
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">User Detail</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {loading && <div className="text-center py-8 text-gray-400">Loading…</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}

        {user && (
          <>
            {/* Profile */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xl font-semibold text-gray-800 mb-1">
                {user.name ?? '(no name)'}
              </div>
              <div className="text-sm text-gray-600 mb-2">{user.email}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge plan={user.subscriptionPlan} status={user.subscriptionStatus} />
                {user.promoCodeUsed && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    Promo: {user.promoCodeUsed}
                  </span>
                )}
                {user.isTester && (
                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">
                    Tester
                  </span>
                )}
                {user.joinedViaQrCode && (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                    📲 QR Code Signup
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tests Taken', value: user.testCount },
                { label: 'Active Time', value: `${user.totalTimeMinutes} min` },
                { label: 'Last Active', value: fmt(user.lastActiveDate) },
              ].map((s) => (
                <div key={s.label} className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="font-bold text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Dates */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>
                <span className="font-medium">Joined:</span> {fmt(user.createdAt)}
              </div>
              {user.currentPeriodEnd && (
                <div>
                  <span className="font-medium">Period ends:</span>{' '}
                  {fmt(user.currentPeriodEnd)}
                </div>
              )}
              {user.feedbackSubmittedAt && (
                <div>
                  <span className="font-medium">First feedback:</span>{' '}
                  {fmt(user.feedbackSubmittedAt)}
                </div>
              )}
            </div>

            {/* Test History */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">
                Test History ({user.testResults.length})
              </h4>
              {user.testResults.length === 0 ? (
                <p className="text-sm text-gray-400">No tests taken</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {user.testResults.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-sm border-b pb-1"
                    >
                      <span className="text-gray-700 truncate">
                        {t.practiceTest?.name ?? t.practiceTestId ?? 'Practice Test'}
                      </span>
                      <span className="font-semibold text-blue-700 ml-3 whitespace-nowrap">
                        {t.score}%
                      </span>
                      <span className="text-xs text-gray-400 ml-3 whitespace-nowrap">
                        {fmt(t.completedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">
                Feedback ({user.feedback.length})
              </h4>
              {user.feedback.length === 0 ? (
                <p className="text-sm text-gray-400">No feedback submitted</p>
              ) : (
                <div className="space-y-2">
                  {user.feedback.map((f) => (
                    <div key={f.id} className="bg-yellow-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Stars rating={f.rating} />
                        <span className="text-xs text-gray-400">{fmt(f.submittedAt)}</span>
                      </div>
                      {f.review && <p className="text-gray-700">{f.review}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ───── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab() {
  const [data, setData] = useState<UsersPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [qrOnly, setQrOnly] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const buildParams = useCallback(
    (p: number) =>
      new URLSearchParams({
        page: String(p),
        limit: '20',
        sortBy,
        sortDir,
        ...(search ? { search } : {}),
        ...(planFilter ? { plan: planFilter } : {}),
        ...(qrOnly ? { qrOnly: 'true' } : {}),
      }).toString(),
    [search, planFilter, qrOnly, sortBy, sortDir]
  )

  const fetchData = useCallback(
    async (p: number) => {
      try {
        setLoading(true)
        const res = await fetch(`/api/admin/data/users?${buildParams(p)}`)
        if (!res.ok) throw new Error('fetch failed')
        setData(await res.json())
        setError(null)
      } catch {
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    },
    [buildParams]
  )

  useEffect(() => {
    setPage(1)
    fetchData(1)
  }, [search, planFilter, qrOnly, sortBy, sortDir, fetchData])

  useEffect(() => {
    fetchData(page)
  }, [page, fetchData])

  const SortBtn = ({
    field,
    label,
  }: {
    field: string
    label: string
  }) => (
    <button
      onClick={() => {
        if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        else { setSortBy(field); setSortDir('desc') }
      }}
      className="flex items-center gap-1 hover:text-blue-700 font-semibold"
    >
      {label}
      {sortBy === field && (
        <span className="text-blue-500">{sortDir === 'desc' ? '↓' : '↑'}</span>
      )}
    </button>
  )

  return (
    <>
      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-56"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <button
          onClick={() => setQrOnly((v) => !v)}
          className={`px-3 py-2 rounded-lg text-sm border font-medium transition-colors ${
            qrOnly
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-violet-400'
          }`}
        >
          📲 QR Only
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !data || data.data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No users found</div>
      ) : (
        <>
          <div className="text-xs text-gray-400 mb-2">{data.total} total users</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="p-3 border-b">
                    <SortBtn field="name" label="Name" />
                  </th>
                  <th className="p-3 border-b">
                    <SortBtn field="subscriptionPlan" label="Plan" />
                  </th>
                  <th className="p-3 border-b">
                    <SortBtn field="testCount" label="Tests" />
                  </th>
                  <th className="p-3 border-b">
                    <SortBtn field="totalTimeMinutes" label="Time" />
                  </th>
                  <th className="p-3 border-b">
                    <SortBtn field="lastActiveDate" label="Last Active" />
                  </th>
                  <th className="p-3 border-b">
                    <SortBtn field="createdAt" label="Joined" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-blue-50 cursor-pointer"
                    onClick={() => setSelectedUserId(row.id)}
                  >
                    <td className="p-3">
                      <div className="font-medium text-gray-800 flex items-center gap-1">
                        {row.name ?? '(no name)'}
                        {row.joinedViaQrCode && (
                          <span title="Joined via QR code" className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">📲 QR</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{row.email}</div>
                      {row.isTester && (
                        <span className="text-xs text-cyan-600 font-medium">tester</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge plan={row.subscriptionPlan} status={row.subscriptionStatus} />
                      {row.promoCodeUsed && (
                        <div className="text-xs text-purple-600 mt-0.5">
                          {row.promoCodeUsed}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium text-gray-700">{row.testCount}</td>
                    <td className="p-3 text-gray-600">
                      {row.totalTimeMinutes > 0 ? `${row.totalTimeMinutes}m` : '—'}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {fmt(row.lastActiveDate)}
                    </td>
                    <td className="p-3 text-xs text-gray-500">{fmt(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </>
  )
}

// ───── Main Page ──────────────────────────────────────────────────────────────

// ── new types ──
interface PageAnalyticsRow {
  pagePath: string
  visits: number
  totalDwellMs: number
  avgDwellMs: number
  uniqueUsers: number
}

interface EventRow {
  eventName: string
  eventType: string
  count: number
  uniqueUsers: number
}

interface LearningRow {
  category: string
  drills: number
  completedDrills: number
  totalQuestions: number
  correctAnswers: number
  avgScore: number
  avgTimeMs: number
  accuracy: number
}

interface HeatmapPoint {
  xPct: number
  yPct: number
  eventType: string
}

interface HeatmapData {
  page: string
  days: number
  total: number
  points: HeatmapPoint[]
  availablePages: { pagePath: string; count: number }[]
}

// ── Day range selector ──
function DaySelector({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <div className="flex gap-1 mb-5">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            days === d
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  )
}

function fmtMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

// ───── Pages Tab ──────────────────────────────────────────────────────────────

function PagesTab() {
  const [data, setData] = useState<PageAnalyticsRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/data/page-analytics?days=${days}&limit=30`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d.rows); setError(null) })
      .catch(() => setError('Failed to load page analytics'))
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div>
      <DaySelector days={days} onChange={setDays} />
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No page view data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="p-3 border-b font-semibold">Page</th>
                <th className="p-3 border-b font-semibold">Visits</th>
                <th className="p-3 border-b font-semibold">Unique Users</th>
                <th className="p-3 border-b font-semibold">Avg Time</th>
                <th className="p-3 border-b font-semibold">Total Time</th>
                <th className="p-3 border-b font-semibold w-48">Time Bar</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const maxTotal = data[0]?.totalDwellMs || 1
                const pct = Math.round((row.totalDwellMs / maxTotal) * 100)
                return (
                  <tr key={row.pagePath} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs text-indigo-700">{row.pagePath}</td>
                    <td className="p-3 font-medium text-gray-800">{row.visits}</td>
                    <td className="p-3 text-gray-600">{row.uniqueUsers}</td>
                    <td className="p-3 text-gray-600">{fmtMs(row.avgDwellMs)}</td>
                    <td className="p-3 text-gray-600">{fmtMs(row.totalDwellMs)}</td>
                    <td className="p-3">
                      <div className="bg-gray-100 rounded-full h-2 w-full">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ───── Learning Tab ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  algebra: 'Algebra',
  'advanced-math': 'Advanced Math',
  geometry: 'Geometry',
  'problem-solving-data-analysis': 'Data Analysis',
  statistics: 'Statistics',
  'reading-comprehension': 'Reading',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  'writing-language': 'Writing',
  mixed: 'Mixed',
}

function AccuracyCell({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? 'text-green-700 bg-green-50' :
    pct >= 60 ? 'text-yellow-700 bg-yellow-50' :
    'text-red-700 bg-red-50'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  )
}

function LearningTab() {
  const [data, setData] = useState<LearningRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/data/learning?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d.rows); setError(null) })
      .catch(() => setError('Failed to load learning data'))
      .finally(() => setLoading(false))
  }, [days])

  const totalQuestions = data?.reduce((s, r) => s + r.totalQuestions, 0) ?? 0
  const totalDrills = data?.reduce((s, r) => s + r.drills, 0) ?? 0

  return (
    <div>
      <DaySelector days={days} onChange={setDays} />
      {!loading && !error && data && (
        <div className="flex gap-4 mb-5 flex-wrap">
          <div className="bg-indigo-50 rounded-xl p-3 text-center min-w-[100px]">
            <div className="text-xl font-bold text-indigo-800">{totalDrills}</div>
            <div className="text-xs text-indigo-600">total drills</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center min-w-[100px]">
            <div className="text-xl font-bold text-blue-800">{totalQuestions}</div>
            <div className="text-xs text-blue-600">questions answered</div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No drill data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="p-3 border-b font-semibold">Topic</th>
                <th className="p-3 border-b font-semibold">Drills</th>
                <th className="p-3 border-b font-semibold">Completed</th>
                <th className="p-3 border-b font-semibold">Questions</th>
                <th className="p-3 border-b font-semibold">Accuracy</th>
                <th className="p-3 border-b font-semibold">Avg Score</th>
                <th className="p-3 border-b font-semibold">Avg Time/Q</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.category} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">
                    {CATEGORY_LABELS[row.category] ?? row.category}
                  </td>
                  <td className="p-3 text-gray-600">{row.drills}</td>
                  <td className="p-3 text-gray-600">{row.completedDrills}</td>
                  <td className="p-3 font-medium text-gray-800">{row.totalQuestions}</td>
                  <td className="p-3">
                    <AccuracyCell pct={row.accuracy} />
                  </td>
                  <td className="p-3 text-gray-600">{row.avgScore}%</td>
                  <td className="p-3 text-gray-600">{fmtMs(row.avgTimeMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ───── Heatmap Canvas ─────────────────────────────────────────────────────────

function HeatmapCanvas({ points }: { points: HeatmapPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)
    // bg
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, W, H)
    // border
    ctx.strokeStyle = '#d1d5db'
    ctx.strokeRect(0, 0, W, H)

    // label
    ctx.fillStyle = '#9ca3af'
    ctx.font = '11px sans-serif'
    ctx.fillText('viewport', 6, 14)

    // dots
    for (const pt of points) {
      const x = (pt.xPct / 100) * W
      const y = (pt.yPct / 100) * H
      ctx.beginPath()
      ctx.arc(x, y, pt.eventType === 'click' ? 4 : 2, 0, Math.PI * 2)
      ctx.fillStyle = pt.eventType === 'click'
        ? 'rgba(59,130,246,0.35)'
        : 'rgba(245,158,11,0.25)'
      ctx.fill()
    }
  }, [points])

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
        <span><span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1 align-middle" />click</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-1 align-middle" />mouse move</span>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={380}
        className="border rounded-xl w-full max-w-2xl"
        style={{ aspectRatio: '600 / 380' }}
      />
    </div>
  )
}

// ───── Activity Tab ───────────────────────────────────────────────────────────

function ActivityTab() {
  const [days, setDays] = useState(30)

  // Events section
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)

  // Heatmap section
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [heatmapPage, setHeatmapPage] = useState('/')
  const [heatmapType, setHeatmapType] = useState<'all' | 'click' | 'move'>('all')
  const [heatmapLoading, setHeatmapLoading] = useState(true)
  const [heatmapError, setHeatmapError] = useState<string | null>(null)

  // Load events
  useEffect(() => {
    setEventsLoading(true)
    fetch(`/api/admin/data/events?days=${days}&limit=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setEvents(d.rows); setEventsError(null) })
      .catch(() => setEventsError('Failed to load events'))
      .finally(() => setEventsLoading(false))
  }, [days])

  // Load heatmap
  useEffect(() => {
    setHeatmapLoading(true)
    const params = new URLSearchParams({
      page: heatmapPage,
      type: heatmapType,
      days: String(days),
    })
    fetch(`/api/admin/data/heatmap?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setHeatmap(d); setHeatmapError(null) })
      .catch(() => setHeatmapError('Failed to load heatmap'))
      .finally(() => setHeatmapLoading(false))
  }, [heatmapPage, heatmapType, days])

  return (
    <div className="space-y-10">
      <DaySelector days={days} onChange={setDays} />

      {/* Section 1: Button Clicks */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🖱️ Button &amp; Link Clicks</h3>
        {eventsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading…</div>
        ) : eventsError ? (
          <div className="text-center py-8 text-red-500">{eventsError}</div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No events yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="p-3 border-b font-semibold">Event Name</th>
                  <th className="p-3 border-b font-semibold">Type</th>
                  <th className="p-3 border-b font-semibold">Count</th>
                  <th className="p-3 border-b font-semibold">Unique Users</th>
                  <th className="p-3 border-b font-semibold w-40">Frequency Bar</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => {
                  const maxCount = events[0]?.count || 1
                  const pct = Math.round((e.count / maxCount) * 100)
                  return (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{e.eventName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {e.eventType}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-gray-800">{e.count}</td>
                      <td className="p-3 text-gray-600">{e.uniqueUsers}</td>
                      <td className="p-3">
                        <div className="bg-gray-100 rounded-full h-2 w-full">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Click Heatmap */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🔥 Click &amp; Mouse Heatmap</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Page selector */}
          <select
            value={heatmapPage}
            onChange={(e) => setHeatmapPage(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {heatmap?.availablePages.length ? (
              heatmap.availablePages.map((p) => (
                <option key={p.pagePath} value={p.pagePath}>
                  {p.pagePath} ({p.count})
                </option>
              ))
            ) : (
              <option value="/">/</option>
            )}
          </select>

          {/* Type filter */}
          {(['all', 'click', 'move'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setHeatmapType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                heatmapType === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}

          {heatmap && (
            <span className="text-xs text-gray-400 self-center">
              {heatmap.total} data points
            </span>
          )}
        </div>

        {heatmapLoading ? (
          <div className="text-center py-8 text-gray-400">Loading heatmap…</div>
        ) : heatmapError ? (
          <div className="text-center py-8 text-red-500">{heatmapError}</div>
        ) : !heatmap || heatmap.points.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No pointer data for this page yet. Data will appear after users browse the site.
          </div>
        ) : (
          <HeatmapCanvas points={heatmap.points} />
        )}
      </div>
    </div>
  )
}

export default function AdminDataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'feedback' | 'users' | 'pages' | 'learning' | 'activity'>('feedback')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryError, setSummaryError] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
    if (
      session?.user?.email &&
      !ADMIN_EMAILS.includes(session.user.email)
    ) {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetch('/api/admin/data/summary')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setSummary)
        .catch(() => setSummaryError(true))
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Data Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                User metrics, feedback, and activity
              </p>
            </div>
            <a
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              ← Admin Home
            </a>
          </div>

          {/* Summary Cards */}
          {summaryError ? (
            <div className="mb-8 text-sm text-red-400">
              Could not load summary stats
            </div>
          ) : summary ? (
            <SummaryCards summary={summary} />
          ) : (
            <div className="mb-8 h-24 flex items-center justify-center text-gray-400 text-sm">
              Loading summary…
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b mb-6">
            {([
              { key: 'feedback', label: '💬 Feedback' },
              { key: 'users', label: '👥 Users' },
              { key: 'pages', label: '📄 Pages' },
              { key: 'learning', label: '📚 Learning' },
              { key: 'activity', label: '🖱️ Activity' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                  tab === key
                    ? 'bg-white border border-b-white text-blue-700 border-gray-200 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'feedback' && <FeedbackTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'pages' && <PagesTab />}
          {tab === 'learning' && <LearningTab />}
          {tab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  )
}
