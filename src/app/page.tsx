"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <header className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-xl border-b border-white/20 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="relative">
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  DuckSAT
                </h1>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg blur opacity-20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="relative text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 font-medium transition-all duration-300 hover:scale-105">
                  Home
                </Link>
                {session && (
                  <>
                    <Link href="/practice-test" className="relative text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 font-medium transition-all duration-300 hover:scale-105">
                      Practice Test
                    </Link>
                    <Link href="/progress" className="relative text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 font-medium transition-all duration-300 hover:scale-105">
                      Progress
                    </Link>
                    {/* Admin Links */}
                    {(session.user?.email === 'lionvihaan@gmail.com' || session.user?.email === 'kingjacobisthegoat@gmail.com') && (
                      <>
                        <Link href="/admin/questions" className="relative text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 font-medium transition-all duration-300 hover:scale-105">
                          Admin: Questions
                        </Link>
                        <Link href="/question-review" className="relative text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium transition-all duration-300 hover:scale-105">
                          Question Review
                        </Link>
                        <Link href="/demo-interactive-math" className="relative text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-all duration-300 hover:scale-105">
                          Demo: Interactive
                        </Link>
                      </>
                    )}
                  </>
                )}
                <button className="relative text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 font-medium transition-all duration-300 hover:scale-105">
                  About
                </button>
              </nav>

              {status === "loading" ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce delay-200"></div>
                </div>
              ) : session ? (
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Welcome, {session.user?.name}
                    </span>
                    <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"></div>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="relative bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-red-500/25"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn("google")}
                  className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-purple-500/25"
                >
                  <span className="relative z-10">Sign In with Google</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl blur opacity-50 animate-pulse"></div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="relative mb-8">
            <h2 className="text-7xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 animate-pulse">
              Welcome to DuckSAT
            </h2>
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl"></div>
          </div>
          
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto font-medium leading-relaxed">
            Your comprehensive platform for SAT preparation and academic excellence.
            <span className="block mt-2 text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
              Adaptive testing • Real-time feedback • Personalized insights
            </span>
          </p>

          {session ? (
            <div className="space-y-8">
              <div className="relative">
                <p className="text-2xl text-gray-700 dark:text-gray-300 font-medium">
                  Hello <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">{session.user?.name}</span>! 
                  <br />Ready to start your SAT preparation journey?
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-2xl mx-auto">
                <button 
                  onClick={() => router.push('/practice-test')}
                  className="group relative bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-green-500/25"
                >
                  <span className="relative z-10 text-lg">🚀 Start Practice Test</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                </button>
                
                <button 
                  onClick={() => router.push('/progress')}
                  className="group relative bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-blue-500/25"
                >
                  <span className="relative z-10 text-lg">📊 View Progress</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-xl text-gray-700 dark:text-gray-300 font-medium max-w-3xl mx-auto">
                Sign in to access personalized SAT preparation tools and track your progress.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-2xl mx-auto">
                <button
                  onClick={() => signIn("google")}
                  className="group relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-purple-500/25"
                >
                  <span className="relative z-10 text-lg">✨ Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                </button>
                
                <button className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                  <span className="relative z-10 text-lg">📚 Learn More</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Adaptive Testing</h3>
            <p className="text-gray-600 dark:text-gray-300">Module 2 difficulty adjusts based on your Module 1 performance</p>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          
          <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-time Feedback</h3>
            <p className="text-gray-600 dark:text-gray-300">Instant explanations and performance insights</p>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          
          <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Progress Tracking</h3>
            <p className="text-gray-600 dark:text-gray-300">Detailed analytics and personalized recommendations</p>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
      </main>
    </div>
  );
}