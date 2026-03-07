"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface AdminPracticeTest {
  id: string
  name: string
  description: string | null
  difficulty: string
  isPublished: boolean
  questionCount: number
  moduleCounts: Record<string, number>
  createdAt: string
  updatedAt: string
}

interface PublishValidation {
  passed: boolean
  issues?: string[]
  moduleCounts?: Record<string, number>
}

interface PublishResponse {
  success: boolean
  published?: boolean
  error?: string
  validation?: PublishValidation
}

export default function AdminPracticeTestsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [tests, setTests] = useState<AdminPracticeTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishingTestId, setPublishingTestId] = useState<string | null>(null)
  const [publishErrors, setPublishErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchTests = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/practice-tests', {
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        console.error('[admin/practice-tests/page] Failed to fetch tests', {
          status: response.status,
          statusText: response.statusText,
          data,
        })
        throw new Error(data.error || 'Failed to load practice tests')
      }

      setTests(data.tests || [])
    } catch (fetchError) {
      console.error('[admin/practice-tests/page] fetchTests error', {
        error: fetchError,
      })
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load practice tests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTests()
    }
  }, [status])

  const sortedTests = useMemo(() => {
    return [...tests].sort((a, b) => Number(a.isPublished) - Number(b.isPublished) || a.name.localeCompare(b.name))
  }, [tests])

  const handlePublish = async (testId: string) => {
    try {
      setPublishingTestId(testId)
      setPublishErrors(prev => ({ ...prev, [testId]: [] }))

      const response = await fetch(`/api/admin/practice-tests/${testId}/publish`, {
        method: 'PUT',
        credentials: 'include',
      })

      const data = await response.json() as PublishResponse

      if (!response.ok || !data.success) {
        console.error('[admin/practice-tests/page] Publish request failed', {
          testId,
          status: response.status,
          statusText: response.statusText,
          data,
        })
        const issues = data.validation?.issues && data.validation.issues.length > 0
          ? data.validation.issues
          : [data.error || 'Failed to publish practice test']

        setPublishErrors(prev => ({ ...prev, [testId]: issues }))
        return
      }

      await fetchTests()
    } catch (publishError) {
      console.error('[admin/practice-tests/page] handlePublish error', {
        testId,
        error: publishError,
      })
      const message = publishError instanceof Error ? publishError.message : 'Failed to publish practice test'
      setPublishErrors(prev => ({ ...prev, [testId]: [message] }))
    } finally {
      setPublishingTestId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice tests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Practice Test Publishing</h1>
              <p className="text-gray-600 mt-2">Publish only complete tests and show exact validation issues when blocked.</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-800"
            >
              Back to Admin
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {sortedTests.map((test) => {
              const module0 = test.moduleCounts['0'] || 0
              const module1 = test.moduleCounts['1'] || 0
              const module2 = test.moduleCounts['2'] || 0
              const module3 = test.moduleCounts['3'] || 0
              const issues = publishErrors[test.id] || []

              return (
                <div key={test.id} className="border border-gray-200 rounded-2xl p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{test.name}</h2>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${test.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {test.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{test.description || 'No description'}</p>
                      <p className="text-xs text-gray-500 mt-2">Difficulty: {test.difficulty} • Total linked: {test.questionCount}</p>
                      <p className="text-xs text-gray-500 mt-1">Modules: 0={module0}, 1={module1}, 2={module2}, 3={module3}</p>
                    </div>

                    <div>
                      <button
                        onClick={() => handlePublish(test.id)}
                        disabled={test.isPublished || publishingTestId === test.id}
                        className={`px-4 py-2 rounded-lg font-semibold ${test.isPublished || publishingTestId === test.id ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                      >
                        {test.isPublished ? 'Already Published' : publishingTestId === test.id ? 'Publishing...' : 'Publish'}
                      </button>
                    </div>
                  </div>

                  {issues.length > 0 && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="font-semibold text-red-700 mb-2">Publish blocked:</p>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {sortedTests.length === 0 && (
            <div className="text-center py-10 text-gray-500">No practice tests found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
