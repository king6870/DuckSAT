"use client"

import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 Admin Dashboard</h1>
            <p className="text-xl text-gray-600">Manage questions and test modules</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Module Testing */}
            <Link href="/admin/test" className="group">
              <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Test Modules</h3>
                <p className="text-gray-600">Start any module directly for testing</p>
              </div>
            </Link>

            {/* Question Management */}
            <Link href="/admin/questions" className="group">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Questions</h3>
                <p className="text-gray-600">View and edit existing questions</p>
              </div>
            </Link>

            {/* AI Question Generation */}
            <Link href="/admin/question-generation" className="group">
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Question Generation</h3>
                <p className="text-gray-600">Generate questions with AI (single or batch mode)</p>
              </div>
            </Link>

            {/* Question Validation */}
            <Link href="/admin/validate-questions" className="group">
              <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Validate Questions</h3>
                <p className="text-gray-600">Review and approve questions</p>
              </div>
            </Link>

            {/* Back to Main */}
            <Link href="/" className="group">
              <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border-2 border-gray-200 hover:border-gray-400 transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Main Site</h3>
                <p className="text-gray-600">Return to main application</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
