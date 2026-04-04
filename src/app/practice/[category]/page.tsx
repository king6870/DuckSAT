"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCcw, Home, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackDrill, trackEvent } from "@/lib/tracking"
import MathRenderer from "@/components/MathRenderer"
import ChartRenderer from "@/components/ChartRenderer"

interface Question {
  id: string
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  explanation: string
  wrongAnswerExplanations?: string[]
  moduleType: string
  difficulty: string
  category: string
  subtopic?: string
  chartData?: Record<string, unknown> | null
  imageUrl?: string
  imageData?: string
  imageMimeType?: string
  imageAlt?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  "mixed": "Mixed Quiz",
  "reading-comprehension": "Reading Comprehension",
  "grammar": "Grammar & Usage",
  "vocabulary": "Vocabulary",
  "writing-language": "Writing & Rhetoric",
  "algebra": "Algebra",
  "advanced-math": "Advanced Math",
  "geometry": "Geometry & Trig",
  "problem-solving-data-analysis": "Problem Solving & Data",
  "statistics": "Statistics",
}

const CATEGORY_MODULE: Record<string, string> = {
  "reading-comprehension": "reading-writing",
  "grammar": "reading-writing",
  "vocabulary": "reading-writing",
  "writing-language": "reading-writing",
  "algebra": "math",
  "advanced-math": "math",
  "geometry": "math",
  "problem-solving-data-analysis": "math",
  "statistics": "math",
}

const DEFAULT_DRILL_COUNT = 10
const ALLOWED_DRILL_COUNTS = [1, 3, 5, 10, 20, 30] as const

function sanitizeDrillCount(raw: string | null): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_DRILL_COUNT
  return ALLOWED_DRILL_COUNTS.includes(parsed as (typeof ALLOWED_DRILL_COUNTS)[number])
    ? parsed
    : DEFAULT_DRILL_COUNT
}

