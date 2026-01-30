"use client"

import { Question } from '@/types/test'

interface ReviewPageProps {
  questions: Question[]
  selectedAnswers: number[]
  currentModule: {
    title: string
    questionCount: number
  }
  onQuestionClick: (index: number) => void
  onSubmit: () => void
  onBackToTest: () => void
  timeRemaining: number
}

export default function ReviewPage({
  questions,
  selectedAnswers,
  currentModule,
  onQuestionClick,
  onSubmit,
  onBackToTest,
  timeRemaining
}: ReviewPageProps) {
  const answeredCount = selectedAnswers.filter(a => a !== -1).length
  const unansweredCount = questions.length - answeredCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                📋 Review Your Answers
              </h1>
              <p className="text-gray-600">
                {currentModule.title}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold transition-colors ${
                timeRemaining <= 300 // 5 minutes
                  ? 'text-red-500 animate-pulse'
                  : timeRemaining <= 600 // 10 minutes
                  ? 'text-orange-500'
                  : 'text-purple-600'
              }`}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-500">
                {timeRemaining <= 300 ? '⚠️ Time Running Out!' : 'Time Remaining'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border-2 border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-gray-700 font-medium mt-2">Total Questions</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border-2 border-green-200">
              <div className="text-3xl font-bold text-green-600">{answeredCount}</div>
              <div className="text-gray-700 font-medium mt-2">Answered</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl border-2 border-orange-200">
              <div className="text-3xl font-bold text-orange-600">{unansweredCount}</div>
              <div className="text-gray-700 font-medium mt-2">Unanswered</div>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-yellow-900 mb-1">
                    You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-yellow-800">
                    Review these questions before submitting your module.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={onBackToTest}
              className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-colors font-medium text-lg"
            >
              ← Back to Test
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:shadow-lg transition-all font-medium text-lg"
            >
              Submit Module ✓
            </button>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Question Status</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {questions.map((question, index) => {
              const isAnswered = selectedAnswers[index] !== -1
              
              return (
                <button
                  key={question.id}
                  onClick={() => onQuestionClick(index)}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-200
                    hover:scale-105 hover:shadow-lg
                    ${isAnswered
                      ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300'
                      : 'bg-gradient-to-br from-orange-50 to-red-100 border-orange-300'
                    }
                  `}
                >
                  <div className={`text-3xl font-bold mb-2 ${
                    isAnswered ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div className={`text-xs font-medium ${
                    isAnswered ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    {isAnswered ? '✓ Answered' : '○ Unanswered'}
                  </div>

                  {isAnswered && (
                    <div className="mt-2 text-sm font-bold text-green-700">
                      {String.fromCharCode(65 + selectedAnswers[index])}
                    </div>
                  )}

                  {/* Status indicator */}
                  <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                    isAnswered ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
