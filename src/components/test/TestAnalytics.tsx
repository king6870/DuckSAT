"use client"

import { TestResult } from '@/types/test'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { generateDetailedAnalytics, getScoreLevel } from '@/utils/satScoring'

interface TestAnalyticsProps {
  testResults: TestResult
}

export default function TestAnalytics({ testResults }: TestAnalyticsProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (session && !saved) {
      saveTestResults()
    }
  }, [session, saved])

  const saveTestResults = async () => {
    try {
      const response = await fetch('/api/test-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testResults,
          userId: session?.user?.email
        })
      })

      if (response.ok) {
        setSaved(true)
      }
    } catch (error) {
      console.error('Failed to save test results:', error)
    }
  }

  try {
    // Generate detailed SAT analytics
    const allQuestions = testResults.moduleResults.flat()
    const analytics = generateDetailedAnalytics(allQuestions, testResults.totalTimeSpent)
    const scoreLevel = getScoreLevel(analytics.satScore.totalScore)

    // Calculate time statistics
    const totalTimeMinutes = Math.floor(testResults.totalTimeSpent / 60)
    const totalTimeSeconds = testResults.totalTimeSpent % 60

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              SAT Practice Test Results
            </h1>
            <p className="text-gray-600">Official SAT scoring scale (400-1600)</p>
          </div>

          {/* SAT Score Card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-blue-200">
            <div className="text-center mb-6">
              <div className={`text-7xl font-bold ${scoreLevel.color} mb-2`}>
                {analytics.satScore.totalScore}
              </div>
              <div className="text-2xl font-semibold text-gray-800 mb-2">Total SAT Score</div>
              <div className={`text-lg font-medium ${scoreLevel.color} mb-2`}>
                {scoreLevel.level} • {analytics.satScore.percentile}th Percentile
              </div>
              <div className="text-gray-600">{scoreLevel.description}</div>
            </div>

            {/* Section Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {analytics.satScore.readingWritingScore}
                </div>
                <div className="text-lg font-semibold text-gray-800 mb-1">Reading & Writing</div>
                <div className="text-sm text-gray-600">
                  {analytics.satScore.scoreBreakdown.readingWriting.rawScore} correct • {analytics.satScore.scoreBreakdown.readingWriting.percentCorrect}%
                </div>
              </div>
              
              <div className="bg-green-50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {analytics.satScore.mathScore}
                </div>
                <div className="text-lg font-semibold text-gray-800 mb-1">Math</div>
                <div className="text-sm text-gray-600">
                  {analytics.satScore.scoreBreakdown.math.rawScore} correct • {analytics.satScore.scoreBreakdown.math.percentCorrect}%
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{testResults.correctAnswers}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{testResults.totalQuestions - testResults.correctAnswers}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalTimeMinutes}:{totalTimeSeconds.toString().padStart(2, '0')}</div>
                <div className="text-sm text-gray-600">Total Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{analytics.timeAnalysis.averagePerQuestion}s</div>
                <div className="text-sm text-gray-600">Avg/Question</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={() => router.push('/practice-test')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
            >
              Take Another Test
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg border-2 border-gray-300 hover:border-gray-400 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in TestAnalytics:', error)
    
    // Fallback UI if analytics fail
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Error</h1>
            <p className="text-gray-600 mb-6">
              There was an issue calculating your test results. Here's your basic score:
            </p>
            
            <div className="bg-blue-50 rounded-2xl p-6 mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {testResults.score}%
              </div>
              <div className="text-lg text-gray-700">
                {testResults.correctAnswers} out of {testResults.totalQuestions} correct
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/practice-test')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
              >
                Take Another Test
              </button>
              <button
                onClick={() => router.push('/progress')}
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
              >
                View Progress
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-white text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg border-2 border-gray-300 hover:border-gray-400 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
