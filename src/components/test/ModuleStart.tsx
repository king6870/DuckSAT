'use client'

interface ModuleStartProps {
  module: {
    id: number
    type: 'reading-writing' | 'math'
    duration: number // minutes
    questionCount: number
    title: string
    description: string
  }
  onStartModule: () => void
}

export default function ModuleStart({ module, onStartModule }: ModuleStartProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-12 border-2 border-gray-100">
          {/* Module Badge */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
              Module {module.type === 'reading-writing' ? '1' : '2'} of 2
            </div>
          </div>

          {/* Module Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              {module.title}
            </h1>
            {module.description && (
              <p className="text-lg text-gray-600">{module.description}</p>
            )}
          </div>

          {/* Module Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center border-2 border-blue-200">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-2xl font-bold text-blue-600">{module.questionCount}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center border-2 border-purple-200">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-2xl font-bold text-purple-600">{module.duration} min</div>
              <div className="text-sm text-gray-600">Time Limit</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border-2 border-amber-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Before You Begin
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>You can navigate between questions using the buttons at the top</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Your timer will start when you click &quot;Begin Module&quot;</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 mt-1">•</span>
                <span>You can review all your answers before submitting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Make sure you&apos;re in a quiet space with no distractions</span>
              </li>
            </ul>
          </div>

          {/* Start Button */}
          <button
            onClick={onStartModule}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Begin Module
          </button>
        </div>
      </div>
    </div>
  )
}
