"use client"

import { useState, useEffect, useCallback } from 'react'
import Script from 'next/script'
import { Check, X, ChevronRight, ChevronLeft, Info, RefreshCw, ChevronUp, ChevronDown, Star } from 'lucide-react'

interface Question {
    id: string
    moduleType: string
    difficulty: string
    category: string
    subtopic: string | null
    question: string
    passage: string | null
    options: string[]
    correctAnswer: number
    explanation: string
    imageUrl?: string | null
    imageData?: string | null
    imageMimeType?: string | null
    chartData?: Record<string, unknown> | null
    reviewStatus: string | null
}

    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [mathJaxLoaded, setMathJaxLoaded] = useState(false)
    const [showExplanation, setShowExplanation] = useState(false)
    const [reviewRating, setReviewRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [diagramAccurate, setDiagramAccurate] = useState(false)
    const [reviewComments, setReviewComments] = useState('')
    const [isPanelExpanded, setIsPanelExpanded] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    // Fetch questions
    const fetchQuestions = useCallback(async () => {
        setLoading(true)
        setFetchError(null)
        try {
            const response = await fetch('/api/public/questions?limit=20')
            if (!response.ok) throw new Error('Failed to fetch questions')
            const data = await response.json()
            setQuestions(data.questions)
            setCurrentIndex(0)
        } catch (error) {
            setFetchError('Could not load questions. Please check your connection and try again.')
            console.error('Failed to fetch questions:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchQuestions()
    }, [fetchQuestions])

    // MathJax Trigger
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).MathJax && mathJaxLoaded && questions.length > 0) {
            ; (window as any).MathJax?.typesetPromise?.().catch((err: Error) => console.error('MathJax error:', err))
        }
    }, [questions, currentIndex, mathJaxLoaded, showExplanation])

    const currentQuestion = questions[currentIndex]

    // Image Helper
    const getImageDataUrl = (question: Question) => {
        if (question.imageData) {
            if (question.imageData.startsWith('data:')) {
                return question.imageData
            }
            const mimeType = question.imageMimeType || 'image/png'
            return `data:${mimeType};base64,${question.imageData}`
        }
        return question.imageUrl
    }

    // Handle Review Submission
    const handleReview = async (status: 'approved' | 'rejected') => {
        if (!currentQuestion) return

        setSubmitting(true)
        setSubmitError(null)
        try {
            const res = await fetch('/api/public/questions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    reviewStatus: status,
                    reviewRating: reviewRating || (status === 'approved' ? 5 : 1),
                    diagramAccurate,
                    reviewComments
                })
            })
            if (!res.ok) throw new Error('Failed to submit review')
            // Move to next question
            handleNext()
        } catch (error) {
            setSubmitError('Could not submit review. Please try again.')
            console.error('Failed to submit review:', error)
        } finally {
            setSubmitting(false)
            // Reset form
            setShowExplanation(false)
            setReviewRating(0)
            setDiagramAccurate(false)
            setReviewComments('')
            setIsPanelExpanded(false)
        }
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            // Fetch more if we ran out
            fetchQuestions()
        }
    }

    const handleSkip = () => {
        handleNext()
    }

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

            switch (e.key) {
                case 'ArrowRight':
                    handleNext()
                    break
                case 'a':
                case 'A':
                    handleReview('approved')
                    break
                case 'r':
                case 'R':
                    handleReview('rejected')
                    break
                case 's':
                case 'S':
                    handleSkip()
                    break
                case 'e':
                case 'E':
                    setShowExplanation(prev => !prev)
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentIndex, questions, reviewRating, reviewComments, diagramAccurate]) // Dependencies for closure

    if (loading && questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6" role="status" aria-live="polite" aria-label="Loading"></div>
                {fetchError && (
                    <div className="bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl text-center max-w-md w-full mb-2" role="alert">
                        {fetchError}
                        <button
                            onClick={fetchQuestions}
                            className="ml-4 underline text-indigo-700 font-semibold hover:text-indigo-900"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h1>
                <p className="text-gray-600 mb-6">No pending questions to review right now.</p>
                {fetchError && (
                    <div className="bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl text-center max-w-md w-full mb-2" role="alert">
                        {fetchError}
                        <button
                            onClick={fetchQuestions}
                            className="ml-4 underline text-indigo-700 font-semibold hover:text-indigo-900"
                        >
                            Retry
                        </button>
                    </div>
                )}
                <button
                    onClick={fetchQuestions}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                    <RefreshCw size={20} aria-hidden="true" />
                    Check Again
                </button>
            </div>
        )
        // Show error if review submission fails
        const renderSubmitError = () => submitError ? (
            <div className="bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl text-center max-w-md w-full mb-4" role="alert">
                {submitError}
            </div>
        ) : null
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Script
                id="mathjax-config"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            window.MathJax = {
              tex: {
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                processEscapes: true
              },
              startup: {
                pageReady: () => {
                  return window.MathJax.startup.defaultPageReady().then(() => {
                    console.log('MathJax initial typesetting complete');
                  });
                }
              }
            };
          `
                }}
            />
            <Script
                src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
                strategy="afterInteractive"
                onLoad={() => setMathJaxLoaded(true)}
            />

            {/* Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b bg-white/80 backdrop-blur sticky top-0 z-10 w-full">
                <button
                    onClick={() => window.location.href = '/'}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all w-full sm:w-auto mb-2 sm:mb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="Back to Home"
                >
                    <span aria-hidden="true">←</span> Back to Home
                </button>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {currentIndex + 1} / {questions.length} loaded
                    </span>
                    <span className="hidden md:inline text-sm text-gray-500">Shortcuts: <strong>A</strong>pprove, <strong>R</strong>eject, <strong>S</strong>kip, <strong>E</strong>xplain</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-4xl mx-auto w-full p-2 sm:p-6 pb-32 sm:pb-48">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 w-full">

                    {/* Metadata Bar */}
                    <div className="bg-gray-50 px-4 sm:px-8 py-4 border-b border-gray-100 flex flex-wrap gap-2 sm:gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${currentQuestion.moduleType === 'math' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                            {currentQuestion.moduleType}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {currentQuestion.difficulty}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-200 text-gray-700">
                            {currentQuestion.category}
                        </span>
                    </div>

                    <div className="p-4 sm:p-8 md:p-12 space-y-6 md:space-y-8">
                        {/* Passage */}
                        {currentQuestion.passage && (
                            <div className="prose max-w-none bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Passage</h3>
                                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {currentQuestion.passage}
                                </div>
                            </div>
                        )}

                        {/* Question */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Question</h3>
                            <div
                                className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
                            />
                        </div>

                        {/* Diagram */}
                        {(currentQuestion.imageData || currentQuestion.imageUrl) && (
                            <div className="flex justify-center bg-white border-2 border-gray-100 rounded-2xl p-6">
                                <img
                                    src={getImageDataUrl(currentQuestion) || undefined}
                                    alt="Question diagram"
                                    className="max-h-96 w-auto rounded-lg shadow-sm"
                                />
                            </div>
                        )}

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-xl border-2 transition-all ${showExplanation && idx === currentQuestion.correctAnswer
                                        ? 'bg-green-50 border-green-500'
                                        : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${showExplanation && idx === currentQuestion.correctAnswer
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <div
                                            className="text-lg text-gray-800 pt-0.5"
                                            dangerouslySetInnerHTML={{ __html: option }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Explanation Toggle */}
                        <button
                            onClick={() => setShowExplanation(!showExplanation)}
                            className="flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
                        >
                            <Info size={20} />
                            {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
                        </button>

                        {/* Explanation Content */}
                        {showExplanation && (
                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                <h3 className="text-sm font-bold text-indigo-800 uppercase mb-2">Explanation</h3>
                                <div
                                    className="text-indigo-900 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Bottom Panel */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 transition-all duration-300 ease-in-out ${isPanelExpanded ? 'h-auto' : 'h-24'} w-full`}> 

                {/* Toggle Handle */}
                <div
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white border border-b-0 border-gray-200 rounded-t-xl px-6 py-1 cursor-pointer hover:bg-gray-50 shadow-sm"
                    onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                >
                    {isPanelExpanded ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronUp size={20} className="text-gray-500" />}
                </div>

                <div className="max-w-4xl mx-auto p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 w-full">

                    {/* Expanded Content */}
                    {isPanelExpanded && (
                        <div className="animate-in slide-in-from-bottom-4 fade-in duration-300 space-y-4 pb-2">
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
                                {/* Rating */}
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Quality Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setReviewRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                <Star
                                                    size={32}
                                                    className={`${star <= (hoverRating || reviewRating)
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-300'
                                                        } transition-colors`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Diagram Checkbox */}
                                <div className="flex items-center">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-100 hover:border-indigo-100 hover:bg-indigo-50 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={diagramAccurate}
                                            onChange={(e) => setDiagramAccurate(e.target.checked)}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            aria-checked={diagramAccurate}
                                            aria-label="Diagram is accurate"
                                        />
                                        <span className="font-medium text-gray-700">Diagram is accurate</span>
                                    </label>
                                </div>
                            </div>

                            {/* Comments */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Review Comments</label>
                                <textarea
                                    value={reviewComments}
                                    onChange={(e) => setReviewComments(e.target.value)}
                                    placeholder="Add specific feedback about this question..."
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none"
                                    aria-label="Review Comments"
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Buttons (Always Visible) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 w-full">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 flex-1 w-full">
                            <button
                                onClick={() => handleReview('rejected')}
                                disabled={submitting}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all disabled:opacity-50"
                            >
                                <X size={20} aria-hidden="true" />
                                <span>Reject (R)</span>
                            </button>
                            <button
                                onClick={() => handleReview('approved')}
                                disabled={submitting}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-green-200 disabled:opacity-50"
                            >
                                <Check size={20} aria-hidden="true" />
                                <span>Approve (A)</span>
                            </button>

                            {!isPanelExpanded && (
                                <button
                                    onClick={() => setIsPanelExpanded(true)}
                                    className="text-indigo-600 font-medium hover:text-indigo-800 text-sm hidden sm:block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    aria-label="Expand review panel"
                                >
                                    Add Details...
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSkip}
                                className="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                                title="Skip (S)"
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleNext}
                                className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg"
                                title="Next (Right Arrow)"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}