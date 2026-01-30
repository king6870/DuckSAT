"use client"

import React from 'react'
import MathRenderer from './MathRenderer'
import ChartRenderer from './ChartRenderer'

interface QuestionData {
  id: string
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  explanation: string
  wrongAnswerExplanations?: string[]
  moduleType: string
  difficulty: string
  category: string
  subtopic: string
  chartData?: Record<string, unknown> | null
  imageUrl?: string
  imageAlt?: string
  timeEstimate: number
  source: string
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ComprehensiveQuestionDisplayProps {
  question: QuestionData
  showAnswer?: boolean
  showMetadata?: boolean
}

export default function ComprehensiveQuestionDisplay({
  question,
  showAnswer = false,
  showMetadata = true
}: ComprehensiveQuestionDisplayProps) {
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {showMetadata && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Module:</span>
              <div className="capitalize">{question.moduleType.replace('-', ' ')}</div>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Difficulty:</span>
              <div className="capitalize">{question.difficulty}</div>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Category:</span>
              <div>{question.category}</div>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Time:</span>
              <div>{question.timeEstimate}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Passage */}
      {question.passage && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-800 mb-2">📖 Reading Passage</h3>
          <div className="prose prose-sm max-w-none">
            <MathRenderer>{question.passage}</MathRenderer>
          </div>
        </div>
      )}

      {/* Chart/Image */}
      {(question.chartData || question.imageUrl) && question.chartData && (
        <div className="mb-6">
          <ChartRenderer 
            chartData={question.chartData as Record<string, unknown>}
            imageUrl={question.imageUrl}
            imageAlt={question.imageAlt}
            className="mb-4"
          />
        </div>
      )}

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          <MathRenderer>{question.question}</MathRenderer>
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-2 ${
                showAnswer && index === question.correctAnswer
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start">
                <span className={`font-semibold mr-3 w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  showAnswer && index === question.correctAnswer
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">
                  <MathRenderer>{option}</MathRenderer>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Answer and Explanation */}
      {showAnswer && (
        <div className="border-t pt-6">
          <div className="mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <h3 className="font-semibold text-green-800 mb-2">✅ Correct Answer</h3>
            <p className="text-green-700">
              <strong>{String.fromCharCode(65 + question.correctAnswer)}</strong>: {question.options[question.correctAnswer]}
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Explanation</h3>
            <div className="text-blue-700">
              <MathRenderer>{question.explanation}</MathRenderer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
