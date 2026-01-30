"use client"

interface TestLauncherProps {
  onStartTest: () => void
}

export default function TestLauncher({ onStartTest }: TestLauncherProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 max-w-2xl w-full border border-white/20">
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
          onClick={onStartTest}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all transform hover:scale-105"
        >
          Start Practice Test →
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Total time: ~2 hours 14 minutes
        </p>
      </div>
    </div>
  )
}