export default function DrillPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const categorySlug = params.category as string
  const initialDrillCount = sanitizeDrillCount(searchParams.get('count'))

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [results, setResults] = useState<Array<{ questionId: string; selected: number; correct: number; isCorrect: boolean }>>([])
  const [isComplete, setIsComplete] = useState(false)
  const [difficulty, setDifficulty] = useState<string>("") // empty = mixed
  const [drillStarted, setDrillStarted] = useState(false)
  const [drillCount, setDrillCount] = useState<number>(initialDrillCount)

  // Analytics timing
  const drillStartTime = useRef<string>('')
  const questionStartTime = useRef<number>(0)
  const questionTimes = useRef<number[]>([])

  const categoryLabel = CATEGORY_LABELS[categorySlug] || categorySlug
  const moduleType = categorySlug === 'mixed' ? '' : (CATEGORY_MODULE[categorySlug] || "math")
  const isMixed = categorySlug === 'mixed'

  const fetchQuestions = useCallback(async (diff: string, count: number) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      count: String(count),
      includeExplanations: "true",
    })
    if (!isMixed) {
      params.set("moduleType", moduleType)
      params.set("category", categorySlug)
    }
    if (diff) params.set("difficulty", diff)

    try {
      const res = await fetch(`/api/questions/practice?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch questions")
      const json = await res.json()
      const questionsData = json.data?.questions || json.questions || []
      if (questionsData.length === 0) {
        setError("No questions available for this category. Try a different topic!")
        setQuestions([])
      } else {
        // Shuffle the questions for variety
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5)
        // Shuffle answer options per question so correct answer isn't always A
        const withShuffledOptions = shuffled.slice(0, count).map((q: Question) => {
          const indices = q.options.map((_: string, i: number) => i)
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]]
          }
          return {
            ...q,
            options: indices.map((i: number) => q.options[i]),
            correctAnswer: indices.indexOf(q.correctAnswer),
            wrongAnswerExplanations: q.wrongAnswerExplanations
              ? indices.map((i: number) => q.wrongAnswerExplanations![i])
              : undefined,
          }
        })
        setQuestions(withShuffledOptions)
      }
    } catch {
      setError("Failed to load questions. Please try again.")
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [moduleType, categorySlug, isMixed])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  const startDrill = (diff: string) => {
    setDifficulty(diff)
    setDrillStarted(true)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setIsRevealed(false)
    setResults([])
    setIsComplete(false)
    drillStartTime.current = new Date().toISOString()
    questionStartTime.current = Date.now()
    questionTimes.current = []
    trackEvent('drill', 'drill_started', { category: categorySlug, difficulty: diff || 'mixed', drillLength: drillCount })
    fetchQuestions(diff, drillCount)
  }

  const handleSelectAnswer = (index: number) => {
    if (isRevealed) return
    setSelectedAnswer(index)
  }

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return
    setIsRevealed(true)
    const q = questions[currentIndex]
    // Record question time
    const elapsed = Date.now() - questionStartTime.current
    questionTimes.current[currentIndex] = elapsed
    setResults(prev => [...prev, {
      questionId: q.id,
      selected: selectedAnswer,
      correct: q.correctAnswer,
      isCorrect: selectedAnswer === q.correctAnswer,
    }])
  }

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setIsComplete(true)
      saveDrillResults()
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsRevealed(false)
      questionStartTime.current = Date.now()
    }
  }

  const saveDrillResults = async () => {
    // Build final results including current question
    const finalResults = results.concat(selectedAnswer !== null ? [{
      questionId: questions[currentIndex]?.id,
      selected: selectedAnswer,
      correct: questions[currentIndex]?.correctAnswer,
      isCorrect: selectedAnswer === questions[currentIndex]?.correctAnswer,
    }] : [])

    // Send to existing drill-results API
    try {
      await fetch("/api/practice/drill-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categorySlug,
          moduleType,
          difficulty: difficulty || "mixed",
          drillLength: drillCount,
          results: finalResults,
        }),
      })
    } catch {
      // Silent failure — drill results are best-effort
    }

    // Send detailed analytics to tracking API
    const completedAt = new Date().toISOString()
    const totalTimeMs = questionTimes.current.reduce((a, b) => a + b, 0)
    const questionResults = finalResults.map((r, i) => ({
      questionId: r.questionId,
      questionIndex: i,
      category: questions[i]?.category || categorySlug,
      difficulty: questions[i]?.difficulty || difficulty || 'mixed',
      moduleType: questions[i]?.moduleType || moduleType || 'mixed',
      userAnswer: r.selected,
      correctAnswer: r.correct,
      isCorrect: r.isCorrect,
      timeSpentMs: questionTimes.current[i] || 0,
    }))

    trackDrill({
      category: categorySlug,
      moduleType: moduleType || undefined,
      difficulty: difficulty || undefined,
      totalQuestions: finalResults.length,
      correctAnswers: finalResults.filter(r => r.isCorrect).length,
      score: Math.round((finalResults.filter(r => r.isCorrect).length / finalResults.length) * 100),
      totalTimeMs,
      startedAt: drillStartTime.current,
      completedAt,
      questionResults,
    })

    trackEvent('drill', 'drill_completed', {
      category: categorySlug,
      difficulty: difficulty || 'mixed',
      drillLength: drillCount,
      score: Math.round((finalResults.filter(r => r.isCorrect).length / finalResults.length) * 100),
      totalQuestions: finalResults.length,
    })
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "bg-green-100 text-green-700 border-green-300"
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300"
      case "hard": return "bg-red-100 text-red-700 border-red-300"
      default: return "bg-gray-100 text-gray-700 border-gray-300"
    }
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  // Difficulty selection screen
  if (!drillStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" onClick={() => router.push("/practice")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Topics
            </Button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 p-8 text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{categoryLabel}</h1>
            <p className="text-gray-600 mb-4">Choose drill length and difficulty</p>

            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-gray-700">Drill Length</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ALLOWED_DRILL_COUNTS.map((count) => (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => startDrill("")}
                className="p-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 hover:border-indigo-400 transition-all text-left"
              >
                <div className="text-2xl mb-2">🎲</div>
                <h3 className="text-lg font-bold text-gray-900">Mixed</h3>
                <p className="text-sm text-gray-500">All difficulty levels</p>
              </button>
              <button
                onClick={() => startDrill("easy")}
                className="p-6 rounded-2xl border-2 border-green-200 bg-green-50 hover:border-green-400 transition-all text-left"
              >
                <div className="text-2xl mb-2">🌱</div>
                <h3 className="text-lg font-bold text-green-800">Easy</h3>
                <p className="text-sm text-green-600">Build your foundation</p>
              </button>
              <button
                onClick={() => startDrill("medium")}
                className="p-6 rounded-2xl border-2 border-yellow-200 bg-yellow-50 hover:border-yellow-400 transition-all text-left"
              >
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="text-lg font-bold text-yellow-800">Medium</h3>
                <p className="text-sm text-yellow-600">Challenge yourself</p>
              </button>
              <button
                onClick={() => startDrill("hard")}
                className="p-6 rounded-2xl border-2 border-red-200 bg-red-50 hover:border-red-400 transition-all text-left"
              >
                <div className="text-2xl mb-2">🔥</div>
                <h3 className="text-lg font-bold text-red-800">Hard</h3>
                <p className="text-sm text-red-600">Test your mastery</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 rounded-2xl shadow-lg p-8 text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/practice")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Topics
            </Button>
            <Button variant="primary" onClick={() => startDrill(difficulty)}>
              <RotateCcw className="w-4 h-4 mr-1" /> Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Results screen
  if (isComplete) {
    const correctCount = results.filter(r => r.isCorrect).length
    const percentage = Math.round((correctCount / results.length) * 100)
    const getScoreMessage = () => {
      if (percentage >= 90) return "Outstanding! 🎉"
      if (percentage >= 70) return "Great job! 💪"
      if (percentage >= 50) return "Good effort! 📈"
      return "Keep practicing! 🌱"
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Drill Complete!</h1>
            <p className="text-lg text-gray-600 mb-2">{categoryLabel}</p>
            <p className="text-2xl font-bold mb-1">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {correctCount}/{results.length}
              </span>
            </p>
            <p className="text-gray-500 mb-6">{getScoreMessage()}</p>

            {/* Score bar */}
            <div className="max-w-xs mx-auto mb-8">
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 70 ? "bg-green-500" : percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">{percentage}% correct</p>
            </div>

            {/* Per-question breakdown */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-8">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    r.isCorrect
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={() => startDrill(difficulty)}>
                <RotateCcw className="w-4 h-4 mr-1" /> Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push("/practice")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Topics
              </Button>
              <Button variant="ghost" onClick={() => router.push("/")}>
                <Home className="w-4 h-4 mr-1" /> Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Question screen
  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => {
            if (confirm("Are you sure you want to quit this drill?")) {
              router.push("/practice")
            }
          }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Quit
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600">{categoryLabel}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDifficultyColor(q.difficulty)}`}>
              {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{results.filter(r => r.isCorrect).length} correct so far</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + (isRevealed ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {/* Passage */}
          {q.passage && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400">
              <h4 className="font-semibold text-blue-800 text-sm mb-2">Reading Passage</h4>
              <div className="prose prose-sm max-w-none text-gray-700">
                <MathRenderer>{q.passage}</MathRenderer>
              </div>
            </div>
          )}

          {/* Chart/Image */}
          {q.chartData && (
            <div className="mb-6">
              <ChartRenderer chartData={q.chartData} />
            </div>
          )}
          {(q.imageData || q.imageUrl) && (
            <div className="mb-6 flex justify-center">
              {q.imageData && q.imageMimeType ? (
                q.imageMimeType === 'image/svg+xml' ? (
                  <div
                    className="max-w-md"
                    dangerouslySetInnerHTML={{
                      __html: typeof q.imageData === 'string'
                        ? q.imageData
                        : new TextDecoder().decode(
                            new Uint8Array(Object.values(q.imageData as unknown as Record<string, number>))
                          )
                    }}
                  />
                ) : (
                  <img
                    src={`data:${q.imageMimeType};base64,${q.imageData}`}
                    alt={q.imageAlt || "Question diagram"}
                    className="max-w-md rounded-lg"
                  />
                )
              ) : q.imageUrl ? (
                <img
                  src={q.imageUrl}
                  alt={q.imageAlt || "Question diagram"}
                  className="max-w-md rounded-lg"
                />
              ) : null}
            </div>
          )}

          {/* Question text */}
          <div className="mb-6">
            <div className="text-lg text-gray-800 font-medium">
              <MathRenderer>{q.question}</MathRenderer>
            </div>
          </div>

          {/* Answer options */}
          <div className="space-y-3 mb-6">
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              const isSelected = selectedAnswer === i
              const isCorrect = i === q.correctAnswer

              let optionStyle = "border-gray-200 bg-white hover:border-indigo-300 cursor-pointer"
              if (isRevealed) {
                if (isCorrect) optionStyle = "border-green-400 bg-green-50"
                else if (isSelected && !isCorrect) optionStyle = "border-red-400 bg-red-50"
                else optionStyle = "border-gray-200 bg-gray-50 opacity-60"
              } else if (isSelected) {
                optionStyle = "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(i)}
                  disabled={isRevealed}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${optionStyle}`}
                >
                  <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {letter}
                  </span>
                  <span className="text-gray-700 flex-1 pt-0.5">
                    <MathRenderer>{opt}</MathRenderer>
                  </span>
                  {isRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />}
                  {isRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />}
                </button>
              )
            })}
          </div>

          {/* Action buttons */}
          {!isRevealed ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={selectedAnswer === null}
              onClick={handleCheckAnswer}
            >
              Check Answer
            </Button>
          ) : (
            <>
              {/* Explanation */}
              <div className="mb-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50">
                <h4 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                  {selectedAnswer === q.correctAnswer ? (
                    <><CheckCircle2 className="w-5 h-5 text-green-500" /> Correct!</>
                  ) : (
                    <><XCircle className="w-5 h-5 text-red-500" /> Incorrect</>
                  )}
                </h4>
                <div className="text-gray-700 text-sm">
                  <MathRenderer>{q.explanation}</MathRenderer>
                </div>
                {selectedAnswer !== q.correctAnswer && q.wrongAnswerExplanations && q.wrongAnswerExplanations[selectedAnswer!] && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-semibold text-red-700 mb-1">Why your answer is wrong:</p>
                    <p className="text-sm text-red-600">
                      <MathRenderer>{q.wrongAnswerExplanations[selectedAnswer!]}</MathRenderer>
                    </p>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleNext}
              >
                {currentIndex + 1 >= questions.length ? (
                  <>See Results <Trophy className="w-5 h-5 ml-1" /></>
                ) : (
                  <>Next Question <ArrowRight className="w-5 h-5 ml-1" /></>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
