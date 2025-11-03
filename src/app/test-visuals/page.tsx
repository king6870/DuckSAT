"use client"

import React, { useState, useEffect } from 'react'
import ComprehensiveQuestionDisplay from '@/components/ComprehensiveQuestionDisplay'

export default function TestVisuals() {
  const [mathQuestions, setMathQuestions] = useState<any[]>([])
  const [readingQuestions, setReadingQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Get math questions with charts
        const mathResponse = await fetch('/api/questions?moduleType=math&limit=5')
        const mathData = await mathResponse.json()
        
        // Get reading questions with passages
        const readingResponse = await fetch('/api/questions?moduleType=reading-writing&limit=5')
        const readingData = await readingResponse.json()
        
        setMathQuestions(mathData)
        setReadingQuestions(readingData)
      } catch (error) {
        console.error('Error fetching questions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Loading visual test...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Visual Elements Test</h1>
        
        {/* Math Questions with Charts */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-blue-600">📊 Math Questions with Charts</h2>
          <div className="grid gap-6">
            {mathQuestions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4 p-3 bg-blue-100 rounded">
                  <h3 className="font-semibold text-blue-800">Question {index + 1} - Chart Data:</h3>
                  <p className="text-sm">Has Chart: {question.chartData ? 'YES' : 'NO'}</p>
                  {question.chartData && (
                    <div className="mt-2 text-xs">
                      <p><strong>Type:</strong> {question.chartData.graphType}</p>
                      <p><strong>Interaction:</strong> {question.chartData.interactionType}</p>
                      <p><strong>Description:</strong> {question.chartData.description?.substring(0, 100)}...</p>
                    </div>
                  )}
                </div>
                <ComprehensiveQuestionDisplay
                  question={question}
                  showAnswer={false}
                  showMetadata={true}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reading Questions with Passages */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-green-600">📚 Reading Questions with Passages</h2>
          <div className="grid gap-6">
            {readingQuestions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4 p-3 bg-green-100 rounded">
                  <h3 className="font-semibold text-green-800">Question {index + 1} - Passage Data:</h3>
                  <p className="text-sm">Has Passage: {question.passage ? 'YES' : 'NO'}</p>
                  <p className="text-sm">Passage Length: {question.passage?.length || 0} characters</p>
                </div>
                <ComprehensiveQuestionDisplay
                  question={question}
                  showAnswer={false}
                  showMetadata={true}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📈 Test Summary</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">Math Questions</h3>
              <p>Total: {mathQuestions.length}</p>
              <p>With Charts: {mathQuestions.filter(q => q.chartData).length}</p>
              <p>Chart Types: {Array.from(new Set(mathQuestions.filter(q => q.chartData).map(q => q.chartData?.graphType))).join(', ')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-green-600 mb-2">Reading Questions</h3>
              <p>Total: {readingQuestions.length}</p>
              <p>With Passages: {readingQuestions.filter(q => q.passage).length}</p>
              <p>Avg Passage Length: {Math.round(readingQuestions.filter(q => q.passage).reduce((sum, q) => sum + (q.passage?.length || 0), 0) / readingQuestions.filter(q => q.passage).length) || 0} chars</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
