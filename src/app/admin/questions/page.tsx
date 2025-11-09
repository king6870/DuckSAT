"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { ADMIN_EMAILS } from '@/middleware/adminAuth'

interface Question {
  id: string
  moduleType: string
  difficulty: string
  category: string
  subtopic: string | null
  question: string
  passage: string | null
  options: string[]
  correctAnswer: number
  explanation: string
  imageUrl?: string | null
  chartData?: any
  reviewStatus: string | null
  reviewRating?: number | null
  diagramAccurate?: boolean | null
  reviewComments: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  subtopicRef?: {
    name: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function QuestionsReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [questions, setQuestions] = useState<Question[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [subtopicFilter, setSubtopicFilter] = useState<string>('')
  const [reviewingQuestion, setReviewingQuestion] = useState<string | null>(null)
  const [reviewComments, setReviewComments] = useState<string>('')
  const [reviewRating, setReviewRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [diagramAccurate, setDiagramAccurate] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Check admin access
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      if (!ADMIN_EMAILS.includes(session.user.email)) {
        router.push('/admin')
      }
    }
  }, [status, session, router])

  const fetchQuestions = async (page = 1) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (statusFilter) params.append('status', statusFilter)
      if (categoryFilter) params.append('category', categoryFilter)
      if (subtopicFilter) params.append('subtopic', subtopicFilter)

      const response = await fetch(`/api/admin/questions?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchQuestions()
    }
  }, [session, statusFilter, categoryFilter, subtopicFilter])

  const handleReview = async (questionId: string, status: 'approved' | 'rejected') => {
    // Validate required rating field
    if (reviewRating === 0) {
      setError('Please select a star rating (1-5) before submitting')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId,
          reviewStatus: status,
          reviewRating,
          diagramAccurate,
          reviewComments: reviewComments.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update question')
      }

      // Update local state
      setQuestions(prev => prev.map(q =>
        q.id === questionId
          ? { 
              ...q, 
              reviewStatus: status, 
              reviewRating,
              diagramAccurate,
              reviewComments: reviewComments.trim() || null, 
              reviewedBy: session?.user?.email || null, 
              reviewedAt: new Date().toISOString() 
            }
          : q
      ))

      // Reset form
      setReviewingQuestion(null)
      setReviewComments('')
      setReviewRating(0)
      setHoverRating(0)
      setDiagramAccurate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">📝 Question Review</h1>
                <p className="mt-2 text-xl text-gray-600">Review and approve generated SAT questions</p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
              >
                Back to Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="reading-comprehension">Reading Comprehension</option>
                <option value="writing">Writing</option>
                <option value="algebra">Algebra</option>
                <option value="geometry">Geometry</option>
                {/* Add more categories as needed */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic</label>
              <input
                type="text"
                value={subtopicFilter}
                onChange={(e) => setSubtopicFilter(e.target.value)}
                placeholder="Filter by subtopic..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchQuestions(1)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">❌</div>
              <h3 className="text-xl font-bold text-red-800">Error</h3>
            </div>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading questions...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      question.moduleType === 'math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {question.moduleType}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {question.difficulty}
                    </span>
                    <span className="text-sm text-gray-600">{question.category}</span>
                    {question.subtopic && (
                      <span className="text-sm text-gray-500">• {question.subtopic}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      question.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                      question.reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {question.reviewStatus || 'pending'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(question.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Passage (if exists) */}
                {question.passage && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Passage:</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{question.passage}</p>
                  </div>
                )}

                {/* Question */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
                  <p className="text-gray-800">{question.question}</p>
                </div>

                {/* Options */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Options:</h4>
                  <div className="space-y-1">
                    {question.options.map((option, index) => (
                      <div key={index} className={`p-2 rounded ${
                        index === question.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-gray-50'
                      }`}>
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                        {index === question.correctAnswer && <span className="ml-2 text-green-600 font-semibold">(Correct)</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Explanation:</h4>
                  <p className="text-gray-700">{question.explanation}</p>
                </div>

                {/* Review Information */}
                {(question.reviewComments || question.reviewRating || question.reviewedBy) && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Review Information:</h4>
                    {question.reviewRating && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-blue-700 font-medium">Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= question.reviewRating!
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-blue-700">({question.reviewRating}/5)</span>
                      </div>
                    )}
                    {question.diagramAccurate !== null && question.diagramAccurate !== undefined && (
                      <div className="mb-2">
                        <span className="text-sm text-blue-700 font-medium">Diagram: </span>
                        <span className="text-sm text-blue-700">
                          {question.diagramAccurate ? '✓ Accurate' : '✗ Not accurate'}
                        </span>
                      </div>
                    )}
                    {question.reviewComments && (
                      <p className="text-blue-700 mb-2">{question.reviewComments}</p>
                    )}
                    {question.reviewedBy && (
                      <p className="text-sm text-blue-600 mt-1">Reviewed by: {question.reviewedBy}</p>
                    )}
                  </div>
                )}

                {/* Review Actions */}
                {question.reviewStatus !== 'approved' && question.reviewStatus !== 'rejected' && (
                  <div className="border-t pt-4">
                    {reviewingQuestion === question.id ? (
                      <div className="space-y-4">
                        {/* Star Rating - Required */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rating <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                              >
                                <Star
                                  className={`h-8 w-8 transition-colors ${
                                    (hoverRating || reviewRating) >= star
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          {reviewRating > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              You rated: {reviewRating} star{reviewRating > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        {/* Diagram Accuracy Checkbox - Only shown if question has diagram */}
                        {(question.imageUrl || question.chartData) && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`diagram-${question.id}`}
                              checked={diagramAccurate}
                              onChange={(e) => setDiagramAccurate(e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`diagram-${question.id}`} className="text-sm font-medium text-gray-700">
                              Diagram is accurate
                            </label>
                          </div>
                        )}

                        {/* Review Comments - Optional */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comments (Optional)
                          </label>
                          <textarea
                            value={reviewComments}
                            onChange={(e) => setReviewComments(e.target.value)}
                            placeholder="Add review comments..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReview(question.id, 'approved')}
                            disabled={submitting}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Processing...' : '✅ Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(question.id, 'rejected')}
                            disabled={submitting}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Processing...' : '❌ Reject'}
                          </button>
                          <button
                            onClick={() => {
                              setReviewingQuestion(null)
                              setReviewComments('')
                              setReviewRating(0)
                              setHoverRating(0)
                              setDiagramAccurate(false)
                              setError(null)
                            }}
                            disabled={submitting}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setReviewingQuestion(question.id)
                          setReviewComments('')
                          setReviewRating(0)
                          setHoverRating(0)
                          setDiagramAccurate(false)
                          setError(null)
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                      >
                        📝 Review Question
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => fetchQuestions(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">
                    Page {currentPage} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => fetchQuestions(currentPage + 1)}
                    disabled={currentPage === pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
