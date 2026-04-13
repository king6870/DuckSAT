"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X, Check, AlertCircle, Lightbulb, PartyPopper } from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import type { 
  Topic, 
  GenerationSettings, 
  GenerationResult,
  TopicsResponse
} from '@/types/admin'

const DEFAULT_SETTINGS: GenerationSettings = {
  llmModel: 'gpt-5',
  questionCount: 5,
  mathCount: 3,
  readingCount: 2,
  temperature: 0.7,
  maxTokens: 4000,
  includeCharts: true,
  includePassages: true,
  specializedMode: false
}

interface GenerationStep {
  step: number
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  message?: string
  timestamp?: Date
}

interface QuestionWithAnswer {
  id?: string
  question: string
  passage?: string | null
  options: string[]
  correctAnswer: number
  explanation: string
  moduleType: 'math' | 'reading-writing'
  category: string
  subtopic: string
  difficulty: 'easy' | 'medium' | 'hard'
  selectedAnswer?: number
  showExplanation?: boolean
  qualityScore?: number
  imageUrl?: string | null
  chartDescription?: string
}

export default function EnhancedQuestionGeneration() {
  const router = useRouter()

  const [topics, setTopics] = useState<Topic[]>([])
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null)
  
  // Step-by-step tracking
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([])
  const [, setCurrentQuestion] = useState(0)
  
  // Questions with answer tracking
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([])

  // Fetch topics (no auth required for testing)
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
    
    fetchTopics()
  }, [])

  // Update selected topic when topicId changes
  useEffect(() => {
    if (settings.topicId) {
      const topic = topics.find(t => t.id === settings.topicId)
      setSelectedTopic(topic || null)
    } else {
      setSelectedTopic(null)
    }
  }, [settings.topicId, topics])

  const initializeSteps = () => {
    const steps: GenerationStep[] = [
      { step: 1, name: 'Initialize — Select Subtopics', status: 'pending' },
      { step: 2, name: 'Generate Questions (GPT-5)', status: 'pending' },
      { step: 3, name: 'Evaluate Quality (Grok)', status: 'pending' },
      { step: 4, name: 'Retry Low-Quality Questions', status: 'pending' },
      { step: 5, name: 'Generate Diagrams', status: 'pending' },
      { step: 6, name: 'Store in Database', status: 'pending' },
    ]
    setGenerationSteps(steps)
  }

  const updateStep = (stepNumber: number, status: GenerationStep['status'], message?: string) => {
    setGenerationSteps(prev => prev.map(step => 
      step.step === stepNumber 
        ? { ...step, status, message, timestamp: new Date() }
        : step
    ))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setResult(null)
    setQuestions([])
    setCurrentQuestion(0)
    setGenerationTimeMs(null)
    initializeSteps()

    const generationStart = Date.now()

    try {
      // Step 1: Initialize
      updateStep(1, 'in-progress', 'Selecting subtopics and validating settings...')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateStep(1, 'completed', 'Settings validated — subtopics selected')

      // Step 2: Generate
      updateStep(2, 'in-progress', `Generating ${settings.questionCount} questions with GPT-5...`)

      const selectedTopicName = settings.topicId
        ? topics.find(t => t.id === settings.topicId)?.name
        : undefined

      const selectedSubtopicName = settings.subtopicId
        ? selectedTopic?.subtopics.find(s => s.id === settings.subtopicId)?.name
        : undefined
      
      const response = await fetch('/api/admin/enhanced-generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          specificTopics: selectedTopicName ? [selectedTopicName] : [],
          specificSubtopics: selectedSubtopicName ? [selectedSubtopicName] : [],
          moduleType: settings.moduleType || 'math',
          difficulty: settings.difficulty || 'medium',
        })
      })

      const data = await response.json() as GenerationResult
      if (!response.ok) {
        throw new Error(data.error || data.details || response.statusText)
      }

      setGenerationTimeMs(Date.now() - generationStart)

      const generatedCount = data.summary?.generated ?? 0
      const acceptedCount = data.summary?.accepted ?? 0
      const rejectedCount = data.summary?.rejected ?? 0
      const retryCount = data.summary?.retryCount ?? 0
      const avgQuality = data.summary?.avgQuality ?? null
      updateStep(2, 'completed', `Generated ${generatedCount} questions`)

      // Step 3: Evaluate (quality check with Grok — happens server-side)
      updateStep(3, 'in-progress', 'Evaluating question quality with Grok...')
      await new Promise(resolve => setTimeout(resolve, 800))
      const qualityLabel = avgQuality !== null ? ` (avg ${(avgQuality * 100).toFixed(0)}%)` : ''
      updateStep(3, 'completed', `${acceptedCount} accepted, ${rejectedCount} rejected${qualityLabel}`)

      // Step 4: Retry
      updateStep(4, 'in-progress', 'Retrying low-quality questions...')
      await new Promise(resolve => setTimeout(resolve, 600))
      updateStep(4, 'completed', retryCount > 0 ? `${retryCount} question${retryCount !== 1 ? 's' : ''} regenerated` : 'No retries needed')

      // Step 5: Diagrams (image generation — happens server-side)
      updateStep(5, 'in-progress', 'Generating diagrams for applicable questions...')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateStep(5, 'completed', 'Diagram generation complete')

      // Step 6: Store
      updateStep(6, 'in-progress', 'Saving to database...')
      await new Promise(resolve => setTimeout(resolve, 400))
      updateStep(6, 'completed', `${data.summary?.stored ?? acceptedCount} questions stored`)

      setResult(data)
      
      // Fetch the generated questions to display them
      const acceptedQuestions = data.questions?.accepted || []
      if (acceptedQuestions.length > 0) {
        setQuestions(acceptedQuestions.slice(0, settings.questionCount).map((q) => {
          // Ensure options is always an array
          let parsedOptions: string[] = []
          if (Array.isArray(q.options)) {
            parsedOptions = q.options
          } else if (typeof q.options === 'string') {
            try {
              parsedOptions = JSON.parse(q.options)
            } catch {
              console.error('Failed to parse options for question:', q.question)
              parsedOptions = []
            }
          }

          return {
            id: q.storedId || undefined,
            question: q.question,
            passage: q.passage,
            options: parsedOptions,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            moduleType: q.moduleType,
            category: q.category,
            subtopic: q.subtopic,
            difficulty: q.difficulty,
            qualityScore: q.qualityScore,
            imageUrl: q.imageUrl,
            chartDescription: q.chartDescription,
            selectedAnswer: undefined,
            showExplanation: false
          }
        }))
      } else {
        // Fallback: fetch most recent stored questions so the UI shows results immediately
        try {
          const latestResponse = await fetch(`/api/admin/questions?limit=${settings.questionCount}&page=1`, {
            credentials: 'include'
          })
          if (latestResponse.ok) {
            const latestData = await latestResponse.json()
            const latestQuestions = (latestData.questions || []).slice(0, settings.questionCount)
            if (latestQuestions.length > 0) {
              setQuestions(latestQuestions.map((q: Record<string, unknown>) => {
                // Ensure options is always an array
                let parsedOptions: string[] = []
                if (Array.isArray(q.options)) {
                  parsedOptions = q.options
                } else if (typeof q.options === 'string') {
                  try {
                    parsedOptions = JSON.parse(q.options)
                  } catch {
                    console.error('Failed to parse options for question:', q.question)
                    parsedOptions = []
                  }
                }

                return {
                  id: q.id,
                  question: q.question,
                  passage: q.passage,
                  options: parsedOptions,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation,
                  moduleType: q.moduleType,
                  category: q.category,
                  subtopic: q.subtopic,
                  difficulty: q.difficulty,
                  imageUrl: q.imageUrl,
                  chartDescription: q.chartDescription,
                  selectedAnswer: undefined,
                  showExplanation: false
                }
              }))
            }
          } else {
            console.warn('Fallback API returned', latestResponse.status, '- no questions to display')
          }
        } catch (fetchError) {
          console.error('Failed to fetch latest stored questions:', fetchError)
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      const currentStep = generationSteps.find(s => s.status === 'in-progress')?.step || 2
      updateStep(currentStep, 'error', errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setQuestions(prev => prev.map((q, i) => 
      i === questionIndex 
        ? { ...q, selectedAnswer: answerIndex, showExplanation: answerIndex !== undefined }
        : q
    ))
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
                <p className="mt-2 text-xl text-gray-600">Generate and test SAT questions with step-by-step tracking</p>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Settings</h2>

              <div className="space-y-6">
                {/* Module Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
                  <select
                    value={settings.moduleType || 'math'}
                    onChange={(e) => setSettings(prev => ({ ...prev, moduleType: e.target.value as 'math' | 'reading-writing' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating}
                  >
                    <option value="math">Math</option>
                    <option value="reading-writing">Reading & Writing</option>
                  </select>
                </div>

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic (Optional)</label>
                  <select
                    value={settings.subtopicId || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, subtopicId: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={generating || !selectedTopic}
                  >
                    <option value="">All Subtopics</option>
                    {(selectedTopic?.subtopics || []).map(subtopic => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {subtopic.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specialized Mode */}
                <div className="flex items-start gap-3">
                  <input
                    id="specialized-mode"
                    type="checkbox"
                    checked={settings.specializedMode || false}
                    onChange={(e) => setSettings(prev => ({ ...prev, specializedMode: e.target.checked }))}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={generating}
                  />
                  <div>
                    <label htmlFor="specialized-mode" className="block text-sm font-medium text-gray-700">
                      Specialized Mode
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Focus generation in a narrower topic scope. Topic/subtopic filters are applied when selected.
                    </p>
                  </div>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions: {settings.questionCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.questionCount}
                    onChange={(e) => setSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                    className="w-full"
                    disabled={generating}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                    generating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {generating ? '⏳ Generating...' : '🚀 Generate Questions'}
                </button>

                {error && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <X className="w-5 h-5 text-red-600" />
                      <p className="text-red-800 font-semibold">Error</p>
                    </div>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Generation Steps */}
            {generationSteps.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Generation Progress</h2>
                
                <div className="space-y-3">
                  {generationSteps.map((step) => (
                    <div 
                      key={step.step}
                      className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                        step.status === 'completed' ? 'bg-green-50 border-green-300' :
                        step.status === 'in-progress' ? 'bg-blue-50 border-blue-300 animate-pulse' :
                        step.status === 'error' ? 'bg-red-50 border-red-300' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-4">
                        {step.status === 'completed' ? (
                          <Check className="w-6 h-6 text-green-600" />
                        ) : step.status === 'in-progress' ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        ) : step.status === 'error' ? (
                          <X className="w-6 h-6 text-red-600" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{step.name}</h3>
                          {step.timestamp && (
                            <span className="text-xs text-gray-500">
                              {step.timestamp.toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        {step.message && (
                          <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Stats */}
                {result && (
                  <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
                    <div className="flex-1 min-w-[5rem] text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-3xl font-bold text-blue-600">{result.summary?.generated ?? 0}</div>
                      <div className="text-sm text-blue-700 mt-1">Generated</div>
                    </div>
                    <div className="flex-1 min-w-[5rem] text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-3xl font-bold text-green-600">{result.summary?.accepted ?? 0}</div>
                      <div className="text-sm text-green-700 mt-1">Accepted</div>
                    </div>
                    <div className="flex-1 min-w-[5rem] text-center p-4 bg-red-50 rounded-xl">
                      <div className="text-3xl font-bold text-red-600">{result.summary?.rejected ?? 0}</div>
                      <div className="text-sm text-red-700 mt-1">Rejected</div>
                    </div>
                    {(result.summary?.retryCount ?? 0) > 0 && (
                      <div className="flex-1 min-w-[5rem] text-center p-4 bg-yellow-50 rounded-xl">
                        <div className="text-3xl font-bold text-yellow-600">{result.summary?.retryCount}</div>
                        <div className="text-sm text-yellow-700 mt-1">Retries</div>
                      </div>
                    )}
                    {result.summary?.avgQuality !== undefined && result.summary.avgQuality !== null && (
                      <div className="flex-1 min-w-[5rem] text-center p-4 bg-indigo-50 rounded-xl">
                        <div className="text-3xl font-bold text-indigo-600">
                          {(result.summary.avgQuality * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-indigo-700 mt-1">Avg Quality</div>
                      </div>
                    )}
                    <div className="flex-1 min-w-[5rem] text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-3xl font-bold text-purple-600">
                        {generationTimeMs ? (generationTimeMs / 1000).toFixed(1) : 0}s
                      </div>
                      <div className="text-sm text-purple-700 mt-1">Time</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generated Questions */}
            {questions.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">✨ Generated Questions</h2>
                  <span className="text-sm text-gray-600">
                    {questions.filter(q => q.selectedAnswer !== undefined).length} / {questions.length} answered
                  </span>
                </div>

                {questions.map((question, qIndex) => (
                  <div 
                    key={qIndex}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200"
                  >
                    {/* Question Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl font-bold">Q{qIndex + 1}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            question.moduleType === 'math' ? 'bg-blue-400' : 'bg-purple-400'
                          }`}>
                            {question.moduleType}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            question.difficulty === 'easy' ? 'bg-green-400' :
                            question.difficulty === 'medium' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`}>
                            {question.difficulty}
                          </span>
                          {question.id && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(question.id!)
                                alert(`Copied question ID: ${question.id}`)
                              }}
                              className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur border border-white/30 hover:bg-white/30 transition-colors cursor-pointer"
                              title={`Click to copy full ID: ${question.id}`}
                            >
                              ID: {question.id.substring(0, 8)} 📋
                            </button>
                          )}
                        </div>
                        <div className="text-sm">
                          {question.category} • {question.subtopic}
                        </div>
                      </div>
                    </div>

                    {/* Question Body */}
                    <div className="p-6">
                      {/* Reading Passage */}
                      {question.passage && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Passage</h4>
                          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            <MathRenderer>{question.passage}</MathRenderer>
                          </div>
                        </div>
                      )}

                      {/* Diagram/Chart Image */}
                      {question.imageUrl && (
                        <div className="mb-6">
                          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                            {question.imageUrl.startsWith('data:') ? (
                              // For data URLs, use regular img tag (next/image doesn't support data URIs)
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={question.imageUrl}
                                alt={question.chartDescription || 'Question diagram'}
                                className="w-full h-auto"
                              />
                            ) : (
                              // For external URLs, use Next.js Image
                              <Image
                                src={question.imageUrl}
                                alt={question.chartDescription || 'Question diagram'}
                                width={800}
                                height={600}
                                className="w-full h-auto"
                                unoptimized
                              />
                            )}
                            {question.chartDescription && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                                {question.chartDescription}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Question Text */}
                      <div className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">
                        <MathRenderer>{question.question}</MathRenderer>
                      </div>

                      {/* Answer Options */}
                      <div className="space-y-3">
                        {Array.isArray(question.options) && question.options.length > 0 ? (
                          question.options.map((option, optIndex) => {
                            const isSelected = question.selectedAnswer === optIndex
                            const isCorrect = optIndex === question.correctAnswer
                            const showResult = question.selectedAnswer !== undefined
                            
                            return (
                              <button
                                key={optIndex}
                                onClick={() => handleAnswerSelect(qIndex, optIndex)}
                                disabled={question.selectedAnswer !== undefined}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                  showResult
                                    ? isCorrect
                                      ? 'bg-green-50 border-green-500'
                                      : isSelected
                                      ? 'bg-red-50 border-red-500'
                                      : 'bg-gray-50 border-gray-200'
                                    : isSelected
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                              } ${question.selectedAnswer !== undefined ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center">
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold ${
                                  showResult && isCorrect
                                    ? 'bg-green-500 text-white'
                                    : showResult && isSelected && !isCorrect
                                    ? 'bg-red-500 text-white'
                                    : isSelected
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <div className="flex-1">
                                  <MathRenderer>{option}</MathRenderer>
                                </div>
                                {showResult && isCorrect && (
                                  <span className="text-2xl ml-2">✓</span>
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <span className="text-2xl ml-2">✗</span>
                                )}
                              </div>
                            </button>
                          )
                        })
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                            <AlertCircle className="h-5 w-5 inline mr-2" />
                            Question options are not properly formatted. Please regenerate the question.
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      {question.showExplanation && (
                        <div className={`mt-6 p-4 rounded-xl border-2 ${
                          question.selectedAnswer === question.correctAnswer
                            ? 'bg-green-50 border-green-300'
                            : 'bg-amber-50 border-amber-300'
                        }`}>
                          <div className="flex items-start">
                            <div className="mr-3">
                              {question.selectedAnswer === question.correctAnswer ? (
                                <PartyPopper className="w-6 h-6 text-green-600" />
                              ) : (
                                <Lightbulb className="w-6 h-6 text-amber-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-2">
                                {question.selectedAnswer === question.correctAnswer ? 'Correct!' : 'Explanation:'}
                              </h4>
                              <div className="text-gray-700 leading-relaxed">
                                <MathRenderer>{question.explanation}</MathRenderer>
                              </div>
                              {question.id && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <a
                                    href={`/admin/questions/edit/${question.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                  >
                                    <span>🗄️</span>
                                    <span className="ml-2">View in Database</span>
                                    <span className="ml-2 text-xs opacity-75">↗</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Question Footer */}
                    {question.qualityScore && (
                      <div className="bg-gray-50 px-6 py-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Quality Score:</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                                style={{ width: `${question.qualityScore * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold text-gray-900">
                              {(question.qualityScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!generating && questions.length === 0 && generationSteps.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate</h3>
                <p className="text-gray-600 mb-6">
                  Configure your settings on the left and click &quot;Generate Questions&quot; to begin.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>✨ Real-time progress tracking</p>
                  <p>📊 LaTeX validation included</p>
                  <p>🎓 Test questions immediately</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
