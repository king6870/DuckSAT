import { useState, useEffect, useCallback, useMemo } from 'react'
import { TestState, TestResult, QuestionResult, Question } from '@/types/test'
import { MODULE_CONFIGS } from '@/data/moduleConfigs'

export function useTestState(userId: string) {
  const [testState] = useState<TestState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [moduleStarted, setModuleStarted] = useState(false)
  const [isBreakTime, setIsBreakTime] = useState(false)
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0)
  const [showReview, setShowReview] = useState(false)

  // Timer and answer state
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [moduleStartTime, setModuleStartTime] = useState<Date | null>(null)
  const [testStartTime, setTestStartTime] = useState<Date | null>(null)

  // Test results tracking
  const [testResults, setTestResults] = useState<TestResult | null>(null)
  const [moduleResults, setModuleResults] = useState<QuestionResult[][]>([])

  // Questions from database with no-repeat tracking
  const [currentModuleQuestions, setCurrentModuleQuestions] = useState<Question[]>([])
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([])

  // Per-question time tracking (records are JSON-safe)
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({})
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({})

  const currentModule = useMemo(() => {
    if (currentModuleIndex >= MODULE_CONFIGS.length) return null
    return MODULE_CONFIGS[currentModuleIndex]
  }, [currentModuleIndex])

  const currentQuestion = useMemo(() => {
    if (!currentModule || currentModuleQuestions.length === 0) return null
    if (currentQuestionIndex >= currentModuleQuestions.length) return null
    return currentModuleQuestions[currentQuestionIndex]
  }, [currentModule, currentModuleQuestions, currentQuestionIndex])

  const fetchQuestions = useCallback(async (moduleType: string, questionCount?: number) => {
    try {
      setIsLoading(true)
      const limit = questionCount || (moduleType === 'math' ? 22 : 27)
      console.log(`🔍 Fetching ${limit} questions for moduleType: ${moduleType}`)

      const response = await fetch(`/api/questions?moduleType=${moduleType}&limit=${limit * 2}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`)
      }

      const data = await response.json()
      const questions = data.questions || data
      console.log(`📝 Received ${questions.length || 0} questions from API`)

      if (!questions || questions.length === 0) {
        console.warn('⚠️ No questions available from API, returning empty array')
        setCurrentModuleQuestions([])
        setSelectedAnswers([])
        setIsLoading(false)
        return []
      }

      const availableQuestions = questions.filter((q: Question) => !usedQuestionIds.includes(q.id))
      let questionsToUse = availableQuestions
      if (availableQuestions.length < limit) {
        console.log('⚠️ Not enough unused questions, allowing some repeats')
        questionsToUse = questions
        setUsedQuestionIds([])
      }

      const selectedQuestions = questionsToUse.slice(0, limit)
      const newUsedIds = [...usedQuestionIds]
      selectedQuestions.forEach((q: Question) => {
        if (!newUsedIds.includes(q.id)) newUsedIds.push(q.id)
      })
      setUsedQuestionIds(newUsedIds)

      setCurrentModuleQuestions(selectedQuestions)
      setSelectedAnswers(new Array(selectedQuestions.length).fill(-1))

      console.log(`✅ Set ${selectedQuestions.length} questions for current module`)
      return selectedQuestions
    } catch (fetchError) {
      console.error('❌ Error fetching questions:', fetchError)
      throw fetchError
    } finally {
      setIsLoading(false)
    }
  }, [usedQuestionIds])

  useEffect(() => {
    if (moduleStarted && !isTransitioning && currentQuestion) {
      setQuestionStartTimes(prev => {
        if (currentQuestionIndex in prev) return prev
        return { ...prev, [currentQuestionIndex]: Date.now() }
      })
    }
  }, [moduleStarted, isTransitioning, currentQuestion, currentQuestionIndex])

  useEffect(() => {
    if (isBreakTime && breakTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setBreakTimeRemaining(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }

    if (isBreakTime && breakTimeRemaining === 0) {
      setIsBreakTime(false)
      setIsTransitioning(true)
      setCurrentModuleQuestions([])
      setSelectedAnswers([])
      setCurrentQuestionIndex(0)
      setCurrentModuleIndex(2)
    }
  }, [isBreakTime, breakTimeRemaining])

  const startTest = useCallback(async () => {
    try {
      setIsLoading(true)
      setTestStartTime(new Date())
      setHasStarted(true)
      setCurrentModuleIndex(0)
      setCurrentQuestionIndex(0)

      await fetchQuestions('reading-writing', 27)

      setIsTransitioning(false)
      setModuleStarted(false)
    } catch (startError) {
      console.error('Error starting test:', startError)
      setIsLoading(false)
    }
  }, [fetchQuestions])

  const startModule = useCallback(() => {
    if (!currentModule) return

    console.log('🚀 Starting module:', currentModule.title)
    setModuleStartTime(new Date())
    setModuleStarted(true)
    setIsTransitioning(false)
    setCurrentQuestionIndex(0)

    setTimeRemaining(currentModule.duration * 60)
    setQuestionStartTimes({})
    setQuestionTimeSpent({})

    console.log('✅ Module started successfully')
  }, [currentModule])

  useEffect(() => {
    if (!isTransitioning || moduleStarted || isBreakTime) return
    if (!currentModule || currentModuleQuestions.length === 0) return

    const timer = setTimeout(() => {
      startModule()
    }, 10000)

    return () => clearTimeout(timer)
  }, [isTransitioning, moduleStarted, isBreakTime, currentModule, currentModuleQuestions.length, startModule])

  const recordQuestionTime = useCallback(() => {
    const startTime = questionStartTimes[currentQuestionIndex]
    if (!startTime) return

    const now = Date.now()
    const timeSpent = Math.floor((now - startTime) / 1000)
    const existingTime = questionTimeSpent[currentQuestionIndex] || 0

    setQuestionTimeSpent(prev => ({
      ...prev,
      [currentQuestionIndex]: existingTime + timeSpent
    }))
  }, [currentQuestionIndex, questionStartTimes, questionTimeSpent])

  const completeModule = useCallback(async () => {
    if (!currentModule || !moduleStartTime) return

    recordQuestionTime()

    const moduleQuestionResults: QuestionResult[] = currentModuleQuestions.map((question, index) => ({
      questionId: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      moduleType: question.moduleType,
      userAnswer: selectedAnswers[index] || -1,
      correctAnswer: question.correctAnswer,
      isCorrect: selectedAnswers[index] === question.correctAnswer,
      timeSpent: questionTimeSpent[index] || 0,
      options: question.options,
      explanation: question.explanation
    }))

    const newModuleResults = [...moduleResults]
    newModuleResults[currentModuleIndex] = moduleQuestionResults
    setModuleResults(newModuleResults)

    if (currentModuleIndex === 1) {
      setIsBreakTime(true)
      setBreakTimeRemaining(600)
      setModuleStarted(false)
      setIsTransitioning(false)
      setCurrentModuleQuestions([])
      setSelectedAnswers([])
      setCurrentQuestionIndex(0)
      setShowReview(false)
      return
    }

    if (currentModuleIndex < MODULE_CONFIGS.length - 1) {
      setCurrentModuleIndex(prev => prev + 1)
      setIsTransitioning(true)
      setModuleStarted(false)
      setCurrentModuleQuestions([])

      const nextModule = MODULE_CONFIGS[currentModuleIndex + 1]
      if (nextModule) {
        await fetchQuestions(nextModule.type, nextModule.questionCount)
      }
      return
    }

    completeTest(newModuleResults)
  }, [currentModule, moduleStartTime, currentModuleQuestions, selectedAnswers, moduleResults, currentModuleIndex, fetchQuestions, recordQuestionTime, questionTimeSpent])

  const completeTest = useCallback(async (finalModuleResults: QuestionResult[][]) => {
    if (!testStartTime) return

    const endTime = new Date()
    const totalTimeSpent = Math.floor((endTime.getTime() - testStartTime.getTime()) / 1000)

    const allResults = finalModuleResults.flat()
    const correctAnswers = allResults.filter(r => r.isCorrect).length
    const totalQuestions = allResults.length

    const categoryPerformance: Record<string, { correct: number; total: number }> = {}
    allResults.forEach(result => {
      if (!categoryPerformance[result.category]) {
        categoryPerformance[result.category] = { correct: 0, total: 0 }
      }
      categoryPerformance[result.category].total++
      if (result.isCorrect) {
        categoryPerformance[result.category].correct++
      }
    })

    const finalResults: TestResult = {
      id: `test-${Date.now()}`,
      userId,
      startTime: testStartTime,
      endTime,
      totalTimeSpent,
      totalQuestions,
      correctAnswers,
      score: Math.round((correctAnswers / totalQuestions) * 100),
      moduleResults: finalModuleResults,
      categoryPerformance,
      completedAt: endTime
    }

    setTestResults(finalResults)
    setIsComplete(true)

    try {
      const response = await fetch('/api/test-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testResults: finalResults })
      })

      if (!response.ok) {
        console.error('Failed to save test results:', await response.text())
      } else {
        const data = await response.json()
        console.log('✅ Test results saved successfully:', data)
      }
    } catch (saveError) {
      console.error('Error saving test results:', saveError)
    }
  }, [testStartTime, userId])

  useEffect(() => {
    if (moduleStarted && timeRemaining > 0 && !isTransitioning && !isComplete) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    }

    if (moduleStarted && timeRemaining === 0) {
      completeModule()
    }
  }, [moduleStarted, timeRemaining, isTransitioning, isComplete, completeModule])

  const selectAnswer = useCallback((answerIndex: number) => {
    if (currentQuestionIndex >= 0 && currentQuestionIndex < selectedAnswers.length) {
      const newAnswers = [...selectedAnswers]
      newAnswers[currentQuestionIndex] = answerIndex
      setSelectedAnswers(newAnswers)
    }
  }, [currentQuestionIndex, selectedAnswers])

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < currentModuleQuestions.length - 1) {
      recordQuestionTime()
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }, [currentQuestionIndex, currentModuleQuestions.length, recordQuestionTime])

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      recordQuestionTime()
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }, [currentQuestionIndex, recordQuestionTime])

  const goToQuestion = useCallback((questionIndex: number) => {
    if (questionIndex >= 0 && questionIndex < currentModuleQuestions.length) {
      recordQuestionTime()
      setCurrentQuestionIndex(questionIndex)
    }
  }, [currentModuleQuestions.length, recordQuestionTime])

  const skipBreak = useCallback(() => {
    if (!isBreakTime) return
    setIsBreakTime(false)
    setBreakTimeRemaining(0)
    setIsTransitioning(true)
    setCurrentModuleQuestions([])
    setSelectedAnswers([])
    setCurrentQuestionIndex(0)
    setCurrentModuleIndex(2)
  }, [isBreakTime])

  useEffect(() => {
    if (!isTransitioning || isBreakTime) return
    if (!currentModule || currentModuleQuestions.length > 0) return
    if (isLoading) return

    fetchQuestions(currentModule.type, currentModule.questionCount)
  }, [isTransitioning, isBreakTime, currentModule, currentModuleQuestions.length, isLoading, fetchQuestions])

  return {
    testState,
    isLoading,
    error,
    hasStarted,
    currentModuleIndex,
    currentQuestionIndex,
    isTransitioning,
    isComplete,
    moduleStarted,
    isBreakTime,
    breakTimeRemaining,
    showReview,
    timeRemaining,
    selectedAnswers,
    testResults,
    currentModule,
    currentQuestion,
    currentModuleQuestions,

    startTest,
    startModule,
    completeModule,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    setShowReview,
    skipBreak,

    progress: currentModuleQuestions.length > 0
      ? Math.round(((currentQuestionIndex + 1) / currentModuleQuestions.length) * 100)
      : 0,
    questionsAnswered: selectedAnswers.filter(answer => answer !== -1).length,
    canGoNext: currentQuestionIndex < currentModuleQuestions.length - 1,
    canGoPrevious: currentQuestionIndex > 0,
    selectedAnswer: selectedAnswers[currentQuestionIndex] ?? -1
  }
}