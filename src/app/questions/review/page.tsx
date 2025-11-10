"use client"

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Star } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import ChartRenderer from '@/components/ChartRenderer'

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
  imageAlt?: string | null
  chartData?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  subtopicRef?: {
    name: string
  }
}

interface Review {
  id: string
  questionId: string
  userId: string
  rating: number
  description: string | null
  hasDiagram: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function QuestionsReviewPage() {
  const { data: session, status } = useSession()

  const [questions, setQuestions] = useState<Question[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [subtopicFilter, setSubtopicFilter] = useState<string>('')
  const [reviewingQuestion, setReviewingQuestion] = useState<string | null>(null)
  const [reviewComments, setReviewComments] = useState<string>('')
  const [reviewRating, setReviewRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [diagramAccurate, setDiagramAccurate] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [questionReviews, setQuestionReviews] = useState<Record<string, Review[]>>({})
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({})

  const fetchQuestions = async (page = 1) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((page - 1) * 20).toString()
      })

      if (categoryFilter) params.append('category', categoryFilter)
      if (subtopicFilter) params.append('subtopic', subtopicFilter)

      const response = await fetch(`/api/questions?${params}`)
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
    fetchQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, subtopicFilter])

  const fetchReviews = async (questionId: string) => {
    setLoadingReviews(prev => ({ ...prev, [questionId]: true }))
    try {
      const response = await fetch(`/api/questions/${questionId}/review`)
      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }
      const reviews = await response.json()
      setQuestionReviews(prev => ({ ...prev, [questionId]: reviews }))
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setLoadingReviews(prev => ({ ...prev, [questionId]: false }))
    }
  }

  const handleReviewSubmit = async (questionId: string) => {
    // Validate required rating field
    if (reviewRating === 0) {
      setError('Please select a star rating (1-5) before submitting')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/questions/${questionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: reviewRating,
          description: reviewComments.trim() || null,
          hasDiagram: diagramAccurate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      // Reset form
      setReviewingQuestion(null)
      setReviewComments('')
      setReviewRating(0)
      setHoverRating(0)
      setDiagramAccurate(false)

      // Refresh reviews for this question
      fetchReviews(questionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
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

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You must be signed in to review questions.</p>
          <button
            onClick={() => signIn()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Sign In
          </button>
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
            <div>
              <h1 className="text-4xl font-bold text-gray-900">📝 Review Questions</h1>
              <p className="mt-2 text-xl text-gray-600">Share your feedback on SAT practice questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="advanced-math">Advanced Math</option>
                <option value="problem-solving">Problem Solving</option>
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
                  <span className="text-sm text-gray-500">
                    {new Date(question.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Passage (if exists) */}
                {question.passage && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Passage:</h4>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      <MathRenderer block={true}>{question.passage}</MathRenderer>
                    </div>
                  </div>
                )}

                {/* Question */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
                  <div className="text-gray-800">
                    <MathRenderer>{question.question}</MathRenderer>
                  </div>
                </div>

                {/* Visual: Chart or Image */}
                {(question.chartData || question.imageUrl) && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">{question.chartData ? 'Diagram' : 'Image'}</h4>
                    {question.imageUrl && (
                      <ChartRenderer
                        chartData={question.chartData as Record<string, unknown> | undefined}
                        imageUrl={question.imageUrl}
                        imageAlt={question.imageAlt || 'Question diagram'}
                        className="max-w-full"
                      />
                    )}
                  </div>
                )}

                {/* Options */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Options:</h4>
                  <div className="space-y-1">
                    {question.options.map((option, index) => (
                      <div key={index} className={`p-2 rounded ${
                        index === question.correctAnswer ? 'bg-green-100 border border-green-300' : 'bg-gray-50'
                      }`}>
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
                        <MathRenderer>{option}</MathRenderer>
                        {index === question.correctAnswer && <span className="ml-2 text-green-600 font-semibold">(Correct)</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Explanation:</h4>
                  <div className="text-gray-700">
                    <MathRenderer block={true}>{question.explanation}</MathRenderer>
                  </div>
                </div>

                {/* Display existing reviews */}
                {questionReviews[question.id] && questionReviews[question.id].length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Previous Reviews ({questionReviews[question.id].length})</h4>
                    <div className="space-y-3">
                      {questionReviews[question.id].map((review) => (
                        <div key={review.id} className="bg-white p-3 rounded border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {review.user.name || review.user.email}
                              </span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-600">({review.rating}/5)</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {review.hasDiagram && (
                            <div className="text-xs text-blue-700 mb-1">✓ Has diagram</div>
                          )}
                          {review.description && (
                            <p className="text-sm text-gray-700">{review.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Form */}
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
                          placeholder="Share your thoughts about this question..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReviewSubmit(question.id)}
                          disabled={submitting}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting...' : '✓ Submit Review'}
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setReviewingQuestion(question.id)
                          setReviewComments('')
                          setReviewRating(0)
                          setHoverRating(0)
                          setDiagramAccurate(false)
                          setError(null)
                          // Load existing reviews
                          if (!questionReviews[question.id]) {
                            fetchReviews(question.id)
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                      >
                        📝 Add Review
                      </button>
                      {!questionReviews[question.id] && !loadingReviews[question.id] && (
                        <button
                          onClick={() => fetchReviews(question.id)}
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                        >
                          View Reviews
                        </button>
                      )}
                      {loadingReviews[question.id] && (
                        <span className="text-sm text-gray-500 px-4 py-2">Loading reviews...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination && Math.ceil(pagination.total / pagination.limit) > 1 && (
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
                    Page {currentPage} of {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  <button
                    onClick={() => fetchQuestions(currentPage + 1)}
                    disabled={!pagination.hasMore}
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
