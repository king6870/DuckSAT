"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { Star, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

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
  imageData?: string | null
  imageMimeType?: string | null
  chartData?: Record<string, unknown> | null
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

export default function EnhancedQuestionsReview() {
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
  const [searchText, setSearchText] = useState<string>('')
  const [diagramAccurate, setDiagramAccurate] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [mathJaxLoaded, setMathJaxLoaded] = useState(false)

  // Render LaTeX content
  const renderLatex = (text: string) => {
    return text
  }

  // Trigger MathJax to process content
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).MathJax && mathJaxLoaded && questions.length > 0) {
      ; (window as any).MathJax?.typesetPromise?.().catch((err: Error) => console.error('MathJax error:', err))
    }
  }, [questions, mathJaxLoaded])

  // Format image data URL
  const getImageDataUrl = (question: Question) => {
    if (question.imageData) {
      if (question.imageData.startsWith('data:')) {
        return question.imageData
      }
      const mimeType = question.imageMimeType || 'image/png'
      return `data:${mimeType};base64,${question.imageData}`
    }
    return question.imageUrl
  }

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
    if (status === 'authenticated' && session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      fetchQuestions()
    }
  }, [status, session, statusFilter, categoryFilter, subtopicFilter])

  // Filter questions by search text
  const filteredQuestions = searchText.trim().length === 0
    ? questions
    : questions.filter(q => {
        const text = [q.question, q.passage, ...(q.options || [])].join(' ').toLowerCase();
        return text.includes(searchText.toLowerCase());
      });

  const handleReview = async (questionId: string, reviewStatus: 'approved' | 'rejected') => {
    if (reviewRating === 0) {
      setError('Please select a star rating before submitting')
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
          reviewStatus,
          reviewRating,
          diagramAccurate,
          reviewComments: reviewComments.trim() || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update question')
      }

      // Update local state
      setQuestions(prev => prev.map(q =>
        q.id === questionId
          ? {
            ...q,
            reviewStatus,
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-3xl shadow-2xl">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 text-lg">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: pagination?.total || 0,
    pending: questions.filter(q => !q.reviewStatus || q.reviewStatus === 'pending').length,
    approved: questions.filter(q => q.reviewStatus === 'approved').length,
    rejected: questions.filter(q => q.reviewStatus === 'rejected').length,
    rejectionRate: questions.length > 0 ? Math.round((questions.filter(q => q.reviewStatus === 'rejected').length / questions.length) * 100) : 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Back to Home button */}
      <div className="fixed left-4 top-4 z-50">
        <button
          onClick={() => router.push('/')}
          className="bg-white/90 border border-gray-200 shadow px-4 py-2 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 hover:shadow-md transition-all"
        >
          🏠 Back to Home
        </button>
      </div>
      <Script
        id="mathjax-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
              },
              options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
              },
              startup: {
                pageReady: () => {
                  return window.MathJax.startup.defaultPageReady().then(() => {
                    console.log('MathJax initial typesetting complete');
                  });
                }
              }
            };
          `
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
        strategy="afterInteractive"
        onLoad={() => setMathJaxLoaded(true)}
      />

      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white flex items-center gap-4">
                <span className="text-6xl md:text-7xl">📝</span>
                Question Review Dashboard
              </h1>
              <p className="mt-4 text-xl md:text-2xl text-indigo-100">
                Review and approve AI-generated SAT questions with confidence
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-all duration-200 border border-white/30 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <ChevronLeft size={20} />
              Back
            </button>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Total Questions</p>
                  <p className="text-5xl font-bold text-white mt-3">{stats.total}</p>
                </div>
                <div className="text-6xl opacity-40">📊</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Pending Review</p>
                  <p className="text-5xl font-bold text-white mt-3">{stats.pending}</p>
                </div>
                <div className="text-6xl opacity-40">⏳</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Approved</p>
                  <p className="text-5xl font-bold text-white mt-3">{stats.approved}</p>
                </div>
                <div className="text-6xl opacity-40">✅</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Rejection Rate</p>
                  <p className="text-5xl font-bold text-white mt-3">{stats.rejectionRate}%</p>
                </div>
                <div className="text-6xl opacity-40">📉</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Search Bar */}
        <div className="mb-8 flex flex-col md:flex-row items-center gap-4">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search questions, passages, or options..."
            className="w-full md:w-1/2 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-medium"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sticky top-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Filter size={24} className="text-indigo-600" />
                  Filters
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-medium"
                  >
                    <option value="">All Categories</option>
                    <option value="reading-comprehension">📖 Reading</option>
                    <option value="writing">✍️ Writing</option>
                    <option value="algebra">🔢 Algebra</option>
                    <option value="geometry">📐 Geometry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Subtopic</label>
                  <input
                    type="text"
                    value={subtopicFilter}
                    onChange={(e) => setSubtopicFilter(e.target.value)}
                    placeholder="Search subtopic..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <button
                  onClick={() => fetchQuestions(1)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform"
                >
                  Apply Filters
                </button>

                {(statusFilter || categoryFilter || subtopicFilter) && (
                  <button
                    onClick={() => {
                      setStatusFilter('')
                      setCategoryFilter('')
                      setSubtopicFilter('')
                    }}
                    className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Error Display */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-3xl p-6 mb-8 shadow-xl">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">❌</div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-800">Error</h3>
                    <p className="text-red-700 mt-1 text-lg">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Questions List */}
            {loading ? (
              <div className="bg-white rounded-3xl shadow-2xl p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
                  <p className="mt-6 text-xl text-gray-600 font-medium">Loading questions...</p>
                </div>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-2xl p-16 text-center">
                <div className="text-8xl mb-6">🔍</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Questions Found</h3>
                <p className="text-xl text-gray-600">Try adjusting your filters or search to see more results.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border-2 border-gray-100 hover:border-indigo-200 transform hover:scale-[1.02]">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-md ${question.moduleType === 'math' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          }`}>
                          {question.moduleType}
                        </span>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-md ${question.difficulty === 'easy' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                            question.difficulty === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' :
                              'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                          }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-sm text-gray-700 font-bold bg-gray-100 px-4 py-2 rounded-full">{question.category}</span>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-md ${question.reviewStatus === 'approved' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                          question.reviewStatus === 'rejected' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' :
                            'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
                        }`}>
                        {question.reviewStatus === 'approved' ? '✅ Approved' : question.reviewStatus === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                      </span>
                    </div>

                    {/* Passage */}
                    {question.passage && (
                      <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-3 text-lg uppercase tracking-wide">📖 Passage</h4>
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">{question.passage}</p>
                      </div>
                    )}

                    {/* Question */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3 text-lg uppercase tracking-wide">❓ Question</h4>
                      <div
                        className="text-gray-900 text-xl leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderLatex(question.question) }}
                      />
                    </div>

                    {/* Diagram Display */}
                    {(question.imageData || question.imageUrl) && (
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-3 text-lg uppercase tracking-wide">📊 Diagram</h4>
                        <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white flex justify-center shadow-inner">
                          <img
                            src={getImageDataUrl(question) || undefined}
                            alt="Question diagram"
                            className="max-w-full h-auto max-h-96 rounded-xl shadow-md"
                          />
                        </div>
                        {question.chartData && (question.chartData as { description?: string }).description && (
                          <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-4 rounded-xl border border-gray-200 italic">
                            <strong>Description:</strong> {(question.chartData as { description?: string }).description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Options */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3 text-lg uppercase tracking-wide">📋 Answer Choices</h4>
                      <div className="space-y-3">
                        {question.options.map((option, index) => (
                          <div key={index} className={`p-4 rounded-2xl border-2 transition-all duration-200 ${index === question.correctAnswer
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                            }`}>
                            <div className="flex gap-4 items-start">
                              <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${index === question.correctAnswer ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700'
                                }`}>
                                {String.fromCharCode(65 + index)}
                              </span>
                              <div className="flex-grow">
                                <span
                                  className="text-gray-900 text-lg"
                                  dangerouslySetInnerHTML={{ __html: renderLatex(option) }}
                                />
                                {index === question.correctAnswer && (
                                  <span className="ml-3 text-green-600 font-bold text-sm">✓ CORRECT ANSWER</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-3 text-lg uppercase tracking-wide">💡 Explanation</h4>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200">
                        <div
                          className="text-gray-800 leading-relaxed text-lg"
                          dangerouslySetInnerHTML={{ __html: renderLatex(question.explanation) }}
                        />
                      </div>
                    </div>

                    {/* Review Section */}
                    {reviewingQuestion === question.id ? (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border-2 border-indigo-200">
                        <h4 className="font-bold text-indigo-900 mb-6 text-2xl flex items-center gap-3">
                          <Star size={28} className="text-indigo-600" fill="currentColor" />
                          Submit Your Review
                        </h4>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Rating (Required)</label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setReviewRating(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  className="transition-transform hover:scale-125"
                                >
                                  <Star
                                    size={40}
                                    className={`${star <= (hoverRating || reviewRating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                      } transition-colors`}
                                    fill={star <= (hoverRating || reviewRating) ? 'currentColor' : 'none'}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center gap-3 cursor-pointer bg-white p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 transition-all">
                              <input
                                type="checkbox"
                                checked={diagramAccurate}
                                onChange={(e) => setDiagramAccurate(e.target.checked)}
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-4 focus:ring-indigo-200"
                              />
                              <span className="text-lg font-semibold text-gray-900">Diagram is accurate</span>
                            </label>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Comments (Optional)</label>
                            <textarea
                              value={reviewComments}
                              onChange={(e) => setReviewComments(e.target.value)}
                              placeholder="Add your review comments here..."
                              rows={4}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all resize-none text-lg"
                            />
                          </div>

                          <div className="flex gap-4">
                            <button
                              onClick={() => handleReview(question.id, 'approved')}
                              disabled={submitting}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform"
                            >
                              {submitting ? '...' : '✅ Approve'}
                            </button>
                            <button
                              onClick={() => handleReview(question.id, 'rejected')}
                              disabled={submitting}
                              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:from-red-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform"
                            >
                              {submitting ? '...' : '❌ Reject'}
                            </button>
                            <button
                              onClick={() => {
                                setReviewingQuestion(null)
                                setReviewComments('')
                                setReviewRating(0)
                                setDiagramAccurate(false)
                              }}
                              className="px-6 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-300 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingQuestion(question.id)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 transform"
                      >
                        📝 Review This Question
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-10 flex justify-center items-center gap-4">
                <button
                  onClick={() => fetchQuestions(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-white px-6 py-3 rounded-xl font-bold text-gray-700 hover:bg-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                <span className="bg-white px-6 py-3 rounded-xl font-bold text-gray-900 shadow-lg">
                  Page {currentPage} of {pagination.pages}
                </span>

                <button
                  onClick={() => fetchQuestions(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className="bg-white px-6 py-3 rounded-xl font-bold text-gray-700 hover:bg-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
