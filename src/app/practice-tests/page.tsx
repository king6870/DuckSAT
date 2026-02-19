/**
 * Practice Tests Selection Page
 * Epic #61: Fixed SAT Practice Tests
 * 
 * Displays a grid of available practice tests with attempt history
 */

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BookOpen, Clock, TrendingUp, Award } from 'lucide-react'

interface PracticeTest {
  id: string
  name: string
  description: string | null
  difficulty: string
  questionCount: number
  userAttempts?: number
  bestScore?: number | null
  bestSatScore?: number | null
  lastAttemptAt?: Date | null
}

export default function PracticeTestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tests, setTests] = useState<PracticeTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTests() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/practice-tests')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch practice tests: ${response.statusText}`)
        }

        const data = await response.json()
        if (data.success && data.tests) {
          setTests(data.tests)
        } else {
          throw new Error('Invalid response from API')
        }
      } catch (err) {
        console.error('Error fetching practice tests:', err)
        setError(err instanceof Error ? err.message : 'Failed to load practice tests')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTests()
  }, [])

  function handleStartTest(testId: string) {
    router.push(`/practice-test?practiceTestId=${testId}`)
  }

  function handleViewProgress(testId: string) {
    router.push(`/progress?practiceTestId=${testId}`)
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading practice tests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            SAT Practice Tests
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Take full-length, official-style SAT practice tests. Track your progress and see improvement over time.
          </p>
        </div>

        {/* Tests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-2xl font-bold text-white">{test.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                    {test.difficulty}
                  </span>
                  <span className="text-white/90 text-sm">
                    {test.questionCount} questions
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {test.description && (
                  <p className="text-gray-600 mb-4 text-sm">{test.description}</p>
                )}

                {/* Stats for authenticated users who have taken the test */}
                {session && test.userAttempts !== undefined && test.userAttempts > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="w-4 h-4 text-blue-600 mr-1" />
                        <span className="text-xs text-gray-500">Attempts</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {test.userAttempts}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Award className="w-4 h-4 text-yellow-600 mr-1" />
                        <span className="text-xs text-gray-500">Best Score</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {test.bestScore !== null && test.bestScore !== undefined
                          ? `${test.bestScore}%`
                          : '-'}
                      </p>
                    </div>
                    {test.bestSatScore && (
                      <div className="col-span-2 text-center pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-center mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                          <span className="text-xs text-gray-500">Best SAT Score</span>
                        </div>
                        <p className="text-xl font-bold text-green-600">
                          {test.bestSatScore}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStartTest(test.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    {test.userAttempts && test.userAttempts > 0 ? 'Retake Test' : 'Start Test'}
                  </button>

                  {session && test.userAttempts && test.userAttempts > 0 && (
                    <button
                      onClick={() => handleViewProgress(test.id)}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      View Progress
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {tests.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No practice tests available yet.</p>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            About Practice Tests
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Each practice test contains 98 questions (54 Reading & Writing, 44 Math)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Tests feature the same questions every time you take them</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Track your improvement across multiple attempts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Timed sections match the real SAT exam format</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
