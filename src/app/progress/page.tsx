"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProgressData {
  overview: {
    testsCompleted: number
    averageScore: number
    bestScore: number
    totalStudyTime: number
    averageSATScore: number
    bestSATScore: number
    latestSATScore: number
    improvementRate: number
  }
  modulePerformance: {
    readingWriting: {
      averageScore: number
      averageSATScore: number
      totalQuestions: number
      correctAnswers: number
      averageTimePerQuestion: number
    }
    math: {
      averageScore: number
      averageSATScore: number
      totalQuestions: number
      correctAnswers: number
      averageTimePerQuestion: number
    }
  }
  categoryPerformance: Array<{
    category: string
    totalQuestions: number
    correctAnswers: number
    percentage: number
    averageTime: number
    moduleType: string
  }>
  difficultyPerformance: {
    easy: { correct: number; total: number; percentage: number }
    medium: { correct: number; total: number; percentage: number }
    hard: { correct: number; total: number; percentage: number }
  }
  strongAreas: string[]
  weakAreas: string[]
  scoreProgression: Array<{
    testNumber: number
    score: number
    satScore: number
    date: string
  }>
  testHistory: Array<{
    id: string
    completedAt: string
    score: number
    satTotalScore: number
    satReadingScore: number
    satMathScore: number
    totalTimeSpent: number
    totalQuestions: number
    correctAnswers: number
    moduleFocus: string
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
      
      if (result.success && result.data) {
        setProgressData(result.data)
      } else {
        setProgressData(null)
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error)
      setProgressData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">📊</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No Progress Data Yet</h2>
          <p className="text-gray-600 mb-8 text-lg">Take your first practice test to start tracking your progress and see your improvement over time!</p>
          <button
            onClick={() => router.push('/practice-test')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all font-semibold text-lg"
          >
            Start Practice Test
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="p-4 flex justify-between items-center border-b bg-white/80 backdrop-blur">
        <button
          onClick={() => router.push('/')}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
        >
          ← Back to Home
        </button>
        <div className="text-sm text-gray-600">
          {session?.user?.name || session?.user?.email}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Your SAT Progress
          </h1>
          <p className="text-lg text-gray-600">Track your improvement and master the SAT</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-1">Tests Completed</div>
            <div className="text-3xl font-bold text-blue-600">{progressData.overview.testsCompleted}</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-500">
            <div className="text-sm text-gray-600 mb-1">Latest SAT Score</div>
            <div className="text-3xl font-bold text-purple-600">{progressData.overview.latestSATScore}</div>
            <div className="text-xs text-gray-500 mt-1">Avg: {progressData.overview.averageSATScore}</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-500">
            <div className="text-sm text-gray-600 mb-1">Best SAT Score</div>
            <div className="text-3xl font-bold text-green-600">{progressData.overview.bestSATScore}</div>
            <div className="text-xs text-gray-500 mt-1">Target: 1600</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-orange-500">
            <div className="text-sm text-gray-600 mb-1">Study Time</div>
            <div className="text-3xl font-bold text-orange-600">{formatStudyTime(progressData.overview.totalStudyTime)}</div>
            {progressData.overview.improvementRate !== 0 && (
              <div className={`text-xs mt-1 ${progressData.overview.improvementRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {progressData.overview.improvementRate > 0 ? '↑' : '↓'} {Math.abs(progressData.overview.improvementRate)}% improvement
              </div>
            )}
          </div>
        </div>

        {/* Module Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Reading & Writing */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">📖 Reading & Writing</h3>
              <div className="text-3xl font-bold text-blue-600">
                {progressData.modulePerformance.readingWriting.averageSATScore}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Accuracy</span>
                <span className="font-semibold text-gray-900">
                  {progressData.modulePerformance.readingWriting.averageScore}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all" 
                  style={{ width: `${progressData.modulePerformance.readingWriting.averageScore}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                <div>
                  <div className="text-gray-500">Questions</div>
                  <div className="font-semibold">
                    {progressData.modulePerformance.readingWriting.correctAnswers}/
                    {progressData.modulePerformance.readingWriting.totalQuestions}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Avg Time</div>
                  <div className="font-semibold">
                    {progressData.modulePerformance.readingWriting.averageTimePerQuestion}s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Math */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">🔢 Math</h3>
              <div className="text-3xl font-bold text-purple-600">
                {progressData.modulePerformance.math.averageSATScore}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Accuracy</span>
                <span className="font-semibold text-gray-900">
                  {progressData.modulePerformance.math.averageScore}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full transition-all" 
                  style={{ width: `${progressData.modulePerformance.math.averageScore}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
                <div>
                  <div className="text-gray-500">Questions</div>
                  <div className="font-semibold">
                    {progressData.modulePerformance.math.correctAnswers}/
                    {progressData.modulePerformance.math.totalQuestions}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Avg Time</div>
                  <div className="font-semibold">
                    {progressData.modulePerformance.math.averageTimePerQuestion}s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Progression Chart */}
        {progressData.scoreProgression.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📈 Score Progress</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[600px] h-64 flex items-end justify-around gap-2 px-4">
                {progressData.scoreProgression.map((test, index) => {
                  const maxScore = Math.max(...progressData.scoreProgression.map(t => t.score))
                  const height = (test.score / 100) * 200
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="text-xs text-gray-600 mb-2 font-semibold">
                        {test.score}%
                      </div>
                      <div className="relative w-full group">
                        <div 
                          className={`w-full rounded-t-lg transition-all cursor-pointer ${
                            test.score >= 75 ? 'bg-green-500' : 
                            test.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          } hover:opacity-80`}
                          style={{ height: `${height}px` }}
                        >
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            SAT: {test.satScore}<br/>
                            {new Date(test.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">#{test.testNumber}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Difficulty Performance */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Performance by Difficulty</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
              const data = progressData.difficultyPerformance[difficulty]
              const colorClass = difficulty === 'easy' ? 'green' : difficulty === 'medium' ? 'yellow' : 'red'
              return (
                <div key={difficulty} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-700 mb-2 capitalize">{difficulty}</div>
                  <div className={`text-4xl font-bold text-${colorClass}-600 mb-2`}>{data.percentage}%</div>
                  <div className="text-sm text-gray-600">
                    {data.correct} / {data.total} correct
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`bg-${colorClass}-600 h-2 rounded-full transition-all`}
                        style={{ width: `${data.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
              <span className="mr-2">💪</span> Strong Areas
            </h3>
            {progressData.strongAreas.length > 0 ? (
              <div className="space-y-2">
                {progressData.strongAreas.map((area, index) => (
                  <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-600 mr-3 text-xl">✓</span>
                    <span className="font-medium text-green-900">{area}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-4">Complete more tests to identify strong areas (need ≥75% accuracy on 5+ questions)</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center">
              <span className="mr-2">📚</span> Areas for Improvement
            </h3>
            {progressData.weakAreas.length > 0 ? (
              <div className="space-y-2">
                {progressData.weakAreas.map((area, index) => (
                  <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-red-600 mr-3 text-xl">!</span>
                    <span className="font-medium text-red-900">{area}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-4">Great work! No weak areas identified yet (&lt;60% accuracy on 5+ questions)</p>
            )}
          </div>
        </div>

        {/* Category Performance */}
        {progressData.categoryPerformance.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Category Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressData.categoryPerformance.map((category) => (
                <div key={category.category} className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-900">{category.category}</div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      category.moduleType === 'math' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {category.moduleType === 'math' ? 'Math' : 'R&W'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{
                    color: category.percentage >= 75 ? '#10b981' : category.percentage >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {category.percentage}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {category.correctAnswers}/{category.totalQuestions} correct • {category.averageTime}s avg
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: category.percentage >= 75 ? '#10b981' : category.percentage >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test History */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📅 Test History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Module</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Score %</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">SAT Score</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Questions</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {progressData.testHistory.map((test) => (
                  <tr key={test.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm">
                      {new Date(test.completedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-2 text-sm">{test.moduleFocus}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`font-semibold ${
                        test.score >= 75 ? 'text-green-600' : 
                        test.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {test.score}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="font-semibold text-gray-900">{test.satTotalScore}</div>
                      <div className="text-xs text-gray-500">
                        R:{test.satReadingScore} M:{test.satMathScore}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-sm">
                      {test.correctAnswers}/{test.totalQuestions}
                    </td>
                    <td className="py-3 px-2 text-center text-sm">
                      {formatTime(test.totalTimeSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={() => router.push('/practice-test')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl hover:shadow-lg transition-all font-semibold text-lg"
          >
            Take Another Practice Test →
          </button>
        </div>
      </div>
    </div>
  )
}
