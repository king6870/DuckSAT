"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTestState } from '@/hooks/useTestState'
import { MODULE_CONFIGS } from '@/data/moduleConfigs'
import MathRenderer from '@/components/MathRenderer'
import ChartRenderer from '@/components/ChartRenderer'

export default function AdminTest() {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  
  const {
    currentModule,
    currentQuestion,
    selectedAnswer: currentSelectedAnswer,
    testResults,
    isTransitioning,
    isComplete,
    hasStarted,
    startTest,
    startModule,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    testState,
  } = useTestState(session?.user?.email || 'admin')

  useEffect(() => {
    if (!session) {
      router.push('/')
    }
  }, [session, router])

  // Admin module selector
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 Admin Test Interface</h1>
              <p className="text-xl text-gray-600">Select any module to start testing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {MODULE_CONFIGS.map((module) => (
                <div
                  key={module.id}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedModuleId === module.id
                      ? 'border-purple-500 bg-purple-50 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                  }`}
                  onClick={() => setSelectedModuleId(module.id)}
                >
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-3">{module.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{module.title}</h3>
                      <p className="text-sm text-gray-600">{module.type}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">{module.description}</p>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>⏱️ {module.duration} minutes</span>
                    <span>📝 {module.questionCount} questions</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  startModule()
                }}
                disabled={selectedModuleId === null}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Selected Module
              </button>
              
              <button
                onClick={startTest}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
              >
                Start Full Test
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Module start screen
  if (currentModule && hasStarted && testState && !testState.moduleStarted && !isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
          <div className="text-6xl mb-6">{currentModule.icon}</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{currentModule.title}</h1>
          <p className="text-xl text-gray-600 mb-8">{currentModule.description}</p>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-blue-600">{currentModule.duration}</div>
              <div className="text-blue-800">Minutes</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-purple-600">{currentModule.questionCount}</div>
              <div className="text-purple-800">Questions</div>
            </div>
          </div>

          <button
            onClick={startModule}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
          >
            Begin Module
          </button>
        </div>
      </div>
    )
  }

  // Test complete screen
  if (isComplete && testResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Module Complete!</h1>
          <p className="text-xl text-gray-600 mb-8">
            Score: {testResults.score}% ({testResults.correctAnswers}/{testResults.totalQuestions})
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
            >
              Test Another Module
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all"
            >
              Back to Admin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main test interface (same as regular practice test)
  if (currentModule && currentQuestion && hasStarted && testState && testState.moduleStarted && !isTransitioning && !isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🔧 Admin: {currentModule.title}
                </h1>
                <p className="text-gray-600">
                  Question {(testState?.currentQuestionIndex ?? 0) + 1} of {currentModule.questionCount}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.floor((testState?.timeRemaining ?? 0) / 60)}:{((testState?.timeRemaining ?? 0) % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-500">Time Remaining</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${testState?.progress ?? 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="mb-8">
              {/* Passage */}
              {currentQuestion.passage && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold mr-3">
                      📖 Reading Passage
                    </span>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <div className="text-gray-800 leading-relaxed font-medium bg-white p-4 rounded-lg border border-blue-100">
                      <MathRenderer>{currentQuestion.passage}</MathRenderer>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              {currentQuestion.chartData && (
                <div className="mb-6">
                  <ChartRenderer chartData={currentQuestion.chartData} />
                </div>
              )}

              {/* Chart */}
              {currentQuestion.chartData && (
                <div className="mb-6">
                  <ChartRenderer chartData={currentQuestion.chartData} />
                </div>
              )}

              <h3 className="text-xl font-semibold mb-6 text-gray-900">
                <MathRenderer>{currentQuestion.question}</MathRenderer>
              </h3>
              
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentSelectedAnswer === index
                  return (
                    <button
                      key={index}
                      onClick={() => selectAnswer(index)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
                        isSelected
                          ? 'border-purple-500 bg-purple-100 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`font-semibold mr-3 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-600 group-hover:bg-purple-200 group-hover:text-purple-700'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className={`${isSelected ? 'text-purple-900 font-medium' : 'text-gray-700'}`}>
                          <MathRenderer>{option}</MathRenderer>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={previousQuestion}
                disabled={(testState?.currentQuestionIndex ?? 0) === 0}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl disabled:opacity-50 hover:bg-gray-300 transition-colors font-medium"
              >
                ← Previous
              </button>
              
              <div className="text-sm text-gray-500 text-center">
                <div>{(testState?.currentQuestionIndex ?? 0) + 1} / {currentModule.questionCount}</div>
              </div>
              
              {(testState?.currentQuestionIndex ?? 0) === currentModule.questionCount - 1 ? (
                <button
                  onClick={() => {
                    // Submit module functionality to be implemented
                    nextQuestion()
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:shadow-lg transition-all font-medium"
                >
                  Submit Module ✓
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:shadow-lg transition-all font-medium"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
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
