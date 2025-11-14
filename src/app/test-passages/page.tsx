"use client"

import React, { useState, useEffect } from 'react'
import ComprehensiveQuestionDisplay from '@/components/ComprehensiveQuestionDisplay'

interface Question {
  id: string
  moduleType: string
  difficulty: string
  category: string
  subtopic: string
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  explanation: string
  wrongAnswerExplanations?: string[]
  imageUrl?: string
  imageAlt?: string
  chartData?: Record<string, unknown> | null
  timeEstimate: number
  source: string
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function TestPassages() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions?moduleType=reading-writing&limit=5')
        if (response.ok) {
          const data = await response.json()
          setQuestions(data)
        }
      } catch (error) {
        console.error('Error fetching questions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading questions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Passage Display Test
        </h1>
        
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Debug Info</h2>
          <p>Total questions loaded: {questions.length}</p>
          <p>Questions with passages: {questions.filter(q => q.passage).length}</p>
          <p>Questions without passages: {questions.filter(q => !q.passage).length}</p>
        </div>

        <div className="space-y-8">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-lg p-4">
              <div className="mb-4 p-2 bg-gray-100 rounded">
                <h3 className="font-semibold">Question {index + 1} Debug Info:</h3>
                <p>ID: {question.id}</p>
                <p>Has Passage: {question.passage ? 'YES' : 'NO'}</p>
                <p>Passage Length: {question.passage?.length || 0} characters</p>
                <p>Category: {question.category}</p>
                <p>Subtopic: {question.subtopic}</p>
              </div>
              
              <ComprehensiveQuestionDisplay
                question={question}
                showAnswer={true}
                showMetadata={true}
              />
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No questions found</p>
          </div>
        )}
      </div>
    </div>
  )
}
