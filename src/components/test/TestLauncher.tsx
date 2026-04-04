"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Target, Zap, Clock3 } from 'lucide-react'

interface TestLauncherProps {
  onStartTest: () => void
  isLoading?: boolean
}

export default function TestLauncher({ onStartTest, isLoading }: TestLauncherProps) {
  const router = useRouter()
  const [clicked, setClicked] = useState(false)
  const busy = isLoading || clicked

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 max-w-3xl w-full border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Practice Center
          </h1>
          <p className="text-gray-600 text-lg">
            Choose a full SAT simulation or focused topic drills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-blue-700" />
              <h3 className="font-bold text-blue-900">Full Practice Test</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">4 timed modules, 98 questions, full SAT-style scoring.</p>
            <button
              onClick={() => {
                if (busy) return
                setClicked(true)
                onStartTest()
              }}
              disabled={busy}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? 'Loading Test...' : 'Start Full Test'}
            </button>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-purple-700" />
              <h3 className="font-bold text-purple-900">Topic Practice Drills</h3>
            </div>
            <p className="text-sm text-purple-700 mb-4">Pick a topic and drill length with instant explanations.</p>
            <button
              onClick={() => router.push('/practice')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Open Topic Drills
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6">
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <Clock3 className="w-4 h-4" /> Before you begin
            </p>
            <ul className="space-y-1.5">
              <li>• Full test: 4 modules, about 2h 14m, SAT 400–1600 scoring</li>
              <li>• Topic drills: 1, 3, 5, 10, 20, or 30 question focused sessions</li>
              <li>• You can review answers and explanations immediately in drills</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1"><Zap className="w-4 h-4" /> Adaptive practice</span>
          <span>•</span>
          <span>Progress tracked automatically</span>
        </div>
      </div>
    </div>
  )
}
