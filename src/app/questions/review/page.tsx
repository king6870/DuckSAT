"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSession, signIn } from 'next-auth/react'
import ReviewCard from '@/components/ReviewCard'
import FilterPanel, { FilterState } from '@/components/FilterPanel'
import styles from '@/styles/questionReview.module.css'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false)

  // Client-side filters
  const [filters, setFilters] = useState<FilterState>({
    moduleType: '',
    hasDiagram: null,
    minRating: null,
    searchQuery: '',
  })

  const fetchQuestions = async (page = 1, limit = pageSize) => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString()
      })

      const response = await fetch(`/api/questions?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions(1, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize])

  // Client-side filtering of already-fetched questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      // Search query filter
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase()
        const matchesSearch = 
          question.question.toLowerCase().includes(searchLower) ||
          question.category.toLowerCase().includes(searchLower) ||
          question.subtopic?.toLowerCase().includes(searchLower) ||
          question.explanation.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Module type filter
      if (filters.moduleType && question.moduleType !== filters.moduleType) {
        return false
      }

      // Has diagram filter
      if (filters.hasDiagram !== null) {
        const hasDiagram = Boolean(question.imageUrl || question.chartData)
        if (filters.hasDiagram !== hasDiagram) {
          return false
        }
      }

      // Note: minRating filter would require review data per question
      // For now, we'll skip this as it would require additional API calls
      // This can be implemented as a future enhancement

      return true
    })
  }, [questions, filters])

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className={styles.container}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600 mb-6">You must be signed in to review questions.</p>
            <button
              onClick={() => signIn()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📝 Review Questions</h1>
          <p className={styles.subtitle}>Share your feedback on SAT practice questions</p>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Layout with Filter Panel and Content */}
        <div className={styles.layoutGrid}>
          {/* Filter Panel */}
          <aside className={styles.filterPanel}>
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              collapsed={filterPanelCollapsed}
              onToggleCollapse={() => setFilterPanelCollapsed(!filterPanelCollapsed)}
            />
          </aside>

          {/* Main Content */}
          <main>
            {/* Results Summary */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredQuestions.length} of {questions.length} questions
              </p>
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="page-size" className="text-sm text-gray-600">
                  Per page:
                </label>
                <select
                  id="page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            {/* Questions Grid */}
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">No questions match your filters.</p>
                <button
                  onClick={() => setFilters({
                    moduleType: '',
                    hasDiagram: null,
                    minRating: null,
                    searchQuery: '',
                  })}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={styles.cardGrid}>
                {filteredQuestions.map((question) => (
                  <ReviewCard
                    key={question.id}
                    question={question}
                    onReviewSubmitted={() => {
                      // Refresh questions to get updated review counts
                      fetchQuestions(currentPage, pageSize)
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && Math.ceil(pagination.total / pagination.limit) > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => fetchQuestions(currentPage - 1, pageSize)}
                  disabled={currentPage === 1}
                  className={styles.paginationButton}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className={styles.paginationInfo}>
                  Page {currentPage} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  onClick={() => fetchQuestions(currentPage + 1, pageSize)}
                  disabled={!pagination.hasMore}
                  className={styles.paginationButton}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
