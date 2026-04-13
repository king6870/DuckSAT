"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { ADMIN_EMAILS } from "@/constants/adminEmails"
import { Search, Filter, BookOpen, ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, XCircle, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  visualType?: string
  chartData?: Record<string, unknown> | null
  imageUrl?: string
  imageData?: string
  imageMimeType?: string
  imageAlt?: string
}

const CATEGORIES = {
  "reading-writing": [
    { value: "reading-comprehension", label: "Reading Comprehension" },
    { value: "writing-language", label: "Writing & Language" },
    { value: "grammar", label: "Grammar & Usage" },
    { value: "vocabulary", label: "Vocabulary" },
  ],
  "math": [
    { value: "algebra", label: "Algebra" },
    { value: "advanced-math", label: "Advanced Math" },
    { value: "geometry", label: "Geometry & Trig" },
    { value: "problem-solving-data-analysis", label: "Problem Solving & Data" },
    { value: "statistics", label: "Statistics" },
  ]
}

const DIFFICULTIES = ["easy", "medium", "hard"]

export default function QuestionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Filters
  const [searchText, setSearchText] = useState("")
  const [moduleType, setModuleType] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [difficulty, setDifficulty] = useState<string>("")
  const [showFilters, setShowFilters] = useState(true)

  // Question interaction
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})

  const fetchQuestions = useCallback(async (newOffset: number) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    params.set("offset", String(newOffset))
    if (searchText) params.set("search", searchText)
    if (moduleType) params.set("moduleType", moduleType)
    if (category) params.set("category", category)
    if (difficulty) params.set("difficulty", difficulty)

    try {
      const res = await fetch(`/api/questions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setQuestions(data.questions || [])
      setTotal(data.total || 0)
      setOffset(newOffset)
    } catch {
      setQuestions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [searchText, moduleType, category, difficulty])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated" && !ADMIN_EMAILS.includes(session?.user?.email || '')) {
      router.push("/")
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchQuestions(0)
    }
  }, [status, isAdmin, fetchQuestions])

  const handleSearch = () => {
    setExpandedId(null)
    setSelectedAnswers({})
    setRevealedAnswers({})
    fetchQuestions(0)
  }

  const handleSelectAnswer = (questionId: string, answerIndex: number) => {
    if (revealedAnswers[questionId]) return
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleRevealAnswer = (questionId: string) => {
    setRevealedAnswers(prev => ({ ...prev, [questionId]: true }))
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "bg-green-100 text-green-700"
      case "medium": return "bg-yellow-100 text-yellow-700"
      case "hard": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getModuleColor = (mod: string) => {
    return mod === "math"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700"
  }

  const formatCategory = (cat: string) => {
    return cat.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Question Bank
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            Browse and practice from {total.toLocaleString()} SAT questions
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 p-6">
          {/* Search bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions by text, topic, or keyword..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-800"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button variant="primary" size="lg" onClick={handleSearch}>
              <Search className="w-5 h-5 mr-1" /> Search
            </Button>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-3"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Section</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 outline-none text-gray-800"
                  value={moduleType}
                  onChange={e => { setModuleType(e.target.value); setCategory("") }}
                >
                  <option value="">All Sections</option>
                  <option value="reading-writing">Reading & Writing</option>
                  <option value="math">Math</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 outline-none text-gray-800"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {moduleType
                    ? CATEGORIES[moduleType as keyof typeof CATEGORIES]?.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))
                    : Object.values(CATEGORIES).flat().map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))
                  }
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 outline-none text-gray-800"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                >
                  <option value="">All Difficulties</option>
                  {DIFFICULTIES.map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No questions found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total.toLocaleString()} questions
              </p>
            </div>

            {/* Question cards */}
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isExpanded = expandedId === q.id
                const selectedAnswer = selectedAnswers[q.id]
                const isRevealed = revealedAnswers[q.id]

                return (
                  <div
                    key={q.id}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow border border-gray-100 hover:border-indigo-200 transition-all overflow-hidden"
                  >
                    {/* Card header — always visible */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="w-full text-left p-5 flex items-start gap-4"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {offset + idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium line-clamp-2">
                          <MathRenderer>{q.question.length > 150 ? q.question.slice(0, 150) + "..." : q.question}</MathRenderer>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getModuleColor(q.moduleType)}`}>
                            {q.moduleType === "math" ? "Math" : "Reading & Writing"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDifficultyColor(q.difficulty)}`}>
                            {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            {formatCategory(q.category)}
                          </span>
                          {q.subtopic && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600">
                              {formatCategory(q.subtopic)}
                            </span>
                          )}
                          {q.chartData && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600 flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" /> Diagram
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                        {/* Passage */}
                        {q.passage && (
                          <div className="mb-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-400">
                            <h4 className="font-semibold text-blue-800 text-sm mb-2">Reading Passage</h4>
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <MathRenderer>{q.passage}</MathRenderer>
                            </div>
                          </div>
                        )}

                        {/* Chart/Image */}
                        {q.chartData && (
                          <div className="mb-4">
                            <ChartRenderer chartData={q.chartData} />
                          </div>
                        )}
                        {(q.imageData || q.imageUrl) && (
                          <div className="mb-4 flex justify-center">
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
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`data:${q.imageMimeType};base64,${q.imageData}`}
                                  alt={q.imageAlt || "Question diagram"}
                                  className="max-w-md rounded-lg"
                                />
                              )
                            ) : q.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={q.imageUrl}
                                alt={q.imageAlt || "Question diagram"}
                                className="max-w-md rounded-lg"
                              />
                            ) : null}
                          </div>
                        )}

                        {/* Full question */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-800 mb-2">Question</h4>
                          <div className="text-gray-700">
                            <MathRenderer>{q.question}</MathRenderer>
                          </div>
                        </div>

                        {/* Answer options */}
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i)
                            const isSelected = selectedAnswer === i
                            const isCorrect = i === q.correctAnswer
                            let optionStyle = "border-gray-200 bg-white hover:border-indigo-300 cursor-pointer"

                            if (isRevealed) {
                              if (isCorrect) {
                                optionStyle = "border-green-400 bg-green-50"
                              } else if (isSelected && !isCorrect) {
                                optionStyle = "border-red-400 bg-red-50"
                              } else {
                                optionStyle = "border-gray-200 bg-gray-50 opacity-60"
                              }
                            } else if (isSelected) {
                              optionStyle = "border-indigo-400 bg-indigo-50"
                            }

                            return (
                              <button
                                key={i}
                                onClick={() => handleSelectAnswer(q.id, i)}
                                disabled={isRevealed}
                                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${optionStyle}`}
                              >
                                <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                  {letter}
                                </span>
                                <span className="text-gray-700 flex-1">
                                  <MathRenderer>{opt}</MathRenderer>
                                </span>
                                {isRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
                                {isRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                              </button>
                            )
                          })}
                        </div>

                        {/* Check answer button */}
                        {!isRevealed && selectedAnswer !== undefined && (
                          <Button variant="primary" size="sm" onClick={() => handleRevealAnswer(q.id)}>
                            Check Answer
                          </Button>
                        )}

                        {/* Explanation */}
                        {isRevealed && (
                          <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
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
                            {isRevealed && selectedAnswer !== q.correctAnswer && q.wrongAnswerExplanations && q.wrongAnswerExplanations[selectedAnswer] && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-sm font-semibold text-red-700 mb-1">Why your answer is wrong:</p>
                                <p className="text-sm text-red-600">
                                  <MathRenderer>{q.wrongAnswerExplanations[selectedAnswer]}</MathRenderer>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => fetchQuestions(offset - limit)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchQuestions(offset + limit)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
