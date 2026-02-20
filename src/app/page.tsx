"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Target, Zap, TrendingUp, ArrowRight, BookOpen, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold text-indigo-700">
              Adaptive SAT Practice Platform
            </span>
          </div>

          {/* Hero Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Master the SAT with{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Confidence
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            Experience adaptive testing that adjusts to your skill level. Get real-time feedback and 
            track your progress with detailed analytics.
          </p>

          {/* Hero CTAs */}
          {session ? (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                onClick={() => router.push('/practice-tests')}
                variant="primary"
                size="lg"
                className="group min-h-[56px]"
              >
                <BookOpen className="mr-2 w-5 h-5" />
                Practice Tests
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                onClick={() => router.push('/practice-test')}
                variant="outline"
                size="lg"
                className="min-h-[56px]"
              >
                Random Test
              </Button>
              <Button
                onClick={() => router.push('/progress')}
                variant="outline"
                size="lg"
                className="min-h-[56px]"
              >
                <BarChart3 className="mr-2 w-5 h-5" />
                View Progress
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <Button
                onClick={() => signIn("google")}
                variant="primary"
                size="lg"
                className="group min-h-[56px] px-10"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-sm text-gray-500">
                No credit card required • Start practicing in 30 seconds
              </p>
            </div>
          )}

          {/* Social Proof (Optional) */}
          {!session && (
            <div className="mt-12 flex justify-center items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-400 border-2 border-white"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-red-400 border-2 border-white"></div>
                </div>
                <span className="font-semibold">1,000+ students practicing</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Ace the SAT
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform combines adaptive testing, real-time feedback, and detailed analytics 
            to help you achieve your target score.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-indigo-200">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Fixed Practice Tests
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Take full-length SAT practice tests with the same questions every time. Track your improvement across multiple attempts.
            </p>
            <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:gap-2 transition-all">
              Learn more
              <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature Card 2 */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-cyan-200">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Target className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Adaptive Testing
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Module 2 difficulty adjusts based on your Module 1 performance, just like the real SAT Digital test.
            </p>
            <div className="flex items-center text-cyan-600 font-semibold text-sm group-hover:gap-2 transition-all">
              Learn more
              <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Feature Card 3 */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-200">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Progress Tracking
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Monitor your improvement with detailed analytics, performance trends, and personalized recommendations.
            </p>
            <div className="flex items-center text-green-600 font-semibold text-sm group-hover:gap-2 transition-all">
              Learn more
              <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
            </p>
            <div className="flex items-center text-green-600 font-semibold text-sm group-hover:gap-2 transition-all">
              Learn more
              <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
              <div>
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-90" />
                <div className="text-4xl font-bold mb-2">2,500+</div>
                <div className="text-indigo-200 font-medium">Practice Questions</div>
              </div>
              <div>
                <Target className="w-10 h-10 mx-auto mb-3 opacity-90" />
                <div className="text-4xl font-bold mb-2">98%</div>
                <div className="text-indigo-200 font-medium">Accuracy Rate</div>
              </div>
              <div>
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-90" />
                <div className="text-4xl font-bold mb-2">150+</div>
                <div className="text-indigo-200 font-medium">Average Score Improvement</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}