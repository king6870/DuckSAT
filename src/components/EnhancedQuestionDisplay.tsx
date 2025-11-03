'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Question {
  id: string
  moduleType: string
  difficulty: string
  category: string
  subtopic?: string
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  explanation: string
  wrongAnswerExplanations?: Record<number, string>
  imageUrl?: string
  imageAlt?: string
  chartData?: {
    type: string;
    data?: Array<{ student: string; score: number; x?: number; y?: number }>;
    points?: Array<{ x: number; y: number; label: string }>;
    line?: { from: number[]; to: number[] };
  }
  timeEstimate: number
  source?: string
  tags?: string[]
}

interface EnhancedQuestionDisplayProps {
  question: Question
  selectedAnswer: number
  onAnswerSelect: (answerIndex: number) => void
  showExplanation?: boolean
  isReviewMode?: boolean
}

export default function EnhancedQuestionDisplay({
  question,
  selectedAnswer,
  onAnswerSelect,
  showExplanation = false,
  isReviewMode = false
}: EnhancedQuestionDisplayProps) {
  const [showChart, setShowChart] = useState(false)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getOptionLabel = (index: number) => String.fromCharCode(65 + index) // A, B, C, D

  const renderChart = () => {
    if (!question.chartData) return null

    const { type, data } = question.chartData

    if (type === 'scatter') {
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="text-sm font-medium mb-2">Coordinate Plane</div>
          <div className="relative w-64 h-64 bg-white border border-gray-300 mx-auto">
            {/* Simple coordinate plane visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs text-gray-500">
                Interactive chart would render here
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (type === 'bar' && data) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="text-sm font-medium mb-2">Student Scores</div>
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-xs w-12">{item.student}:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(item.score / 100) * 100}%` }}
                  >
                    <span className="text-xs text-white">{item.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
            {question.difficulty.toUpperCase()}
          </span>
          <span className="text-sm text-gray-600">
            {question.category.replace('-', ' ').toUpperCase()}
          </span>
          {question.subtopic && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {question.subtopic.replace('-', ' ')}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Est. {Math.floor(question.timeEstimate / 60)}:{(question.timeEstimate % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Passage */}
      {question.passage && (
        <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
          <div className="text-sm font-medium text-gray-700 mb-2">Passage:</div>
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {question.passage}
          </div>
        </div>
      )}

      {/* Image */}
      {question.imageUrl && (
        <div className="flex justify-center">
          <div className="relative">
            <Image
              src={question.imageUrl}
              alt={question.imageAlt || 'Question diagram'}
              width={400}
              height={300}
              className="rounded-lg border"
            />
            <div className="text-xs text-gray-500 mt-1 text-center">
              {question.imageAlt}
            </div>
          </div>
        </div>
      )}

      {/* Chart Data */}
      {question.chartData && (
        <div className="space-y-2">
          <button
            onClick={() => setShowChart(!showChart)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showChart ? 'Hide Chart' : 'Show Chart'}
          </button>
          {showChart && renderChart()}
        </div>
      )}

      {/* Question */}
      <div className="text-lg font-medium text-gray-900">
        {question.question}
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrect = index === question.correctAnswer
          const isWrong = isReviewMode && isSelected && !isCorrect
          
          let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 '
          
          if (isReviewMode) {
            if (isCorrect) {
              buttonClass += 'border-green-500 bg-green-50 text-green-800'
            } else if (isWrong) {
              buttonClass += 'border-red-500 bg-red-50 text-red-800'
            } else if (isSelected) {
              buttonClass += 'border-blue-500 bg-blue-50 text-blue-800'
            } else {
              buttonClass += 'border-gray-300 bg-white text-gray-700'
            }
          } else {
            if (isSelected) {
              buttonClass += 'border-blue-500 bg-blue-50 text-blue-800'
            } else {
              buttonClass += 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }
          }

          return (
            <button
              key={index}
              onClick={() => !isReviewMode && onAnswerSelect(index)}
              className={buttonClass}
              disabled={isReviewMode}
            >
              <div className="flex items-start space-x-3">
                <span className="font-medium text-sm mt-0.5">
                  {getOptionLabel(index)}.
                </span>
                <span className="flex-1">{option}</span>
                {isReviewMode && isCorrect && (
                  <span className="text-green-600 text-sm">✓</span>
                )}
                {isReviewMode && isWrong && (
                  <span className="text-red-600 text-sm">✗</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanations */}
      {showExplanation && (
        <div className="space-y-4 pt-4 border-t">
          {/* Correct Answer Explanation */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="font-medium text-green-800 mb-2">
              Correct Answer: {getOptionLabel(question.correctAnswer)}
            </div>
            <div className="text-sm text-green-700 whitespace-pre-line">
              {question.explanation}
            </div>
          </div>

          {/* Wrong Answer Explanations */}
          {question.wrongAnswerExplanations && Object.keys(question.wrongAnswerExplanations).length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-gray-700">Why other answers are incorrect:</div>
              {Object.entries(question.wrongAnswerExplanations).map(([answerIndex, explanation]) => (
                <div key={answerIndex} className="bg-red-50 p-3 rounded border border-red-200">
                  <div className="font-medium text-red-800 text-sm">
                    {getOptionLabel(parseInt(answerIndex))}: {question.options[parseInt(answerIndex)]}
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question Metadata */}
      {(question.source || question.tags) && (
        <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
          {question.source && (
            <div>Source: {question.source}</div>
          )}
          {question.tags && question.tags.length > 0 && (
            <div className="flex items-center space-x-2">
              <span>Tags:</span>
              <div className="flex flex-wrap gap-1">
                {question.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
