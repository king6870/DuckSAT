"use client"

import { useState } from 'react'

interface TestLauncherProps {
  onStartTest: () => void
  isLoading?: boolean
}

export default function TestLauncher({ onStartTest, isLoading }: TestLauncherProps) {
  const [clicked, setClicked] = useState(false)
  const busy = isLoading || clicked

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 max-w-2xl w-full border border-white/20 relative">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            SAT Practice Test
          </h1>
          <p className="text-gray-600 text-lg">
            Complete digital SAT practice test with real-time scoring
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">📚 Reading & Writing</h3>
            <p className="text-sm text-blue-700">2 modules • 27 questions each • 32 minutes per module</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
            <h3 className="font-bold text-purple-900 mb-2">🔢 Math</h3>
            <p className="text-sm text-purple-700">2 modules • 22 questions each • 35 minutes per module</p>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-8">
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-2">⏱️ Before you begin:</p>
            <ul className="space-y-1.5">
              <li>• <strong>4 modules, 98 questions, ~2 hours 14 minutes</strong></li>
              <li>• Each module is individually timed — you <strong>cannot pause</strong></li>
              <li>• Navigate between questions freely & review before submitting</li>
              <li>• 10-minute break between Reading & Math sections</li>
              <li>• Leaving early will <strong>permanently delete all progress</strong></li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => {
            if (busy) return
            setClicked(true)
            onStartTest()
          }}
          disabled={busy}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Loading Test…
            </span>
          ) : (
            'Start Practice Test →'
          )}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Score reported on the SAT scale: 400–1600
        </p>
      </div>
    </div>
  )
}
