"use client"

import { useState } from 'react'

interface TestLauncherProps {
  onStartTest: () => void
}

export default function TestLauncher({ onStartTest }: TestLauncherProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)

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

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏱️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-bold mb-1">Test Guidelines:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Each module is timed - manage your time wisely</li>
                <li>You can navigate between questions freely</li>
                <li>Review your answers before submitting</li>
                <li>Take a 10-minute break between sections</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowConfirmation(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all transform hover:scale-105"
        >
          Start Practice Test →
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Score reported on the SAT scale: 400–1600
        </p>

        {/* ── Confirmation Overlay ── */}
        {showConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmation(false)}>
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 border-2 border-blue-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🔒</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ready to begin?
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  You are about to start a <span className="font-semibold">timed SAT practice test</span>. Please read the following before proceeding:
                </p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
                <ul className="space-y-2 text-sm text-amber-900">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">⏱️</span>
                    <span><strong>4 modules, 98 questions, ~2 hours 14 minutes</strong> — each module is individually timed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🚫</span>
                    <span>You <strong>cannot pause</strong> once a module begins.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🔒</span>
                    <span>You will be <strong>locked into the test</strong> — no casual browsing away.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🗑️</span>
                    <span>Leaving early will <strong>permanently delete all progress</strong>.</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false)
                    onStartTest()
                  }}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  autoFocus
                >
                  I&apos;m Ready — Begin Test
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="w-full py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
