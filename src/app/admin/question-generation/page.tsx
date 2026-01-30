"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import type { 
  Topic, 
  GenerationSettings, 
  GenerationResult,
  TopicsResponse
} from '@/types/admin'

const DEFAULT_SETTINGS: GenerationSettings = {
  llmModel: 'gpt-5',
  questionCount: 10,
  mathCount: 5,
  readingCount: 5,
  temperature: 0.7,
  maxTokens: 4000,
  includeCharts: true,
  includePassages: true
}

interface BatchSettings {
  enabled: boolean
  iterations: number
  intervalMs: number
}

interface BatchProgress {
  currentIteration: number
  totalIterations: number
  results: Array<{
    iteration: number
    generated: number
    accepted: number
    stored: number
    error?: string
  }>
  totalGenerated: number
  totalAccepted: number
  totalStored: number
  failed: number
}

export default function EnhancedQuestionGeneration() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [topics, setTopics] = useState<Topic[]>([])
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  
  // Batch generation state
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    enabled: false,
    iterations: 5,
    intervalMs: 15000
  })
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [isBatchRunning, setIsBatchRunning] = useState(false)

  // Check admin access
  // Removed admin-only redirect: all users can access this page

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch('/api/admin/topics')
        if (response.ok) {
          const data = await response.json() as TopicsResponse
          setTopics(data.topics || [])
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err)
      }
    }
    
    if (status === 'authenticated') {
      fetchTopics()
    }
  }, [status])

  // Update selected topic when topicId changes
  useEffect(() => {
    if (settings.topicId) {
      const topic = topics.find(t => t.id === settings.topicId)
      setSelectedTopic(topic || null)
    } else {
      setSelectedTopic(null)
    }
  }, [settings.topicId, topics])

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
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const generateSingle = async (): Promise<GenerationResult> => {
    const response = await fetch('/api/admin/enhanced-generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.details || data.error || `HTTP ${response.status}`)
    }

    return data
  }

  const handleBatchGenerate = async () => {
    setIsBatchRunning(true)
    setError(null)
    setResult(null)
    
    const progress: BatchProgress = {
      currentIteration: 0,
      totalIterations: batchSettings.iterations,
      results: [],
      totalGenerated: 0,
      totalAccepted: 0,
      totalStored: 0,
      failed: 0
    }
    
    setBatchProgress(progress)

    for (let i = 1; i <= batchSettings.iterations; i++) {
      progress.currentIteration = i
      setBatchProgress({ ...progress })

      try {
        const data = await generateSingle()
        
        const iterationResult = {
          iteration: i,
          generated: data.summary?.generated || 0,
          accepted: data.summary?.accepted || 0,
          stored: data.summary?.stored || 0
        }
        
        progress.results.push(iterationResult)
        progress.totalGenerated += iterationResult.generated
        progress.totalAccepted += iterationResult.accepted
        progress.totalStored += iterationResult.stored
        
        setBatchProgress({ ...progress })
        
        // If this is the last iteration, set the final result
        if (i === batchSettings.iterations) {
          setResult(data)
        }
        
        // Wait before next iteration (except for the last one)
        if (i < batchSettings.iterations) {
          await new Promise(resolve => setTimeout(resolve, batchSettings.intervalMs))
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        progress.results.push({
          iteration: i,
          generated: 0,
          accepted: 0,
          stored: 0,
          error: errorMessage
        })
        progress.failed += 1
        setBatchProgress({ ...progress })
        
        console.error(`Batch iteration ${i} failed:`, err)
      }
    }
    
    setIsBatchRunning(false)
  }

  const handleGenerate = async () => {
    if (batchSettings.enabled) {
      await handleBatchGenerate()
    } else {
      setGenerating(true)
      setError(null)
      setResult(null)

      try {
        const data = await generateSingle()
        setResult(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
      } finally {
        setGenerating(false)
      }
    }
  }

  const resetGeneration = () => {
    setResult(null)
    setError(null)
    setBatchProgress(null)
  }

  const stopBatch = () => {
    setIsBatchRunning(false)
    setError('Batch generation stopped by user')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">🤖 AI Question Generation</h1>
                <p className="mt-2 text-xl text-gray-600">Generate SAT questions with AI assistance</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Settings</h2>

              <div className="space-y-6">
                {/* Topic Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic (Optional)</label>
                  <select
                    value={settings.topicId || ''}
                    onChange={(e) => {
                      const topicId = e.target.value || undefined
                      const topic = topicId ? topics.find(t => t.id === topicId) : null
                      const moduleType = topic?.moduleType as 'math' | 'reading-writing' | undefined
                      setSettings(prev => ({ 
                        ...prev, 
                        topicId,
                        subtopicId: undefined,
                        moduleType
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating}
                  >
                    <option value="">All Topics</option>
                    {topics.map(topic => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name} ({topic.moduleType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subtopic Selection */}
                {selectedTopic && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic (Optional)</label>
                    <select
                      value={settings.subtopicId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, subtopicId: e.target.value || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={generating}
                    >
                      <option value="">All Subtopics</option>
                      {selectedTopic.subtopics.map(subtopic => (
                        <option key={subtopic.id} value={subtopic.id}>
                          {subtopic.name} ({subtopic.currentCount}/{subtopic.targetQuestions})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Module Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Type</label>
                  <select
                    value={settings.moduleType || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      const moduleType = value ? (value as 'math' | 'reading-writing') : undefined
                      setSettings(prev => ({ ...prev, moduleType }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating || !!settings.topicId}
                  >
                    <option value="">Both Math & Reading</option>
                    <option value="math">Math Only</option>
                    <option value="reading-writing">Reading & Writing Only</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty (Optional)</label>
                  <select
                    value={settings.difficulty || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      const difficulty = value ? (value as 'easy' | 'medium' | 'hard') : undefined
                      setSettings(prev => ({ ...prev, difficulty }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating}
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Questions</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.questionCount}
                    onChange={(e) => {
                      const total = parseInt(e.target.value) || 10
                      setSettings(prev => ({ 
                        ...prev, 
                        questionCount: total,
                        mathCount: Math.ceil(total / 2),
                        readingCount: Math.floor(total / 2)
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating}
                  />
                </div>

                {/* Math/Reading Split */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Math</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.mathCount}
                      onChange={(e) => setSettings(prev => ({ ...prev, mathCount: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={generating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reading</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.readingCount}
                      onChange={(e) => setSettings(prev => ({ ...prev, readingCount: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={generating}
                    />
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature: {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                    disabled={generating}
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeCharts"
                      checked={settings.includeCharts}
                      onChange={(e) => setSettings(prev => ({ ...prev, includeCharts: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={generating}
                    />
                    <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-700">
                      Include charts/diagrams (Math)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includePassages"
                      checked={settings.includePassages}
                      onChange={(e) => setSettings(prev => ({ ...prev, includePassages: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={generating}
                    />
                    <label htmlFor="includePassages" className="ml-2 text-sm text-gray-700">
                      Include passages (Reading)
                    </label>
                  </div>
                </div>

                {/* Batch Generation Settings */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">Batch Mode</label>
                    <button
                      type="button"
                      onClick={() => setBatchSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        batchSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={generating || isBatchRunning}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          batchSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {batchSettings.enabled && (
                    <div className="space-y-4 bg-blue-50 rounded-lg p-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Iterations: {batchSettings.iterations}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={batchSettings.iterations}
                          onChange={(e) => setBatchSettings(prev => ({ ...prev, iterations: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={generating || isBatchRunning}
                        />
                        <p className="text-xs text-gray-600 mt-1">Number of times to run generation</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Interval: {(batchSettings.intervalMs / 1000).toFixed(0)}s
                        </label>
                        <input
                          type="range"
                          min="5000"
                          max="60000"
                          step="5000"
                          value={batchSettings.intervalMs}
                          onChange={(e) => setBatchSettings(prev => ({ ...prev, intervalMs: parseInt(e.target.value) }))}
                          className="w-full"
                          disabled={generating || isBatchRunning}
                        />
                        <p className="text-xs text-gray-600 mt-1">Wait time between iterations</p>
                      </div>

                      <div className="bg-blue-100 rounded p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Total questions:</strong> {settings.questionCount} × {batchSettings.iterations} = {settings.questionCount * batchSettings.iterations}
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                          <strong>Estimated time:</strong> ~{Math.ceil((batchSettings.iterations * (batchSettings.intervalMs / 1000 + 30)) / 60)} minutes
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating || isBatchRunning || settings.mathCount + settings.readingCount === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {generating || isBatchRunning ? '🚀 Generating...' : batchSettings.enabled ? `🎯 Start Batch (${batchSettings.iterations}x)` : '🎯 Generate Questions'}
                </button>

                {/* Stop Batch Button */}
                {isBatchRunning && (
                  <button
                    onClick={stopBatch}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 mt-2"
                  >
                    ⛔ Stop Batch
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="text-2xl">❌</div>
                  <h3 className="text-xl font-bold text-red-800">Generation Failed</h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={resetGeneration}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Success Display */}
            {result && result.success && result.summary && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🎉 Generation Complete!</h2>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{result.summary.generated}</div>
                    <div className="text-sm text-blue-700">Generated</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">{result.summary.accepted}</div>
                    <div className="text-sm text-green-700">Accepted</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-3xl font-bold text-red-600">{result.summary.rejected}</div>
                    <div className="text-sm text-red-700">Rejected</div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-xl">
                    <div className="text-3xl font-bold text-indigo-600">{result.summary.stored}</div>
                    <div className="text-sm text-indigo-700">Stored</div>
                  </div>
                  {result.summary.needsReview > 0 && (
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                      <div className="text-3xl font-bold text-yellow-600">{result.summary.needsReview}</div>
                      <div className="text-sm text-yellow-700">Needs Review</div>
                    </div>
                  )}
                </div>

                {/* Warning for questions needing review */}
                {result.summary.needsReview > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>⚠️ {result.summary.needsReview} question(s) need manual review.</strong> These questions were evaluated using fallback logic and should be reviewed before use.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
                  >
                    🏠 Home
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    🔄 Generate More
                  </button>
                  <button
                    onClick={resetGeneration}
                    className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700"
                  >
                    🗑️ Clear Results
                  </button>
                </div>

                {/* Accepted Questions Preview */}
                {result.questions?.accepted && result.questions.accepted.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Accepted Questions</h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {result.questions.accepted.map((question, index) => (
                        <div 
                          key={index} 
                          className={`border rounded-lg p-4 ${
                            question.needsReview 
                              ? 'border-yellow-300 bg-yellow-50' 
                              : 'border-green-200 bg-green-50'
                          }`}
                        >
                          {question.needsReview && (
                            <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                              <p className="text-xs font-semibold text-yellow-800">
                                ⚠️ NEEDS REVIEW - Fallback evaluation used
                              </p>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              question.moduleType === 'math' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {question.moduleType}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {question.difficulty}
                            </span>
                            <span className="text-xs text-gray-600">{question.category} → {question.subtopic}</span>
                          </div>
                          <p className="text-sm text-gray-800 font-medium mb-2">{question.question.substring(0, 100)}...</p>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-600">
                              Quality: {(question.qualityScore * 100).toFixed(0)}%
                            </div>
                            {question.storedId && (
                              <span className="text-xs text-green-600">✓ Stored in DB</span>
                            )}
                          </div>
                          {question.evaluationFeedback && (
                            <p className="text-xs text-gray-500 mt-2 italic">{question.evaluationFeedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected Questions */}
                {result.questions?.rejected && result.questions.rejected.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">❌ Rejected Questions</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {result.questions.rejected.map((question, index) => (
                        <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                          <p className="text-sm text-gray-800 mb-1">{question.question.substring(0, 80)}...</p>
                          <p className="text-xs text-red-600">{question.evaluationFeedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Batch Progress */}
            {isBatchRunning && batchProgress && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Batch Progress</h2>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Iteration {batchProgress.currentIteration} of {batchProgress.totalIterations}</span>
                    <span>{Math.round((batchProgress.currentIteration / batchProgress.totalIterations) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 transition-all duration-500"
                      style={{ width: `${(batchProgress.currentIteration / batchProgress.totalIterations) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">{batchProgress.totalGenerated}</div>
                    <div className="text-xs text-blue-700">Total Generated</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">{batchProgress.totalAccepted}</div>
                    <div className="text-xs text-green-700">Total Accepted</div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-xl">
                    <div className="text-2xl font-bold text-indigo-600">{batchProgress.totalStored}</div>
                    <div className="text-xs text-indigo-700">Total Stored</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-2xl font-bold text-red-600">{batchProgress.failed}</div>
                    <div className="text-xs text-red-700">Failed</div>
                  </div>
                </div>

                {/* Iteration Results */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {batchProgress.results.map((result, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {result.error ? '❌' : '✅'} Iteration {result.iteration}
                        </span>
                        {!result.error ? (
                          <span className="text-sm text-gray-600">
                            Generated: {result.generated}, Accepted: {result.accepted}, Stored: {result.stored}
                          </span>
                        ) : (
                          <span className="text-sm text-red-600">{result.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {generating && !isBatchRunning && (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-xl font-semibold text-gray-900">Generating Questions...</p>
                <p className="text-gray-600 mt-2">This may take a minute</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
