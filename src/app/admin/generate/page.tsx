"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = ['lionvihaan@gmail.com', 'kingjacobisthegoat@gmail.com']

export default function AdminGenerate() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)

  // Check admin access
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
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Generation failed:', error)
      setResult({ error: 'Generation failed' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI Question Generation</h1>
                <p className="mt-2 text-gray-600">Generate new SAT questions using GPT-5 and store them in the database</p>
              </div>
              <button
                onClick={() => router.push('/admin/questions')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
              >
                Back to Questions
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Generation Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Questions</h2>
          <p className="text-gray-600 mb-6">
            This will generate 10 SAT questions (5 math with interactive graphs, 5 reading with passages) 
            using GPT-5, evaluate them with Grok, and store accepted questions in the database.
          </p>
          
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating Questions...' : 'Generate 10 SAT Questions'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                <p className="text-red-700">{result.error}</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Generation Results</h2>
                
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.generated}</div>
                    <div className="text-sm text-gray-600">Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.evaluated}</div>
                    <div className="text-sm text-gray-600">Evaluated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.accepted}</div>
                    <div className="text-sm text-gray-600">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.rejected}</div>
                    <div className="text-sm text-gray-600">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{result.stored}</div>
                    <div className="text-sm text-gray-600">Stored in DB</div>
                  </div>
                </div>

                {/* Success Message */}
                {result.stored > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="text-green-800 font-semibold mb-2">Success!</h3>
                    <p className="text-green-700">
                      {result.stored} questions have been successfully generated and stored in the database.
                      You can now view and manage them in the question management system.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/admin/questions')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    View Generated Questions
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    Generate More Questions
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-blue-800 font-semibold mb-2">How It Works</h3>
          <ul className="text-blue-700 space-y-2">
            <li>• GPT-5 generates 5 math questions with interactive graphs and 5 reading questions with passages</li>
            <li>• Grok evaluates each question for difficulty, quality, and appropriateness</li>
            <li>• Only questions that meet quality standards are accepted and stored</li>
            <li>• All stored questions are immediately available in the question management system</li>
            <li>• Questions can be edited, previewed, activated/deactivated, or deleted after generation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
