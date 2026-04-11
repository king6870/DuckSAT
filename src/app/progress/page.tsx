"use client"

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { BookOpen, Calculator, ArrowLeft, TrendingUp, Award, Clock, ArrowRight, Zap, Target, BarChart3, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProgressData {
  overview: {
    testsCompleted: number
    averageScore: number
    bestScore: number
    totalStudyTime: number
    averageSATScore: number
    bestSATScore: number
    latestSATScore: number
    improvementRate: number
  }
  modulePerformance: {
    readingWriting: {
      averageScore: number
      averageSATScore: number
      totalQuestions: number
      correctAnswers: number
      averageTimePerQuestion: number
    }
    math: {
      averageScore: number
      averageSATScore: number
      totalQuestions: number
      correctAnswers: number
      averageTimePerQuestion: number
    }
  }
  categoryPerformance: Array<{
    category: string
    totalQuestions: number
    correctAnswers: number
    percentage: number
    averageTime: number
    moduleType: string
  }>
  difficultyPerformance: {
    easy: { correct: number; total: number; percentage: number }
    medium: { correct: number; total: number; percentage: number }
    hard: { correct: number; total: number; percentage: number }
  }
  strongAreas: string[]
  weakAreas: string[]
  drillOverview: {
    drillsCompleted: number
    averageAccuracy: number
    questionsAnswered: number
    totalTimeMinutes: number
    byLength: Array<{ length: number; count: number }>
  }
  scoreProgression: Array<{
    testNumber: number
    score: number
    satScore: number
    date: string
  }>
  testHistory: Array<{
    id: string
    completedAt: string
    score: number
    satTotalScore: number
    satReadingScore: number
    satMathScore: number
    totalTimeSpent: number
    totalQuestions: number
    correctAnswers: number
    moduleFocus: string
    isDrill?: boolean
    drillCategory?: string | null
    drillLength?: number | null
  }>
}

// ─── Per-Practice-Test Progress Types ───────────────────────────────────────

interface PracticeTestAttempt {
  attemptNumber: number
  score: number
  satTotalScore: number | null
  satReadingScore: number | null
  satMathScore: number | null
  totalTimeSpent: number
  completedAt: string
}

interface PracticeTestProgress {
  practiceTestId: string
  practiceTestName: string
  totalAttempts: number
  bestScore: number | null
  bestSatScore: number | null
  improvement: number | null
  attempts: PracticeTestAttempt[]
}

// ─── Animation Hooks ────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1200, delay: number = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const timeout = setTimeout(() => {
      const start = performance.now()
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
        setValue(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return value
}

function useAnimatedMount(delay: number = 0) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return mounted
}

// ─── Reusable Components ────────────────────────────────────────────────────

function RingGauge({ percentage, size = 120, strokeWidth = 10, color, delay = 0, children }: {
  percentage: number; size?: number; strokeWidth?: number; color: string; delay?: number; children?: React.ReactNode
}) {
  const [animate, setAnimate] = useState(false)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference * (1 - Math.min(percentage, 100) / 100) : circumference}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

