"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ADMIN_EMAILS } from '@/middleware/adminAuth'

interface GenerationSettings {
  model1: string
  model2: string
  model3: string
  numQuestionsPerSubtopic: number
  temperature: number
  maxTokens: number
  delayMinutes: number
  includeCharts: boolean
  includePassages: boolean
}

interface GenerationStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
  details?: Record<string, unknown>
}

interface GenerationResult {
  success: boolean
  summary?: {
    generated: number
    evaluated: number
    accepted: number
    rejected: number
    stored: number
  }
  questions?: {
    accepted: Array<{
      question: string
      moduleType: string
      difficulty: string
      category: string
      subtopic: string
      qualityScore: number
      explanation: string
      options: string[]
      correctAnswer: number
      points: number
      passage?: string
      chartDescription?: string
      evaluationFeedback: string
    }>
    rejected: Array<{
      question: string
      moduleType: string
      subtopic: string
      evaluationFeedback: string
    }>
  }
  error?: string
}

const DEFAULT_SETTINGS: GenerationSettings = {
  model1: 'gpt-5',
  model2: 'grok-3',
  model3: 'llama-maverick',
  numQuestionsPerSubtopic: 1,
  temperature: 0.7,
  maxTokens: 8000,
  delayMinutes: 1,
  includeCharts: true,
  includePassages: true
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5', name: 'GPT-5', description: 'Latest GPT model for high-quality generation' },
  { id: 'grok-3', name: 'Grok-3', description: 'Grok for evaluation and generation' },
  { id: 'llama-maverick', name: 'Llama Maverick', description: 'Llama-based model' },
  { id: 'gork-3', name: 'Gork-3', description: 'Alternative Grok model configuration' }
]

