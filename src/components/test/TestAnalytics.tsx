"use client"

import { TestResult } from '@/types/test'

interface TestAnalyticsProps {
  testResults: TestResult
}

export default function TestAnalytics({ testResults }: TestAnalyticsProps) {
  const totalQuestions = testResults.moduleResults.reduce(
    (sum, module) => sum + module.length,
    0
  )
  const totalCorrect = testResults.moduleResults.reduce(
    (sum, module) => sum + module.filter(q => q.isCorrect).length,
    0
  )
  const percentage = Math.round((totalCorrect / totalQuestions) * 100)
  
  // Calculate time analytics
  const allResults = testResults.moduleResults.flat()
  const totalTimeOnQuestions = allResults.reduce((sum, q) => sum + (q.timeSpent || 0), 0)
  const avgTimePerQuestion = totalTimeOnQuestions > 0 ? Math.round(totalTimeOnQuestions / totalQuestions) : 0
  
  // Find slowest and fastest questions
  const questionsWithTime = allResults.filter(q => q.timeSpent && q.timeSpent > 0)
  const slowestQuestion = questionsWithTime.length > 0 
    ? Math.max(...questionsWithTime.map(q => q.timeSpent || 0))
    : 0
  const fastestQuestion = questionsWithTime.length > 0
    ? Math.min(...questionsWithTime.map(q => q.timeSpent || 0))
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20">
          <div className="text-center mb-12">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Test Complete!
            </h1>
            <p className="text-xl text-gray-600">
              Here&apos;s how you performed
            </p>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8 mb-8 border-2 border-blue-200 text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {percentage}%
            </div>
            <div className="text-xl text-gray-700">
              {totalCorrect} out of {totalQuestions} correct
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {testResults.moduleResults.map((module, index) => {
              const moduleCorrect = module.filter(q => q.isCorrect).length
              const modulePercentage = Math.round((moduleCorrect / module.length) * 100)
              
              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200"
                >
                  <h3 className="font-bold text-purple-900 text-lg mb-3">
                    Module {index + 1}
                  </h3>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {modulePercentage}%
                  </div>
                  <div className="text-sm text-purple-700">
                    {moduleCorrect}/{module.length} correct
                  </div>
                </div>
              )
            })}
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 rounded-2xl p-6 text-center border-2 border-green-200">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-2xl font-bold text-green-600">{totalCorrect}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            
            <div className="bg-red-50 rounded-2xl p-6 text-center border-2 border-red-200">
              <div className="text-3xl mb-2">✗</div>
              <div className="text-2xl font-bold text-red-600">{totalQuestions - totalCorrect}</div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
            
            <div className="bg-blue-50 rounded-2xl p-6 text-center border-2 border-blue-200">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(testResults.totalTimeSpent / 60)}m
              </div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
            
            <div className="bg-purple-50 rounded-2xl p-6 text-center border-2 border-purple-200">
              <div className="text-3xl mb-2">⏲️</div>
              <div className="text-2xl font-bold text-purple-600">
                {avgTimePerQuestion}s
              </div>
              <div className="text-sm text-gray-600">Avg Per Question</div>
            </div>
          </div>
          
          {/* Time Distribution */}
          {questionsWithTime.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 mb-8 border-2 border-orange-200">
              <h3 className="font-bold text-orange-900 text-lg mb-4 flex items-center gap-2">
                <span>⏰</span>
                Time Distribution
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Fastest Question</div>
                  <div className="text-2xl font-bold text-green-600">{fastestQuestion}s</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Slowest Question</div>
                  <div className="text-2xl font-bold text-orange-600">{slowestQuestion}s</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/practice-test'}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
            >
              Take Another Test
            </button>
            <button
              onClick={() => window.location.href = '/progress'}
              className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all"
            >
              View Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