function AnimatedCard({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const mounted = useAnimatedMount(delay)
  return (
    <div
      className={`transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  )
}

function CountUpDisplay({ target, delay = 0 }: { target: number; delay?: number }) {
  const value = useCountUp(target, 1200, delay)
  return <>{value}</>
}

function AnimatedBar({ height, color, delay, horizontal, percentage }: {
  height: number; color: string; delay: number; horizontal?: boolean; percentage?: number
}) {
  const [animate, setAnimate] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (horizontal) {
    return (
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{
          width: animate ? `${Math.max(percentage || 0, 2)}%` : '0%',
          backgroundColor: color,
          height: `${height}px`,
        }}
      />
    )
  }

  return (
    <div
      className="w-full rounded-t-lg transition-all duration-1000 ease-out"
      style={{
        height: animate ? `${height}px` : '0px',
        backgroundColor: color,
      }}
    />
  )
}

function ScoreBracketMessage({ score }: { score: number }) {
  if (score >= 1400) return <p className="text-emerald-600 font-semibold text-lg">Outstanding! You&apos;re in elite territory! 🌟</p>
  if (score >= 1200) return <p className="text-blue-600 font-semibold text-lg">Great job! You&apos;re above average! 🚀</p>
  if (score >= 1000) return <p className="text-amber-600 font-semibold text-lg">Solid progress! Keep pushing! 💪</p>
  return <p className="text-purple-600 font-semibold text-lg">You&apos;re building a strong foundation! 🌱</p>
}

function percentColor(pct: number) {
  if (pct >= 75) return '#10b981'
  if (pct >= 60) return '#f59e0b'
  return '#f43f5e'
}

function percentColorClass(pct: number) {
  if (pct >= 75) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

// ─── Per-Practice-Test Progress View ────────────────────────────────────────

function PracticeTestProgressView({ progress, formatTime, onBack, onRetake }: {
  progress: PracticeTestProgress
  formatTime: (val: number, unit?: 'seconds' | 'minutes') => string
  onBack: () => void
  onRetake: () => void
}) {
  const maxSat = progress.attempts.reduce((m, a) => Math.max(m, a.satTotalScore ?? 0), 0) || 1600

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Sticky header */}
      <div className="p-4 flex justify-between items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <Button onClick={onBack} variant="outline" size="md" className="min-h-[44px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          All Practice Tests
        </Button>
        <h1 className="text-base font-bold text-gray-900 hidden sm:block">{progress.practiceTestName}</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <AnimatedCard delay={0}>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {progress.practiceTestName}
          </h1>
          <p className="text-gray-500 mt-1">Your attempt history and score improvement</p>
        </AnimatedCard>

        {/* Summary KPIs */}
        <AnimatedCard delay={100}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-indigo-500 text-center">
              <div className="text-sm text-gray-500 mb-1">Attempts</div>
              <div className="text-3xl font-extrabold text-indigo-600">{progress.totalAttempts}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-emerald-500 text-center">
              <div className="text-sm text-gray-500 mb-1">Best SAT</div>
              <div className="text-3xl font-extrabold text-emerald-600">{progress.bestSatScore ?? '—'}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-amber-500 text-center">
              <div className="text-sm text-gray-500 mb-1">Best Accuracy</div>
              <div className="text-3xl font-extrabold text-amber-600">
                {progress.bestScore !== null ? `${progress.bestScore}%` : '—'}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-cyan-500 text-center">
              <div className="text-sm text-gray-500 mb-1">Improvement</div>
              <div className={`text-3xl font-extrabold ${(progress.improvement ?? 0) >= 0 ? 'text-cyan-600' : 'text-rose-600'}`}>
                {progress.improvement !== null ? `${progress.improvement > 0 ? '+' : ''}${progress.improvement}%` : '—'}
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Score Progression */}
        {progress.attempts.length > 1 && (
          <AnimatedCard delay={200}>
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">SAT Score Progression</h2>
              </div>
              <div className="flex items-end gap-3 h-40 px-2">
                {progress.attempts.map((attempt, i) => {
                  const satScore = attempt.satTotalScore ?? 0
                  const barHeight = (satScore / maxSat) * 120
                  const color = percentColor(attempt.score)
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 group">
                      <div className="text-xs font-bold mb-1 transition-colors" style={{ color }}>
                        {satScore || '—'}
                      </div>
                      <div className="relative w-full">
                        <AnimatedBar height={barHeight} color={color} delay={300 + i * 80} />
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none z-10">
                          {attempt.score}% · {formatTime(attempt.totalTimeSpent)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">#{attempt.attemptNumber}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Attempt History Table */}
        <AnimatedCard delay={300}>
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-bold text-gray-900">Attempt History</h2>
            </div>
            {progress.attempts.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No completed attempts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attempt</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Accuracy</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SAT Total</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">R&W / Math</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.attempts.map((attempt) => (
                      <tr key={attempt.attemptNumber} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                            {attempt.attemptNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700">
                          {new Date(attempt.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold ${percentColorClass(attempt.score)}`}>{attempt.score}%</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{attempt.satTotalScore ?? '—'}</td>
                        <td className="py-3 px-3 text-center text-sm text-gray-600">
                          {attempt.satReadingScore ?? '—'} / {attempt.satMathScore ?? '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-sm text-gray-600">{formatTime(attempt.totalTimeSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* CTA */}
        <AnimatedCard delay={400}>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center shadow-xl shadow-indigo-500/20">
            <h2 className="text-xl font-bold text-white mb-2">
              {progress.totalAttempts === 0 ? 'Ready for your first attempt?' : 'Keep improving!'}
            </h2>
            <p className="text-indigo-200 mb-6 text-sm">
              {(progress.improvement ?? 0) > 0
                ? `You've already improved by ${progress.improvement}%. Keep going!`
                : 'Each attempt builds familiarity with the format and questions.'}
            </p>
            <Button
              onClick={onRetake}
              variant="outline"
              size="lg"
              className="min-h-[48px] bg-white text-indigo-700 border-white hover:bg-indigo-50 font-bold"
            >
              {progress.totalAttempts === 0 ? 'Start Test' : 'Retake Test'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Floating background dots */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] w-4 h-4 rounded-full bg-indigo-300/40 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute top-40 right-[15%] w-3 h-3 rounded-full bg-purple-300/40 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-[20%] w-5 h-5 rounded-full bg-pink-300/30 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        <div className="absolute top-[60%] right-[25%] w-3 h-3 rounded-full bg-cyan-300/30 animate-ping" style={{ animationDuration: '4.5s', animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-[10%] w-4 h-4 rounded-full bg-emerald-300/30 animate-ping" style={{ animationDuration: '3.2s', animationDelay: '1.5s' }} />
        <div className="absolute top-[30%] left-[40%] w-2 h-2 rounded-full bg-amber-300/40 animate-ping" style={{ animationDuration: '5s', animationDelay: '0.8s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Animated floating icon */}
        <AnimatedCard delay={0}>
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30" style={{ animation: 'float 3s ease-in-out infinite' }}>
              <TrendingUp className="w-14 h-14 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </AnimatedCard>

        {/* Headline */}
        <AnimatedCard delay={200}>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-4">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Your SAT Journey
            </span>
            <br />
            <span className="text-gray-900">Starts Here</span>
          </h1>
        </AnimatedCard>

        <AnimatedCard delay={400}>
          <p className="text-gray-600 text-lg text-center max-w-md mb-10 leading-relaxed">
            Take your first practice test and watch your progress come to life with detailed analytics, personalized insights, and score tracking.
          </p>
        </AnimatedCard>

        {/* Benefit cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-10">
          {[
            { icon: BarChart3, title: 'Track Your Growth', desc: 'See your scores rise over time', color: 'from-blue-500 to-cyan-500', delay: 600 },
            { icon: Target, title: 'Find Your Strengths', desc: 'Know what you\'re great at', color: 'from-emerald-500 to-teal-500', delay: 750 },
            { icon: Zap, title: 'Boost Your Score', desc: 'Focus on what matters most', color: 'from-amber-500 to-orange-500', delay: 900 },
          ].map((card) => (
            <AnimatedCard key={card.title} delay={card.delay}>
              <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-lg border border-white/50 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mx-auto mb-3`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-sm text-gray-500">{card.desc}</p>
              </div>
            </AnimatedCard>
          ))}
        </div>

        {/* CTA button */}
        <AnimatedCard delay={1100}>
          <button
            onClick={onStart}
            className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              Take Your First Practice Test
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </AnimatedCard>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function ProgressContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const practiceTestId = searchParams.get('practiceTestId')

  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Per-practice-test progress state
  const [practiceTestProgress, setPracticeTestProgress] = useState<PracticeTestProgress | null>(null)

  useEffect(() => {
    if (!session) {
      router.push('/')
      return
    }

    const fetchProgressData = async () => {
      try {
        if (practiceTestId) {
          // Fetch per-test analytics (#66)
          const response = await fetch(`/api/practice-tests/${practiceTestId}/progress`)
          if (!response.ok) throw new Error(`Failed to load progress: ${response.statusText}`)
          const result = await response.json()
          if (result.success && result.progress) {
            setPracticeTestProgress(result.progress)
          } else {
            throw new Error(result.error || 'Invalid response from server')
          }
        } else {
          // Fetch general analytics
          const response = await fetch('/api/progress')
          if (!response.ok) throw new Error(`Failed to load progress: ${response.statusText}`)
          const result = await response.json()
          if (result.success && result.data) {
            setProgressData(result.data)
            setHasData(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch progress data:', error)
        setFetchError(error instanceof Error ? error.message : 'Failed to load progress data')
      } finally {
        setLoading(false)
      }
    }

    fetchProgressData()
  }, [session, router, practiceTestId])

  const formatTime = useCallback((value: number, unit: 'seconds' | 'minutes' = 'seconds') => {
    const totalMinutes = unit === 'seconds' ? Math.floor(value / 60) : value
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }, [])

  // ── Loading State ──
  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" />
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    )
  }

  // ── Error State ──
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load progress</h2>
          <p className="text-gray-600 mb-6 text-sm">{fetchError}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/practice-tests')} variant="outline" size="md">
              Back to Tests
            </Button>
            <Button onClick={() => window.location.reload()} size="md">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Per-Practice-Test Progress View (#66) ──
  if (practiceTestId && practiceTestProgress) {
    return (
      <PracticeTestProgressView
        progress={practiceTestProgress}
        formatTime={formatTime}
        onBack={() => router.push('/practice-tests')}
        onRetake={() => router.push(`/practice-test?practiceTestId=${practiceTestId}`)}
      />
    )
  }

  // ── Empty State ──
  if (!hasData || !progressData) {
    return <EmptyState onStart={() => router.push('/practice-test')} />
  }

  const { overview, modulePerformance, categoryPerformance, difficultyPerformance, strongAreas, weakAreas, drillOverview, scoreProgression, testHistory } = progressData
  const satPct = Math.round(((overview.latestSATScore - 400) / 1200) * 100)
  const rwPct = modulePerformance.readingWriting.averageScore
  const mathPct = modulePerformance.math.averageScore
  const maxBar = scoreProgression.length > 0 ? Math.max(...scoreProgression.map(s => s.score), 1) : 100

  // ── Data Dashboard ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Sticky top bar */}
      <div className="p-4 flex justify-between items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <Button onClick={() => router.push('/')} variant="outline" size="md" className="min-h-[44px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
        <div className="text-sm text-gray-600 font-medium">{session?.user?.name || session?.user?.email}</div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ═══ Hero Score Ring ═══ */}
        <AnimatedCard delay={0} className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Your SAT Progress
          </h1>
          <div className="flex flex-col items-center">
            <RingGauge percentage={satPct} size={200} strokeWidth={14} color="#6366f1" delay={300}>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-gray-900">
                  <CountUpDisplay target={overview.latestSATScore} delay={400} />
                </div>
                <div className="text-sm text-gray-500 font-medium">SAT Score</div>
              </div>
            </RingGauge>
            <div className="mt-4">
              <ScoreBracketMessage score={overview.latestSATScore} />
            </div>
          </div>
        </AnimatedCard>

        {/* ═══ Stat Ribbon (4 KPI cards) ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Tests Taken', value: overview.testsCompleted, suffix: '', color: 'border-indigo-500', textColor: 'text-indigo-600', delay: 200 },
            { label: 'Best SAT Score', value: overview.bestSATScore, suffix: '', color: 'border-emerald-500', textColor: 'text-emerald-600', delay: 350 },
            { label: 'Improvement', value: Math.abs(overview.improvementRate), suffix: '%', color: 'border-cyan-500', textColor: overview.improvementRate >= 0 ? 'text-cyan-600' : 'text-rose-600', delay: 500, prefix: overview.improvementRate >= 0 ? '↑ ' : '↓ ' },
            { label: 'Study Time', value: 0, suffix: '', color: 'border-amber-500', textColor: 'text-amber-600', delay: 650, custom: formatTime(overview.totalStudyTime, 'minutes') },
          ].map((stat) => (
            <AnimatedCard key={stat.label} delay={stat.delay}>
              <div className={`bg-white rounded-2xl shadow-md p-5 border-t-4 ${stat.color} hover:shadow-lg transition-shadow`}>
                <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
                <div className={`text-3xl font-extrabold ${stat.textColor}`}>
                  {stat.custom ? stat.custom : (
                    <>
                      {stat.prefix || ''}
                      <CountUpDisplay target={stat.value} delay={stat.delay + 200} />
                      {stat.suffix}
                    </>
                  )}
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>

        {/* ═══ Drill Progress ═══ */}
        <AnimatedCard delay={360} className="mb-10">
          <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Practice Drill Progress</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl bg-indigo-50 p-4">
                <div className="text-xs text-indigo-700">Drills Completed</div>
                <div className="text-2xl font-extrabold text-indigo-700">{drillOverview.drillsCompleted}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="text-xs text-emerald-700">Avg Drill Accuracy</div>
                <div className="text-2xl font-extrabold text-emerald-700">{drillOverview.averageAccuracy}%</div>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-xs text-blue-700">Drill Questions</div>
                <div className="text-2xl font-extrabold text-blue-700">{drillOverview.questionsAnswered}</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <div className="text-xs text-amber-700">Drill Time</div>
                <div className="text-2xl font-extrabold text-amber-700">{formatTime(drillOverview.totalTimeMinutes, 'minutes')}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-gray-700">Drills By Length</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {drillOverview.byLength.map((item) => (
                  <div key={item.length} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                    <div className="text-xs text-gray-500">{item.length}Q</div>
                    <div className="text-sm font-bold text-gray-800">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* ═══ Module Comparison ═══ */}
        <AnimatedCard delay={400} className="mb-10">
          <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Module Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Reading & Writing */}
              <div className="flex flex-col items-center">
                <RingGauge percentage={rwPct} size={150} strokeWidth={12} color="#3b82f6" delay={600}>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-gray-900">
                      <CountUpDisplay target={rwPct} delay={700} />%
                    </div>
                  </div>
                </RingGauge>
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">Reading & Writing</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{modulePerformance.readingWriting.averageSATScore}</div>
                  <div className="text-sm text-gray-500">
                    {modulePerformance.readingWriting.correctAnswers}/{modulePerformance.readingWriting.totalQuestions} correct
                    {modulePerformance.readingWriting.averageTimePerQuestion > 0 && ` · ${modulePerformance.readingWriting.averageTimePerQuestion}s avg`}
                  </div>
                </div>
              </div>

              {/* Math */}
              <div className="flex flex-col items-center">
                <RingGauge percentage={mathPct} size={150} strokeWidth={12} color="#8b5cf6" delay={800}>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-gray-900">
                      <CountUpDisplay target={mathPct} delay={900} />%
                    </div>
                  </div>
                </RingGauge>
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Calculator className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Math</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{modulePerformance.math.averageSATScore}</div>
                  <div className="text-sm text-gray-500">
                    {modulePerformance.math.correctAnswers}/{modulePerformance.math.totalQuestions} correct
                    {modulePerformance.math.averageTimePerQuestion > 0 && ` · ${modulePerformance.math.averageTimePerQuestion}s avg`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* ═══ Score Progression Chart ═══ */}
        {scoreProgression.length > 0 && (
          <AnimatedCard delay={500} className="mb-10">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">Score Progression</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[400px] h-56 flex items-end gap-3 px-2">
                  {scoreProgression.map((test, index) => {
                    const barHeight = (test.score / maxBar) * 180
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div className="text-xs font-bold mb-1" style={{ color: percentColor(test.score) }}>
                          {test.score}%
                        </div>
                        <div className="relative w-full">
                          <AnimatedBar height={barHeight} color={percentColor(test.score)} delay={600 + index * 100} />
                          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2.5 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none z-10">
                            SAT: {test.satScore}<br />
                            {new Date(test.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2 font-medium">#{test.testNumber}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* ═══ Category Mastery Grid ═══ */}
        {categoryPerformance.length > 0 && (
          <AnimatedCard delay={600} className="mb-10">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Category Mastery</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryPerformance.map((cat, i) => (
                  <AnimatedCard key={cat.category} delay={700 + i * 80}>
                    <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all border border-gray-100 hover:border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{cat.category}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cat.moduleType === 'math' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {cat.moduleType === 'math' ? 'Math' : 'R&W'}
                          </span>
                        </div>
                        <RingGauge percentage={cat.percentage} size={56} strokeWidth={5} color={percentColor(cat.percentage)} delay={800 + i * 80}>
                          <span className={`text-xs font-bold ${percentColorClass(cat.percentage)}`}>
                            {cat.percentage}%
                          </span>
                        </RingGauge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {cat.correctAnswers}/{cat.totalQuestions} correct
                        {cat.averageTime > 0 && ` · ${cat.averageTime}s avg`}
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* ═══ Difficulty Breakdown ═══ */}
        <AnimatedCard delay={700} className="mb-10">
          <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Performance by Difficulty</h2>
            </div>
            <div className="space-y-5">
              {([
                { key: 'easy' as const, label: 'Easy', color: '#10b981', bgColor: 'bg-emerald-500' },
                { key: 'medium' as const, label: 'Medium', color: '#f59e0b', bgColor: 'bg-amber-500' },
                { key: 'hard' as const, label: 'Hard', color: '#f43f5e', bgColor: 'bg-rose-500' },
              ]).map((d, i) => {
                const data = difficultyPerformance[d.key]
                return (
                  <div key={d.key}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${d.bgColor}`} />
                        <span className="font-semibold text-gray-700">{d.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{data.correct}/{data.total}</span>
                        <span className="font-bold text-lg" style={{ color: d.color }}>{data.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <AnimatedBar height={12} color={d.color} delay={800 + i * 150} horizontal percentage={data.percentage} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </AnimatedCard>

        {/* ═══ Strong & Weak Areas ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <AnimatedCard delay={800}>
            <div className="bg-white rounded-2xl shadow-md p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-emerald-700">Your Strengths</h3>
              </div>
              {strongAreas.length > 0 ? (
                <div className="space-y-2">
                  {strongAreas.map((area, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-emerald-500 text-lg">✓</span>
                      <span className="font-medium text-emerald-900 text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">Keep going! Complete more tests to discover your strong areas.</p>
                  <p className="text-gray-400 text-xs mt-1">Need ≥75% accuracy on 5+ questions</p>
                </div>
              )}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={900}>
            <div className="bg-white rounded-2xl shadow-md p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-amber-700">Focus Areas</h3>
              </div>
              {weakAreas.length > 0 ? (
                <div className="space-y-2">
                  {weakAreas.map((area, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-amber-500 text-lg">◎</span>
                      <span className="font-medium text-amber-900 text-sm">{area}</span>
                    </div>
                  ))}
                  <p className="text-amber-600 text-xs mt-2 font-medium">💡 Practice these topics to see the biggest score gains!</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">Amazing work! No weak areas detected yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Keep testing to maintain your edge!</p>
                </div>
              )}
            </div>
          </AnimatedCard>
        </div>

        {/* ═══ Test History Table ═══ */}
        {testHistory.length > 0 && (
          <AnimatedCard delay={950} className="mb-10">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Test History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Accuracy</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SAT Score</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testHistory.map((test) => (
                      <tr key={test.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3 text-sm text-gray-700">
                          {new Date(test.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            test.isDrill
                              ? 'bg-indigo-100 text-indigo-700'
                              : test.moduleFocus?.toLowerCase().includes('math')
                              ? 'bg-purple-100 text-purple-700'
                              : test.moduleFocus?.toLowerCase().includes('read')
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {test.moduleFocus || 'Full Test'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold ${percentColorClass(test.score)}`}>
                            {test.score}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-gray-900">{test.satTotalScore}</div>
                          <div className="text-xs text-gray-400">R:{test.satReadingScore} M:{test.satMathScore}</div>
                        </td>
                        <td className="py-3 px-3 text-center text-sm text-gray-600">
                          {test.correctAnswers}/{test.totalQuestions}
                        </td>
                        <td className="py-3 px-3 text-center text-sm text-gray-600">
                          {formatTime(test.totalTimeSpent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* ═══ Motivational CTA Banner ═══ */}
        <AnimatedCard delay={1000}>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center shadow-xl shadow-indigo-500/20">
            <h2 className="text-2xl font-bold text-white mb-2">
              {overview.testsCompleted === 1 ? 'Great start!' : overview.testsCompleted < 5 ? 'You\'re on a roll!' : 'You\'re dedicated!'}
            </h2>
            <p className="text-indigo-200 mb-6">
              {overview.improvementRate > 0
                ? `You've improved by ${overview.improvementRate}%. Keep the momentum going!`
                : 'Every practice test brings you closer to your dream score.'}
            </p>
            <Button
              onClick={() => router.push('/practice-test')}
              variant="outline"
              size="lg"
              className="min-h-[48px] bg-white text-indigo-700 border-white hover:bg-indigo-50 font-bold"
            >
              Take Another Practice Test
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </AnimatedCard>

        <div className="h-10" />
      </div>
    </div>
  )
}

// ─── Default Export with Suspense (required for useSearchParams) ─────────────

export default function Progress() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" />
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    }>
      <ProgressContent />
    </Suspense>
  )
}