export default function EnhancedQuestionGeneration() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS)
  const [generating, setGenerating] = useState(false)
  const [steps, setSteps] = useState<GenerationStep[]>([])
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check admin access
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      if (!ADMIN_EMAILS.includes(session.user.email)) {
        router.push('/admin')
      }
    }
  }, [status, session, router])

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

  const updateStep = (stepId: string, updates: Partial<GenerationStep>) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ))
  }

  const addStep = (step: GenerationStep) => {
    setSteps(prev => [...prev, step])
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setResult(null)

    // Initialize steps
    const initialSteps: GenerationStep[] = [
      { id: 'init', name: 'Initializing generation', status: 'running', message: 'Setting up AI services...' },
      { id: 'generate', name: 'Generating questions', status: 'pending', message: 'Preparing prompts...' },
      { id: 'evaluate', name: 'Evaluating questions', status: 'pending', message: 'Quality assessment...' },
      { id: 'images', name: 'Generating images', status: 'pending', message: 'Creating charts and diagrams...' },
      { id: 'store', name: 'Storing questions', status: 'pending', message: 'Saving to database...' },
      { id: 'complete', name: 'Generation complete', status: 'pending', message: 'Finalizing...' }
    ]
    setSteps(initialSteps)

    try {
      // Step 1: Initialize
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep('init', { status: 'completed', message: 'AI services ready' })

      // Step 2: Generate questions
      updateStep('generate', { status: 'running', message: `Generating questions using ${settings.model1}, ${settings.model2}, and ${settings.model3}...` })

      const response = await fetch('/api/admin/enhanced-generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Update steps based on response
      updateStep('generate', { status: 'completed', message: `Generated ${data.summary?.generated || 0} questions` })
      updateStep('evaluate', { status: 'completed', message: `Evaluated ${data.summary?.evaluated || 0} questions` })
      updateStep('images', { status: 'completed', message: 'Images generated for math questions' })
      updateStep('store', { status: 'completed', message: `Stored ${data.summary?.stored || 0} questions in database` })
      updateStep('complete', { status: 'completed', message: 'Generation completed successfully' })

      setResult(data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)

      // Mark current step as error
      const currentRunningStep = steps.find(s => s.status === 'running')
      if (currentRunningStep) {
        updateStep(currentRunningStep.id, { status: 'error', message: errorMessage })
      }
    } finally {
      setGenerating(false)
    }
  }

  const resetGeneration = () => {
    setSteps([])
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">🤖 Enhanced AI Question Generation</h1>
                <p className="mt-2 text-xl text-gray-600">Generate SAT questions with full visual control and real-time progress</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Generation Settings</h2>

              <div className="space-y-6">
                {/* LLM Model Selection - 3 Models */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Models (Interactive Mode)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model 1</label>
                      <select
                        value={settings.model1}
                        onChange={(e) => setSettings(prev => ({ ...prev, model1: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={generating}
                      >
                        {AVAILABLE_MODELS.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {AVAILABLE_MODELS.find(m => m.id === settings.model1)?.description}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model 2</label>
                      <select
                        value={settings.model2}
                        onChange={(e) => setSettings(prev => ({ ...prev, model2: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={generating}
                      >
                        {AVAILABLE_MODELS.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {AVAILABLE_MODELS.find(m => m.id === settings.model2)?.description}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model 3</label>
                      <select
                        value={settings.model3}
                        onChange={(e) => setSettings(prev => ({ ...prev, model3: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={generating}
                      >
                        {AVAILABLE_MODELS.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {AVAILABLE_MODELS.find(m => m.id === settings.model3)?.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Questions Per Subtopic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Questions Per Subtopic</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.numQuestionsPerSubtopic}
                    onChange={(e) => setSettings(prev => ({ ...prev, numQuestionsPerSubtopic: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of questions to generate for each SAT subtopic
                  </p>
                </div>

                {/* Advanced Settings */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>

                  <div className="space-y-4">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                      <input
                        type="number"
                        min="1000"
                        max="8000"
                        value={settings.maxTokens}
                        onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4000 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={generating}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delay Between Questions (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={settings.delayMinutes}
                        onChange={(e) => setSettings(prev => ({ ...prev, delayMinutes: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={generating}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Delay between generating questions to avoid rate limits
                      </p>
                    </div>

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
                        Include charts and diagrams in math questions
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
                        Include reading passages in reading questions
                      </label>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {generating ? '🚀 Generating Questions...' : `🎯 Generate Questions`}
                </button>
              </div>
            </div>
          </div>

          {/* Progress and Results Panel */}
          <div className="lg:col-span-2">
            {/* Progress Steps */}
            {steps.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Generation Progress</h2>

                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.status === 'completed' ? 'bg-green-500 text-white' :
                        step.status === 'running' ? 'bg-blue-500 text-white animate-pulse' :
                        step.status === 'error' ? 'bg-red-500 text-white' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {step.status === 'completed' ? '✓' :
                         step.status === 'running' ? '⟳' :
                         step.status === 'error' ? '✗' :
                         index + 1}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-semibold ${
                            step.status === 'completed' ? 'text-green-700' :
                            step.status === 'running' ? 'text-blue-700' :
                            step.status === 'error' ? 'text-red-700' :
                            'text-gray-700'
                          }`}>
                            {step.name}
                          </h3>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            step.status === 'completed' ? 'bg-green-100 text-green-800' :
                            step.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            step.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        {step.message && (
                          <p className={`text-sm mt-1 ${
                            step.status === 'error' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {step.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Results Display */}
            {result && result.success && result.summary && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🎉 Generation Complete!</h2>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{result.summary.generated}</div>
                    <div className="text-sm text-blue-700">Generated</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600">{result.summary.evaluated}</div>
                    <div className="text-sm text-purple-700">Evaluated</div>
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
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push('/admin/questions')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
                  >
                    📝 View Questions
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

                {/* Quick Preview of Accepted Questions */}
                {result.questions?.accepted && result.questions.accepted.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Accepted Questions Preview</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {result.questions.accepted.slice(0, 3).map((question, index) => (
                        <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
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
                          <p className="text-sm text-gray-800 font-medium mb-2">{question.question}</p>
                          <div className="text-xs text-green-700">
                            Quality: {(question.qualityScore * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                      {result.questions.accepted.length > 3 && (
                        <p className="text-sm text-gray-600 text-center">
                          ... and {result.questions.accepted.length - 3} more questions
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
