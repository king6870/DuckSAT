"use client"

import { useState } from 'react'
import { MODULE_CONFIGS, getTotalTestTime, getTotalQuestions } from '@/data/moduleConfigs'

interface TestLauncherProps {
  onStartTest: () => void
}

export default function TestLauncher({ onStartTest }: TestLauncherProps) {
  const [isStarting, setIsStarting] = useState(false)
  
  const totalTime = getTotalTestTime()
  const totalQuestions = getTotalQuestions()

  const handleStartTest = () => {
    setIsStarting(true)
    setTimeout(() => {
      onStartTest()
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative mb-8">
            <h1 className="text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              SAT Practice Test
            </h1>
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl"></div>
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-3xl mx-auto">
            Complete adaptive SAT practice test with real-time feedback and detailed performance analysis
          </p>
          
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {totalTime} min
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {totalQuestions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
                4
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Modules</div>
            </div>
          </div>
        </div>

        {/* Test Structure */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Test Structure
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MODULE_CONFIGS.map((module, index) => (
              <div
                key={module.id}
                className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${module.color} rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{module.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {module.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          ⏱️ {module.duration} minutes
                        </span>
                        <span className="flex items-center">
                          📝 {module.questionCount} questions
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {module.description}
                  </p>
                  
                  {/* Module indicator */}
                  <div className="absolute top-4 right-4">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${module.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {index + 1}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl mb-12 border border-white/20 dark:border-gray-700/50">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="text-3xl mr-3">📋</span>
            Test Instructions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Before You Begin:</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Find a quiet environment free from distractions
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Ensure you have a stable internet connection
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Have scratch paper and pencils ready
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Allow approximately 2.5 hours for the full test
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">During the Test:</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Each module is timed separately
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  You can navigate between questions within a module
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Module 2 difficulty adapts based on Module 1 performance
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Review your answers before submitting each module
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          {isStarting ? (
            <div className="inline-flex items-center space-x-4">
              <div className="flex space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                Preparing your test...
              </span>
            </div>
          ) : (
            <button
              onClick={handleStartTest}
              className="group relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-6 px-12 rounded-3xl text-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-purple-500/25"
            >
              <span className="relative z-10 flex items-center">
                🚀 Start Practice Test
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
            </button>
          )}
          
          <p className="mt-6 text-gray-500 dark:text-gray-400">
            Your progress will be automatically saved throughout the test
          </p>
        </div>
      </div>
    </div>
  )
}
