"use client"

import { useState } from 'react'

interface GenerationResult {
  success: boolean
  summary: {
    generated: number
    evaluated: number
    accepted: number
    rejected: number
    stored: number
  }
  questions: {
    accepted: any[]
    rejected: any[]
  }
}

export default function TestAIQuestions() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateQuestions = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ai-questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Generation failed')
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Question Generation Test</h1>
          <p className="text-gray-600 mb-6">
            This will generate 10 SAT questions (5 math with charts, 5 reading with passages) using GPT-5, 
            then evaluate them with Grok for difficulty and quality.
          </p>
          
          <button
            onClick={generateQuestions}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Questions...' : 'Generate 10 SAT Questions'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Generation Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.generated}</div>
                  <div className="text-sm text-gray-600">Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.summary.evaluated}</div>
                  <div className="text-sm text-gray-600">Evaluated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.summary.accepted}</div>
                  <div className="text-sm text-gray-600">Accepted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{result.summary.rejected}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{result.summary.stored}</div>
                  <div className="text-sm text-gray-600">Stored</div>
                </div>
              </div>
            </div>

            {/* Accepted Questions */}
            {result.questions.accepted.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ✅ Accepted Questions ({result.questions.accepted.length})
                </h2>
                <div className="space-y-6">
                  {result.questions.accepted.map((question, index) => (
                    <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            question.moduleType === 'math' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {question.moduleType === 'math' ? 'Math' : 'Reading'}
                          </span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                          <span className="text-sm text-gray-600">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                          </span>
                          <span className="text-sm text-gray-600">
                            Quality: {(question.qualityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">
                          {question.category} → {question.subtopic}
                        </div>
                      </div>

                      {question.passage && (
                        <div className="mb-4 p-3 bg-gray-100 rounded">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Passage:</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.passage}</p>
                        </div>
                      )}

                      {question.chartDescription && (
                        <div className="mb-4 p-3 bg-blue-100 rounded">
                          <h4 className="font-semibold text-sm text-blue-700 mb-2">Chart/Graph:</h4>
                          <p className="text-sm text-blue-700">{question.chartDescription}</p>
                        </div>
                      )}

                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
                        <p className="text-gray-800 whitespace-pre-wrap">{question.question}</p>
                      </div>

                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-2">Options:</h4>
                        <div className="space-y-1">
                          {question.options.map((option: string, optIndex: number) => (
                            <div 
                              key={optIndex} 
                              className={`p-2 rounded ${
                                optIndex === question.correctAnswer 
                                  ? 'bg-green-100 border border-green-300' 
                                  : 'bg-gray-50'
                              }`}
                            >
                              {option} {optIndex === question.correctAnswer && '✓'}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-2">Explanation:</h4>
                        <p className="text-gray-700 text-sm">{question.explanation}</p>
                      </div>

                      <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                        <strong>Grok Evaluation:</strong> {question.evaluationFeedback}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Questions */}
            {result.questions.rejected.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ❌ Rejected Questions ({result.questions.rejected.length})
                </h2>
                <div className="space-y-4">
                  {result.questions.rejected.map((question, index) => (
                    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            question.moduleType === 'math' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {question.moduleType === 'math' ? 'Math' : 'Reading'}
                          </span>
                          <span className="text-sm text-gray-600">{question.subtopic}</span>
                        </div>
                      </div>
                      <p className="text-gray-800 mb-2">{question.question.substring(0, 150)}...</p>
                      <div className="text-sm text-red-700 bg-red-100 p-2 rounded">
                        <strong>Rejection Reason:</strong> {question.evaluationFeedback}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
