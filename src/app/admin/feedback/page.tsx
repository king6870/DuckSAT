'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Star, User, Globe, Trash2, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

interface FeedbackEntry {
  id: string
  rating: number
  review: string | null
  pageUrl: string | null
  userAgent: string | null
  submittedAt: string
  sessionId: string | null
  user: { id: string; name: string | null; username: string | null; email: string | null; image: string | null } | null
}

interface Summary {
  total: number
  averageRating: number
  ratingCounts: Record<string, number>
  withReview: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function StarRow({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-gray-500">{rating}</span>
      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-gray-500">{count}</span>
    </div>
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default function AdminFeedbackPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const isAdmin =
    session?.user?.email && ADMIN_EMAILS.includes(session.user.email)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    else if (status === 'authenticated' && !isAdmin) router.push('/')
  }, [status, isAdmin, router])

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (ratingFilter) params.set('rating', String(ratingFilter))
      const res = await fetch(`/api/admin/feedback?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEntries(data.feedback)
      setSummary(data.summary)
      setPagination(data.pagination)
    } catch (e) {
      setError('Failed to load feedback.')
    } finally {
      setLoading(false)
    }
  }, [page, ratingFilter])

  useEffect(() => {
    if (isAdmin) fetchFeedback()
  }, [isAdmin, fetchFeedback])

  async function deleteFeedback(id: string) {
    if (!confirm('Delete this feedback entry?')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      setEntries((prev) => prev.filter((e) => e.id !== id))
      if (summary) setSummary({ ...summary, total: summary.total - 1 })
    } catch {
      alert('Failed to delete.')
    } finally {
      setDeleting(null)
    }
  }

  if (status === 'loading' || (status === 'authenticated' && !isAdmin)) return null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">User ratings and reviews from the feedback widget</p>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-gray-400">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-gray-400">
                <Star className="w-4 h-4" />
                <span className="text-xs font-medium">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.averageRating.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-gray-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">With Review</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.withReview}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-1 pt-3">
              {[5, 4, 3, 2, 1].map((r) => (
                <StarRow key={r} rating={r} count={summary.ratingCounts[r] ?? 0} total={summary.total} />
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Filter by rating:</span>
          <button
            onClick={() => { setRatingFilter(null); setPage(1) }}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${ratingFilter === null ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => { setRatingFilter(r); setPage(1) }}
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${ratingFilter === r ? 'bg-yellow-400 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-yellow-300'}`}
            >
              {r} <Star className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : error ? (
            <p className="text-center py-16 text-red-500">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-center py-16 text-gray-400">No feedback entries found.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <div key={entry.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <RatingStars rating={entry.rating} />
                        <span className="text-xs text-gray-400">
                          {new Date(entry.submittedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {entry.review && (
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed italic">
                          &ldquo;{entry.review}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {entry.user
                            ? `${entry.user.name ?? entry.user.username ?? 'Unknown'} (${entry.user.email ?? 'no email'})`
                            : `Anonymous (session: ${entry.sessionId?.slice(0, 8) ?? 'n/a'})`}
                        </span>
                        {entry.pageUrl && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {entry.pageUrl}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteFeedback(entry.id)}
                      disabled={deleting === entry.id}
                      className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
