"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import Image from 'next/image'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

interface Question {
  id: string
  question: string
  passage?: string | null
  options: string[]
  correctAnswer: number
  explanation: string
  moduleType: string
  category: string
  subtopic: string
  difficulty: string
  reviewStatus: string | null
  reviewComments: string | null
  reviewRating?: number | null
  diagramAccurate?: boolean | null
  imageUrl?: string | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function ValidateQuestionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reviewComments, setReviewComments] = useState('')
  const [reviewRating, setReviewRating] = useState<number>(3)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (session?.user?.email) {
      const userEmail = session.user.email;
      const isAdmin = ADMIN_EMAILS.includes(userEmail);
      if (!isAdmin) {
        router.push('/')
      } else {
        fetchPendingQuestions(currentPage)
      }
    }
  }, [session, status, currentPage, router])

  const fetchPendingQuestions = async (page: number) => {
    try {
      setLoading(true)
      const url = `/api/admin/questions?page=${page}&limit=10&status=pending`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch pending questions')
      const data = await res.json()
      setQuestions(data.questions || [])
      setPagination(data.pagination)
    } catch (err) {
      setError('Failed to load pending questions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedQuestion) return
    
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          reviewStatus: 'approved',
          reviewComments: reviewComments || 'Question approved',
          reviewRating: reviewRating,
          diagramAccurate: !!selectedQuestion.imageUrl
        })
      })

      if (!res.ok) throw new Error('Failed to approve question')
      
      // Refresh list and close modal
      await fetchPendingQuestions(currentPage)
      setSelectedQuestion(null)
      setReviewComments('')
      setReviewRating(3)
    } catch (err) {
      setError('Failed to approve question')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!selectedQuestion) return
    
    if (!reviewComments.trim()) {
      setError('Please provide a reason for rejection')
      return
    }
    
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          reviewStatus: 'rejected',
          reviewComments: reviewComments,
          reviewRating: reviewRating,
          diagramAccurate: false
        })
      })

      if (!res.ok) throw new Error('Failed to reject question')
      
      // Refresh list and close modal
      await fetchPendingQuestions(currentPage)
      setSelectedQuestion(null)
      setReviewComments('')
      setReviewRating(3)
    } catch (err) {
      setError('Failed to reject question')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Validate Questions</h1>
              <p className="mt-1 text-gray-500">Review AI-generated questions pending approval</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors font-medium shadow-sm"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-900">×</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-50 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {questions.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500">No questions pending validation</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {questions.map((question) => (
                <div key={question.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {question.moduleType}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">{question.category}</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{question.question}</h3>
                      {question.passage && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <p className="text-sm text-gray-700 line-clamp-3">{question.passage}</p>
                        </div>
                      )}
                      <div className="space-y-1 mb-3">
                        {question.options.map((option, idx) => (
                          <div 
                            key={idx}
                            className={`text-sm p-2 rounded ${
                              idx === question.correctAnswer 
                                ? 'bg-green-50 text-green-900 font-medium' 
                                : 'text-gray-700'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}. {option}
                          </div>
                        ))}
                      </div>
                      {question.reviewComments && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-900">
                          <strong>Review Note:</strong> {question.reviewComments}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedQuestion(question)
                          setReviewComments(question.reviewComments || '')
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage === pagination.pages}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Review Question</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Question Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {selectedQuestion.moduleType}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    selectedQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    selectedQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedQuestion.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">{selectedQuestion.category}</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedQuestion.question}</h3>
                
                {selectedQuestion.passage && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedQuestion.passage}</p>
                  </div>
                )}
                
                <div className="space-y-2 mb-4">
                  {selectedQuestion.options.map((option, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg ${
                        idx === selectedQuestion.correctAnswer 
                          ? 'bg-green-50 border border-green-200 text-green-900 font-medium' 
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}. {option}
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                  <p className="text-sm text-blue-800">{selectedQuestion.explanation}</p>
                </div>

                {selectedQuestion.imageUrl && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Generated Image:</h4>
                    <div className="relative w-full" style={{ minHeight: '200px' }}>
                      <Image 
                        src={selectedQuestion.imageUrl} 
                        alt="Question diagram"
                        width={800}
                        height={600}
                        className="rounded-lg border border-gray-200"
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Review Form */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Rating (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(parseInt(e.target.value))}
                  className="w-full mb-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>Poor (1)</span>
                  <span className="font-medium text-base text-gray-900">{reviewRating}</span>
                  <span>Excellent (5)</span>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Add feedback about this question..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSelectedQuestion(null)
                  setReviewComments('')
                  setReviewRating(3)
                }}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
