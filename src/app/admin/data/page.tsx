"use client"

import { useState, useEffect, useCallback } from 'react'
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
      }).toString(),
    [search, planFilter, sortBy, sortDir]
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
  }, [search, planFilter, sortBy, sortDir, fetchData])

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
                      <div className="font-medium text-gray-800">
                        {row.name ?? '(no name)'}
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

export default function AdminDataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'feedback' | 'users'>('feedback')
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
          <div className="flex gap-1 border-b mb-6">
            {(['feedback', 'users'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-semibold capitalize rounded-t-lg transition-colors ${
                  tab === t
                    ? 'bg-white border border-b-white text-blue-700 border-gray-200 -mb-px'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'feedback' ? '💬 Feedback' : '👥 Users'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'feedback' ? <FeedbackTab /> : <UsersTab />}
        </div>
      </div>
    </div>
  )
}
