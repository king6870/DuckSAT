"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import ComprehensiveQuestionDisplay from '@/components/ComprehensiveQuestionDisplay'
import ChartBuilder from '@/components/admin/ChartBuilder'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

interface QuestionForm {
  question: string
  passage: string
  options: string[]
  correctAnswer: number
  explanation: string
  wrongAnswerExplanations: string[]
  moduleType: string
  difficulty: string
  category: string
  subtopic: string
  chartDescription: string
  interactionType: string
  graphType: string
  timeEstimate: number
  tags: string[]
  isActive: boolean
  chartData: Record<string, unknown> | null
}

export default function EditQuestion() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const questionId = params.id as string

  const [form, setForm] = useState<QuestionForm>({
    question: '',
    passage: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    wrongAnswerExplanations: ['', '', '', ''],
    moduleType: 'math',
    difficulty: 'medium',
    category: '',
    subtopic: '',
    chartDescription: '',
    interactionType: 'point-placement',
    graphType: 'coordinate-plane',
    timeEstimate: 90,
    tags: [],
    isActive: true,
    chartData: null
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      router.push('/')
      return
    }
  }, [session, status, router])

  // Load question data
  useEffect(() => {
    if (questionId) {
      fetchQuestion()
    }
  }, [questionId])

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`)
      const data = await response.json()

      if (data.success) {
        const q = data.question
        setForm({
          question: q.question,
          passage: q.passage || '',
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          wrongAnswerExplanations: q.wrongAnswerExplanations || ['', '', '', ''],
          moduleType: q.moduleType,
          difficulty: q.difficulty,
          category: q.category,
          subtopic: q.subtopic,
          chartDescription: q.chartData?.description || '',
          interactionType: q.chartData?.interactionType || 'point-placement',
          graphType: q.chartData?.graphType || 'coordinate-plane',
          timeEstimate: q.timeEstimate,
          tags: q.tags || [],
          isActive: q.isActive,
          chartData: q.chartData || null
        })
      }
    } catch (error) {
      console.error('Failed to fetch question:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        chartData: form.chartData
      }

      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        alert('Question updated successfully!')
        router.push('/')
      } else {
        alert('Failed to update question')
      }
    } catch (error) {
      console.error('Failed to save question:', error)
      alert('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...form.options]
    newOptions[index] = value
    setForm({ ...form, options: newOptions })
  }

  const updateWrongExplanation = (index: number, value: string) => {
    const newExplanations = [...form.wrongAnswerExplanations]
    newExplanations[index] = value
    setForm({ ...form, wrongAnswerExplanations: newExplanations })
  }

  if (status === 'loading' || loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Question</h1>
                <p className="mt-2 text-gray-600">Modify question details and preview changes</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowPreview(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Preview
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Module Type</label>
                <select
                  value={form.moduleType}
                  onChange={(e) => setForm({ ...form, moduleType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="math">Math</option>
                  <option value="reading-writing">Reading & Writing</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Estimate (seconds)</label>
                <input
                  type="number"
                  value={form.timeEstimate}
                  onChange={(e) => setForm({ ...form, timeEstimate: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            {/* Category and Subtopic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Algebra, Reading Comprehension"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic</label>
                <input
                  type="text"
                  value={form.subtopic}
                  onChange={(e) => setForm({ ...form, subtopic: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Linear Equations, Main Ideas"
                />
              </div>
            </div>

            {/* Passage (for reading questions) */}
            {form.moduleType === 'reading-writing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passage (Optional)</label>
                <textarea
                  value={form.passage}
                  onChange={(e) => setForm({ ...form, passage: e.target.value })}
                  rows={6}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter the reading passage here..."
                />
              </div>
            )}

            {/* Chart/Diagram Builder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chart/Diagram (Optional)</label>
              <ChartBuilder
                chartData={form.chartData as Record<string, unknown> | null}
                onChange={(chartData) => setForm({ ...form, chartData: chartData as Record<string, unknown> | null })}
              />
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter the question text..."
              />
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
              <div className="space-y-3">
                {form.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={form.correctAnswer === index}
                      onChange={() => setForm({ ...form, correctAnswer: index })}
                      className="text-blue-600"
                    />
                    <span className="font-medium text-gray-700">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer Explanation</label>
              <textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Explain why the correct answer is correct..."
              />
            </div>

            {/* Wrong Answer Explanations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wrong Answer Explanations (Optional)</label>
              <div className="space-y-3">
                {form.wrongAnswerExplanations.map((explanation, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="font-medium text-gray-700 mt-2">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <textarea
                      value={explanation}
                      onChange={(e) => updateWrongExplanation(index, e.target.value)}
                      rows={2}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      placeholder={`Why option ${String.fromCharCode(65 + index)} is incorrect...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="text-blue-600"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (question will be available for practice tests)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Question Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <ComprehensiveQuestionDisplay
                question={{
                  id: questionId,
                  question: form.question,
                  passage: form.passage,
                  options: form.options,
                  correctAnswer: form.correctAnswer,
                  explanation: form.explanation,
                  wrongAnswerExplanations: form.wrongAnswerExplanations,
                  moduleType: form.moduleType,
                  difficulty: form.difficulty,
                  category: form.category,
                  subtopic: form.subtopic,
                  chartData: form.chartDescription ? {
                    description: form.chartDescription,
                    interactionType: form.interactionType,
                    graphType: form.graphType
                  } : undefined,
                  timeEstimate: form.timeEstimate,
                  source: 'Preview',
                  tags: form.tags,
                  isActive: form.isActive,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }}
                showAnswer={true}
                showMetadata={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
