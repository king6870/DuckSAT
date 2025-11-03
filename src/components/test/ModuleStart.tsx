"use client"

import { useState } from 'react'
import { ModuleConfig } from '@/types/test'

interface ModuleStartProps {
  module: ModuleConfig
  onStartModule: () => void
}

export default function ModuleStart({ module, onStartModule }: ModuleStartProps) {
  const [isStarting, setIsStarting] = useState(false)

  const handleStart = () => {
    setIsStarting(true)
    setTimeout(() => {
      onStartModule()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        {/* Module Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-12 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 mb-8">
          <div className="relative mb-8">
            <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-r ${module.color} flex items-center justify-center text-4xl mb-6 shadow-lg`}>
              {module.icon}
            </div>
            <div className={`absolute inset-0 bg-gradient-to-r ${module.color} rounded-full blur-2xl opacity-20 animate-pulse`}></div>
          </div>

          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            {module.title}
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            {module.description}
          </p>

          {/* Module Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {module.duration}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Minutes</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {module.questionCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-600/50 p-6 rounded-2xl mb-8 border border-blue-200/50 dark:border-gray-600/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-center">
              <span className="text-2xl mr-2">💡</span>
              Module Instructions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                <span>You can navigate between questions freely</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                <span>Mark questions for review if unsure</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                <span>Timer will start when you begin</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                <span>Review all answers before submitting</span>
              </div>
            </div>
          </div>

          {/* Start Button */}
          {isStarting ? (
            <div className="inline-flex items-center space-x-4">
              <div className="flex space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                Starting module...
              </span>
            </div>
          ) : (
            <button
              onClick={handleStart}
              className={`group relative bg-gradient-to-r ${module.color} hover:shadow-2xl text-white font-bold py-6 px-12 rounded-3xl text-2xl transition-all duration-300 transform hover:scale-105 shadow-lg`}
            >
              <span className="relative z-10 flex items-center justify-center">
                <span className="text-3xl mr-3">🚀</span>
                Begin Module
              </span>
              <div className={`absolute inset-0 bg-gradient-to-r ${module.color} rounded-3xl blur opacity-50 group-hover:opacity-75 transition-opacity`}></div>
            </button>
          )}

          <p className="mt-6 text-gray-500 dark:text-gray-400">
            Once you start, the timer will begin counting down
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center space-x-4">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  step === module.id
                    ? `bg-gradient-to-r ${module.color} shadow-lg`
                    : step < module.id
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Module {module.id} of 4
          </span>
        </div>
      </div>
    </div>
  )
}
