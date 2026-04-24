"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, BookOpen, Calculator, Brain, PenLine, BarChart3, Sigma, Triangle, Shuffle, Target, Timer, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/tracking"

interface CategoryCard {
  slug: string
  label: string
  section: "reading-writing" | "math"
  icon: React.ReactNode
  color: string
  borderColor: string
  bgColor: string
}

interface CategoryPerformance {
  category: string
  totalQuestions: number
  correctAnswers: number
  percentage: number
  moduleType: string
}

const CATEGORIES: CategoryCard[] = [
  // Reading & Writing
  { slug: "reading-comprehension", label: "Reading Comprehension", section: "reading-writing", icon: <BookOpen className="w-7 h-7" />, color: "text-purple-600", borderColor: "hover:border-purple-300", bgColor: "from-purple-500 to-violet-600" },
  { slug: "grammar", label: "Grammar & Usage", section: "reading-writing", icon: <PenLine className="w-7 h-7" />, color: "text-pink-600", borderColor: "hover:border-pink-300", bgColor: "from-pink-500 to-rose-600" },
  { slug: "vocabulary", label: "Vocabulary", section: "reading-writing", icon: <Brain className="w-7 h-7" />, color: "text-fuchsia-600", borderColor: "hover:border-fuchsia-300", bgColor: "from-fuchsia-500 to-purple-600" },
  { slug: "writing-language", label: "Writing & Rhetoric", section: "reading-writing", icon: <PenLine className="w-7 h-7" />, color: "text-violet-600", borderColor: "hover:border-violet-300", bgColor: "from-violet-500 to-indigo-600" },
  // Math
  { slug: "algebra", label: "Algebra", section: "math", icon: <Calculator className="w-7 h-7" />, color: "text-blue-600", borderColor: "hover:border-blue-300", bgColor: "from-blue-500 to-cyan-600" },
  { slug: "advanced-math", label: "Advanced Math", section: "math", icon: <Sigma className="w-7 h-7" />, color: "text-indigo-600", borderColor: "hover:border-indigo-300", bgColor: "from-indigo-500 to-blue-600" },
  { slug: "geometry", label: "Geometry & Trig", section: "math", icon: <Triangle className="w-7 h-7" />, color: "text-cyan-600", borderColor: "hover:border-cyan-300", bgColor: "from-cyan-500 to-teal-600" },
  { slug: "problem-solving-data-analysis", label: "Problem Solving & Data", section: "math", icon: <BarChart3 className="w-7 h-7" />, color: "text-teal-600", borderColor: "hover:border-teal-300", bgColor: "from-teal-500 to-emerald-600" },
]

export default function PracticePage() {
  const { status } = useSession()
  const router = useRouter()
  const [categoryStats, setCategoryStats] = useState<CategoryPerformance[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [drillCount, setDrillCount] = useState<number>(10)

  const DRILL_LENGTHS = [1, 3, 5, 10, 20, 30] as const

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return

    const loadData = async () => {
      setLoading(true)
      try {
        // Fetch progress data for category performance
        const progressRes = await fetch("/api/progress")
        if (progressRes.ok) {
          const data = await progressRes.json()
          if (data.data?.categoryPerformance) {
            setCategoryStats(data.data.categoryPerformance)
          }
        }

        // Fetch question counts per category
        const countsRes = await fetch("/api/questions/category-counts")
        if (countsRes.ok) {
          const data = await countsRes.json()
          setQuestionCounts(data.counts || {})
        }
      } catch {
        // Silently handle errors — stats just won't show
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [status])

  const getCategoryPerf = (slug: string) => {
    return categoryStats.find(c => c.category === slug)
  }

  const getProficiencyColor = (percentage: number | undefined) => {
    if (percentage === undefined) return "bg-gray-200"
    if (percentage >= 75) return "bg-green-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const rwCategories = CATEGORIES.filter(c => c.section === "reading-writing")
  const mathCategories = CATEGORIES.filter(c => c.section === "math")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Topic Practice
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            Choose a topic and drill length with instant feedback on every question
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8 rounded-2xl border border-indigo-100 bg-white/80 p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-gray-700">Drill Length</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {DRILL_LENGTHS.map((count) => (
              <button
                key={count}
                onClick={() => setDrillCount(count)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  drillCount === count
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={drillCount === count}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            {/* Quick Practice Modes */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Quick Practice</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    trackEvent('navigation', 'quick_practice_mixed', { drillLength: drillCount })
                    router.push(`/practice/mixed?count=${drillCount}`)
                  }}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow border-2 border-transparent hover:border-amber-300 transition-all text-left hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white">
                    <Shuffle className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Mixed Quiz</h3>
                  <p className="text-sm text-gray-500">{drillCount} random questions from all topics</p>
                </button>

                <button
                  onClick={() => {
                    const weakest = categoryStats
                      .filter(c => c.totalQuestions >= 3)
                      .sort((a, b) => a.percentage - b.percentage)[0]
                    if (weakest) {
                      trackEvent('navigation', 'quick_practice_weak_areas', { category: weakest.category, drillLength: drillCount })
                      router.push(`/practice/${weakest.category}?count=${drillCount}`)
                    } else {
                      trackEvent('navigation', 'quick_practice_weak_areas_fallback')
                      router.push(`/practice/mixed?count=${drillCount}`)
                    }
                  }}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow border-2 border-transparent hover:border-red-300 transition-all text-left hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white">
                    <Target className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Weak Areas</h3>
                  <p className="text-sm text-gray-500">
                    {categoryStats.filter(c => c.totalQuestions >= 3).sort((a, b) => a.percentage - b.percentage)[0]
                      ? `Focus on ${CATEGORIES.find(c => c.slug === categoryStats.filter(c => c.totalQuestions >= 3).sort((a, b) => a.percentage - b.percentage)[0]?.category)?.label || 'your weakest topic'}`
                      : 'Practice first to unlock'}
                  </p>
                </button>

                <button
                  onClick={() => { trackEvent('navigation', 'quick_practice_full_test'); router.push('/practice-tests') }}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow border-2 border-transparent hover:border-emerald-300 transition-all text-left hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white">
                    <Timer className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Full Practice Test</h3>
                  <p className="text-sm text-gray-500">98 questions — timed SAT simulation</p>
                </button>
              </div>
            </div>

            {/* Reading & Writing */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Reading & Writing</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rwCategories.map(cat => {
                  const perf = getCategoryPerf(cat.slug)
                  const count = Math.max(questionCounts[cat.slug] || 0, 100)
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => router.push(`/practice/${cat.slug}?count=${drillCount}`)}
                      className={`group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow border-2 border-transparent ${cat.borderColor} transition-all text-left hover:shadow-lg`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white`}>
                        {cat.icon}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{cat.label}</h3>
                      <p className="text-sm text-gray-500 mb-3">{count} questions available</p>
                      {perf ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProficiencyColor(perf.percentage)}`}
                              style={{ width: `${perf.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{perf.percentage}%</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Not practiced yet</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Math */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Math</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mathCategories.map(cat => {
                  const perf = getCategoryPerf(cat.slug)
                  const count = Math.max(questionCounts[cat.slug] || 0, 100)
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => router.push(`/practice/${cat.slug}?count=${drillCount}`)}
                      className={`group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow border-2 border-transparent ${cat.borderColor} transition-all text-left hover:shadow-lg`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white`}>
                        {cat.icon}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{cat.label}</h3>
                      <p className="text-sm text-gray-500 mb-3">{count} questions available</p>
                      {perf ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProficiencyColor(perf.percentage)}`}
                              style={{ width: `${perf.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{perf.percentage}%</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Not practiced yet</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
