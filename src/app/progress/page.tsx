"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProgressData {
  testsCompleted: number
  averageScore: number
  strongAreas: string[]
  weakAreas: string[]
  recentScores: number[]
  timeSpent: number
  categoryPerformance: Array<{
    category: string
    percentage: number
    correct: number
    total: number
  }>
  modulePerformance: Array<{
    module: string
    percentage: number
    correct: number
    total: number
  }>
  testHistory: Array<{
    id: string
    score: number
    completedAt: string
    timeSpent: number
    moduleType: string
  }>
}

export default function Progress() {
  const { data: session } = useSession()
  const router = useRouter()
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/')
      return
    }

    fetchProgressData()
  }, [session, router])

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/progress')
      const result = await response.json()
      
      if (result.success) {
        setProgressData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    )
  }

  if (!progressData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Progress Data</h2>
          <p className="text-gray-600 mb-6">Take your first practice test to see your progress!</p>
          <button
            onClick={() => router.push('/practice-test')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Start Practice Test
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="p-4 flex justify-between items-center">
        <button
          onClick={() => router.push('/')}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
        >
          ← Back to Home
        </button>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Your SAT Progress</h1>
          <p className="text-xl text-gray-600">Track your improvement and identify areas for growth</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{progressData.testsCompleted}</div>
            <div className="text-gray-600">Tests Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{progressData.averageScore}</div>
            <div className="text-gray-600">Average Score</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{progressData.timeSpent}</div>
            <div className="text-gray-600">Minutes Studied</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {progressData.recentScores.length > 0 ? Math.max(...progressData.recentScores) : 0}
            </div>
            <div className="text-gray-600">Best Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Module Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Module Performance</h3>
            <div className="space-y-4">
              {progressData.modulePerformance.map((module) => (
                <div key={module.module}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">{module.module}</span>
                    <span className="text-sm text-gray-600">{module.correct}/{module.total} ({module.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${module.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Scores */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Test Scores</h3>
            {progressData.recentScores.length > 0 ? (
              <div className="space-y-3">
                {progressData.recentScores.map((score, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">Test {progressData.recentScores.length - index}</span>
                    <span className={`font-bold ${score >= 75 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No test scores yet</p>
            )}
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-green-600 mb-4">💪 Strong Areas</h3>
            {progressData.strongAreas.length > 0 ? (
              <div className="space-y-2">
                {progressData.strongAreas.map((area, index) => (
                  <div key={index} className="flex items-center p-3 bg-green-50 rounded">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="font-medium text-green-800">{area}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Complete more tests to identify strong areas</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-red-600 mb-4">📚 Areas for Improvement</h3>
            {progressData.weakAreas.length > 0 ? (
              <div className="space-y-2">
                {progressData.weakAreas.map((area, index) => (
                  <div key={index} className="flex items-center p-3 bg-red-50 rounded">
                    <span className="text-red-600 mr-2">!</span>
                    <span className="font-medium text-red-800">{area}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Great job! No weak areas identified yet</p>
            )}
          </div>
        </div>

        {/* Category Performance */}
        {progressData.categoryPerformance.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Category Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressData.categoryPerformance.map((category) => (
                <div key={category.category} className="p-4 border rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">{category.category}</div>
                  <div className="text-sm text-gray-600 mb-2">
                    {category.correct}/{category.total} correct ({category.percentage}%)
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        category.percentage >= 75 ? 'bg-green-500' : 
                        category.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test History */}
        {progressData.testHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Test History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Module</th>
                    <th className="text-left py-2">Score</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {progressData.testHistory.map((test) => (
                    <tr key={test.id} className="border-b">
                      <td className="py-2">{new Date(test.completedAt).toLocaleDateString()}</td>
                      <td className="py-2">{test.moduleType}</td>
                      <td className="py-2">
                        <span className={`font-medium ${
                          test.score >= 75 ? 'text-green-600' : 
                          test.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {test.score}%
                        </span>
                      </td>
                      <td className="py-2">{Math.round(test.timeSpent / 60)}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/practice-test')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Take Another Practice Test
          </button>
          </div>
      </div>
    </div>
  )
}
