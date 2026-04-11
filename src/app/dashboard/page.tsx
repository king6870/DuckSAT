"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  GraduationCap, Target, BarChart3, TrendingUp, TrendingDown,
  Clock, Award, BookOpen, Calculator, Zap, ChevronRight
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Overview {
  testsCompleted: number
  averageScore: number
  bestScore: number
  totalStudyTime: number
  averageSATScore: number
  bestSATScore: number
  latestSATScore: number
  improvementRate: number
}

interface ModulePerf {
  averageScore: number
  averageSATScore: number
  totalQuestions: number
  correctAnswers: number
}

interface ProgressData {
  overview: Overview
  modulePerformance: { readingWriting: ModulePerf; math: ModulePerf }
  weakAreas: string[]
  strongAreas: string[]
  drillOverview: {
    drillsCompleted: number
    averageAccuracy: number
    questionsAnswered: number
  }
  testHistory: Array<{
    id: string
    completedAt: string
    score: number
    satTotalScore: number
    isDrill?: boolean
    drillCategory?: string | null
    moduleFocus: string
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtScore(n: number) {
  return n > 0 ? String(n) : '—'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ScoreRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className={`p-5 bg-gradient-to-br ${color} rounded-2xl border-2 border-white/60 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-6 h-6 text-white/80" />
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-white">{value}</div>
      <div className="text-sm font-semibold text-white/80 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/60 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

function QuickAction({
  href, icon: Icon, label, desc, accent, iconBg,
}: {
  href: string
  icon: React.ElementType
  label: string
  desc: string
  accent: string
  iconBg: string
}) {
  return (
    <Link href={href} className="group block">
      <div className={`p-5 bg-white rounded-2xl border-2 ${accent} hover:shadow-lg transition-all duration-200 group-hover:scale-[1.02]`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="w-5 h-5 text-indigo-600" />
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
        </div>
        <div className="font-bold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-1">{desc}</div>
      </div>
    </Link>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyDashboard() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🐤</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to DuckSAT!</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Take your first practice test or drill to start seeing your progress here.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/practice-tests"
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all"
        >
          Take a Practice Test
        </Link>
        <Link
          href="/practice"
          className="px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-all"
        >
          Start a Drill
        </Link>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    setLoading(true)
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setProgress(d.data)
        setError(null)
      })
      .catch(() => setError('Failed to load progress'))
      .finally(() => setLoading(false))
  }, [status])

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!session) return null

  const name = session.user?.name?.split(' ')[0] ?? 'Student'
  const o = progress?.overview
  const recentTests = progress?.testHistory.slice(0, 5) ?? []
  const drillOverview = progress?.drillOverview

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">

        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Welcome back, {name}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your SAT prep overview</p>
        </div>

        {!progress || !o ? (
          <EmptyDashboard />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Tests Completed"
                value={o.testsCompleted}
                icon={GraduationCap}
                color="from-indigo-500 to-indigo-700"
              />
              <StatCard
                label="Best SAT Score"
                value={fmtScore(o.bestSATScore)}
                sub={o.latestSATScore ? `Latest: ${o.latestSATScore}` : undefined}
                icon={Award}
                color="from-purple-500 to-purple-700"
              />
              <StatCard
                label="Avg Accuracy"
                value={`${o.averageScore}%`}
                sub={`Best: ${o.bestScore}%`}
                icon={Target}
                color="from-emerald-500 to-emerald-700"
              />
              <StatCard
                label="Study Time"
                value={`${o.totalStudyTime}m`}
                icon={Clock}
                color="from-amber-500 to-orange-500"
              />
            </div>

            {/* Module Performance + Improvement */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* R&W */}
              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-800">Reading & Writing</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <ScoreRing pct={progress.modulePerformance.readingWriting.averageScore} />
                    <span className="absolute text-base font-extrabold text-gray-800">
                      {progress.modulePerformance.readingWriting.averageScore}%
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="text-gray-500">
                      Avg SAT: <span className="font-semibold text-gray-800">
                        {fmtScore(progress.modulePerformance.readingWriting.averageSATScore)}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      Questions: <span className="font-semibold text-gray-800">
                        {progress.modulePerformance.readingWriting.correctAnswers}/{progress.modulePerformance.readingWriting.totalQuestions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Math */}
              <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-800">Math</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <ScoreRing pct={progress.modulePerformance.math.averageScore} />
                    <span className="absolute text-base font-extrabold text-gray-800">
                      {progress.modulePerformance.math.averageScore}%
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="text-gray-500">
                      Avg SAT: <span className="font-semibold text-gray-800">
                        {fmtScore(progress.modulePerformance.math.averageSATScore)}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      Questions: <span className="font-semibold text-gray-800">
                        {progress.modulePerformance.math.correctAnswers}/{progress.modulePerformance.math.totalQuestions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Improvement + Drills */}
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 space-y-4">
                {/* Improvement rate */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {o.improvementRate >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                    <h3 className="font-bold text-gray-800">Improvement</h3>
                  </div>
                  <div className={`text-3xl font-extrabold ${o.improvementRate >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {o.improvementRate >= 0 ? '+' : ''}{o.improvementRate}%
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">vs. your first tests</div>
                </div>

                {/* Drills */}
                {drillOverview && drillOverview.drillsCompleted > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold text-gray-700">Drills</span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      <div>{drillOverview.drillsCompleted} drills completed</div>
                      <div>{drillOverview.questionsAnswered} questions answered</div>
                      <div>{drillOverview.averageAccuracy}% avg accuracy</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Weak / Strong areas */}
            {(progress.weakAreas.length > 0 || progress.strongAreas.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {progress.weakAreas.length > 0 && (
                  <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
                    <h3 className="font-bold text-rose-700 mb-3">📉 Focus Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {progress.weakAreas.slice(0, 5).map((a) => (
                        <span key={a} className="px-3 py-1 bg-white border border-rose-200 text-rose-700 text-xs font-semibold rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {progress.strongAreas.length > 0 && (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                    <h3 className="font-bold text-emerald-700 mb-3">💪 Strong Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {progress.strongAreas.slice(0, 5).map((a) => (
                        <span key={a} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent activity */}
            {recentTests.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Recent Activity
                  </h3>
                  <Link href="/progress" className="text-sm text-indigo-600 hover:underline font-medium">
                    Full history →
                  </Link>
                </div>
                <div className="space-y-2">
                  {recentTests.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                          t.isDrill ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {t.isDrill ? '⚡' : '📝'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            {t.isDrill
                              ? `Drill — ${t.drillCategory ?? t.moduleFocus}`
                              : `Practice Test`}
                          </div>
                          <div className="text-xs text-gray-400">{fmtDate(t.completedAt)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">
                          {t.satTotalScore > 0 ? t.satTotalScore : `${t.score}%`}
                        </div>
                        {t.satTotalScore > 0 && (
                          <div className="text-xs text-gray-400">{t.score}% acc</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick Actions — always visible */}
        <div>
          <h3 className="font-bold text-gray-800 text-lg mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              href="/practice-tests"
              icon={GraduationCap}
              label="Practice Tests"
              desc="Full-length SAT simulations"
              accent="border-indigo-200 hover:border-indigo-400"
              iconBg="bg-indigo-50"
            />
            <QuickAction
              href="/practice"
              icon={Zap}
              label="Drill Mode"
              desc="Target your weak areas"
              accent="border-amber-200 hover:border-amber-400"
              iconBg="bg-amber-50"
            />
            <QuickAction
              href="/progress"
              icon={BarChart3}
              label="Analytics"
              desc="Deep performance insights"
              accent="border-emerald-200 hover:border-emerald-400"
              iconBg="bg-emerald-50"
            />
            <QuickAction
              href="/pricing"
              icon={Award}
              label="Upgrade Plan"
              desc="Unlock unlimited tests"
              accent="border-purple-200 hover:border-purple-400"
              iconBg="bg-purple-50"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}
