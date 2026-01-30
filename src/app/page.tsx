"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isAdmin = session?.user?.email === 'lionvihaan@gmail.com' || session?.user?.email === 'kingjacobisthegoat@gmail.com'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Welcome to DuckSAT</h2>
          <p className="text-xl text-gray-600 mb-8">Your comprehensive SAT preparation platform</p>

          {session ? (
            <div className="space-y-6">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => router.push('/practice-test')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg"
                >
                  Start Practice Test
                </button>
                <button
                  onClick={() => router.push('/progress')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
                >
                  View Progress
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-lg text-gray-700">Sign in to access personalized SAT prep tools</p>
              <button
                onClick={() => signIn("google")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold mb-2">Adaptive Testing</h3>
            <p className="text-gray-600">Module 2 adjusts based on Module 1 performance</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold mb-2">Real-time Feedback</h3>
            <p className="text-gray-600">Instant explanations and insights</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="text-lg font-bold mb-2">Progress Tracking</h3>
            <p className="text-gray-600">Detailed analytics and recommendations</p>
          </div>
        </div>
      </main>
    </div>
  )
}