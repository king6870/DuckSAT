import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { TestState, TestResult, QuestionResult, Question } from '@/types/test'
import { MODULE_CONFIGS } from '@/data/moduleConfigs'
import { computeSATScores } from '@/lib/satScoring'
import { trackEvent } from '@/lib/tracking'

export function useTestState(userId: string, practiceTestId?: string) {
  const logContext = useMemo(() => ({
    userId,
    practiceTestId: practiceTestId || null,
  }), [userId, practiceTestId])

  const [testState] = useState<TestState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  const [, setUsedQuestionIds] = useState<string[]>([])
  const usedQuestionIdsRef = useRef<string[]>([])

  // Epic #61: For fixed practice tests, cache all modules at once
  const [allPracticeTestModules, setAllPracticeTestModules] = useState<Question[][]>([])

  // Per-question time tracking (records are JSON-safe)
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({})
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({})

  // Guard against double-calling completeModule
  const isCompletingRef = useRef(false)

  const currentModule = useMemo(() => {
    if (currentModuleIndex >= MODULE_CONFIGS.length) return null
    return MODULE_CONFIGS[currentModuleIndex]
  }, [currentModuleIndex])

  const currentQuestion = useMemo(() => {
    if (!currentModule || currentModuleQuestions.length === 0) return null
    if (currentQuestionIndex >= currentModuleQuestions.length) return null
    return currentModuleQuestions[currentQuestionIndex]
  }, [currentModule, currentModuleQuestions, currentQuestionIndex])

  const fetchQuestions = useCallback(async (moduleType: string, questionCount?: number, targetModuleIndex?: number) => {
    try {
      setIsLoading(true)
      setError(null)
      const limit = questionCount || (moduleType === 'math' ? 22 : 27)
      // Use explicit targetModuleIndex if provided, otherwise fall back to state
      const effectiveModuleIndex = targetModuleIndex ?? currentModuleIndex

      // Epic #61: Fixed practice test mode
      if (practiceTestId) {
        // If all modules are already fetched, use cached data
        if (allPracticeTestModules.length > 0) {
          let resolvedModuleIndex = effectiveModuleIndex
          let moduleQuestions = allPracticeTestModules[resolvedModuleIndex] || []

          if (moduleQuestions.length === 0) {
            const firstNonEmptyModuleIndex = allPracticeTestModules.findIndex((questions) => (questions?.length || 0) > 0)
            if (firstNonEmptyModuleIndex === -1) {
              console.error('[useTestState] Fixed test cache has no populated modules', {
                ...logContext,
                allPracticeTestModulesCount: allPracticeTestModules.length,
              })
              throw new Error('This practice test has no questions assigned yet.')
            }
            resolvedModuleIndex = firstNonEmptyModuleIndex
            moduleQuestions = allPracticeTestModules[resolvedModuleIndex] || []
            if (resolvedModuleIndex !== effectiveModuleIndex) {
              setCurrentModuleIndex(resolvedModuleIndex)
            }
          }

          setCurrentModuleQuestions(moduleQuestions)
          setSelectedAnswers(new Array(moduleQuestions.length).fill(-1))
          setIsLoading(false)
          return moduleQuestions
        }

        // Fetch all modules at once for fixed practice tests
        console.log(`🔍 Fetching fixed practice test: ${practiceTestId}`)

        // Fetch with timeout and retry
        const FETCH_TIMEOUT_MS = 30000
        let response: Response | null = null
        let lastFetchError: Error | null = null

        for (let attempt = 1; attempt <= 2; attempt++) {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
          try {
            response = await fetch(`/api/practice-tests/${practiceTestId}`, {
              signal: controller.signal,
            })
            clearTimeout(timeoutId)
            break
          } catch (fetchErr) {
            clearTimeout(timeoutId)
            lastFetchError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr))
            if (attempt < 2) {
              console.warn(`[useTestState] Fetch attempt ${attempt} failed, retrying...`, lastFetchError.message)
              await new Promise(r => setTimeout(r, 1000))
            }
          }
        }

        if (!response) {
          const isTimeout = lastFetchError?.name === 'AbortError'
          throw new Error(
            isTimeout
              ? 'Request timed out loading the practice test. Please check your connection and try again.'
              : `Failed to load practice test: ${lastFetchError?.message || 'Network error'}`
          )
        }

        if (!response.ok) {
          console.error('[useTestState] Failed fixed test fetch', {
            ...logContext,
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error(`Failed to fetch practice test: ${response.statusText}`)
        }

        const data = await response.json()
        if (!data.success || !data.test || !data.test.modules) {
          console.error('[useTestState] Invalid fixed test API response shape', {
            ...logContext,
            responseData: data,
          })
          throw new Error('Invalid practice test response')
        }

        // Cache all modules
        const modules = data.test.modules as Array<{ questions: Question[] }>
        const allModules = modules.map(m => m.questions)
        setAllPracticeTestModules(allModules)

        // Set current module questions, or jump to first non-empty module
        let resolvedModuleIndex = effectiveModuleIndex
        let moduleQuestions = allModules[resolvedModuleIndex] || []
        if (moduleQuestions.length === 0) {
          const firstNonEmptyModuleIndex = allModules.findIndex((questions) => (questions?.length || 0) > 0)
          if (firstNonEmptyModuleIndex === -1) {
            console.error('[useTestState] Fixed test API returned no populated modules', {
              ...logContext,
              moduleCount: allModules.length,
            })
            throw new Error('This practice test has no questions assigned yet.')
          }
          resolvedModuleIndex = firstNonEmptyModuleIndex
          moduleQuestions = allModules[resolvedModuleIndex] || []
          if (resolvedModuleIndex !== effectiveModuleIndex) {
            setCurrentModuleIndex(resolvedModuleIndex)
          }
        }

        setCurrentModuleQuestions(moduleQuestions)
        setSelectedAnswers(new Array(moduleQuestions.length).fill(-1))

        console.log(`✅ Loaded ${moduleQuestions.length} questions for module ${resolvedModuleIndex}`)
        return moduleQuestions
      }

      // Random test mode – fetch with server-side exclusion + client shuffle
      console.log(`🔍 Fetching ${limit} random questions for moduleType: ${moduleType}`)

      // Build URL with exclude param so API filters out already-used IDs
      const currentUsedIds = usedQuestionIdsRef.current
      let fetchUrl = `/api/questions?moduleType=${moduleType}&limit=${limit * 3}`
      if (currentUsedIds.length > 0) {
        fetchUrl += `&exclude=${encodeURIComponent(currentUsedIds.join(','))}`
      }

      const response = await fetch(fetchUrl, {
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) {
        console.error('[useTestState] Random question fetch failed', {
          ...logContext,
          moduleType,
          limit,
          status: response.status,
          statusText: response.statusText,
        })
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

      const availableQuestions = questions.filter((q: Question) => !currentUsedIds.includes(q.id))
      let questionsToUse = availableQuestions
      if (availableQuestions.length < limit) {
        console.log('⚠️ Not enough unused questions, allowing some repeats')
        questionsToUse = questions
      }

      // Shuffle to avoid deterministic ordering across modules
      for (let i = questionsToUse.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsToUse[i], questionsToUse[j]] = [questionsToUse[j], questionsToUse[i]]
      }

      const selectedQuestions = questionsToUse.slice(0, limit)
      const newUsedIds = [...currentUsedIds]
      selectedQuestions.forEach((q: Question) => {
        if (!newUsedIds.includes(q.id)) newUsedIds.push(q.id)
      })
      setUsedQuestionIds(newUsedIds)
      usedQuestionIdsRef.current = newUsedIds

      setCurrentModuleQuestions(selectedQuestions)
      setSelectedAnswers(new Array(selectedQuestions.length).fill(-1))

      console.log(`✅ Set ${selectedQuestions.length} questions for current module`)
      return selectedQuestions
    } catch (fetchError) {
      console.error('[useTestState] Error fetching questions', {
        ...logContext,
        moduleType,
        questionCount,
        currentModuleIndex,
        error: fetchError,
      })
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch questions')
      throw fetchError
    } finally {
      setIsLoading(false)
    }
  }, [practiceTestId, allPracticeTestModules, currentModuleIndex])

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
      setError(null)
      setTestStartTime(new Date())
      setCurrentModuleIndex(0)
      setCurrentQuestionIndex(0)

      const loadedQuestions = await fetchQuestions('reading-writing', 27)
      if (!loadedQuestions || loadedQuestions.length === 0) {
        throw new Error('No questions available for this practice test.')
      }

      setHasStarted(true)
      trackEvent('test', 'practice_test_started', { practiceTestId: practiceTestId || null })

      setIsTransitioning(false)
      setModuleStarted(false)
    } catch (startError) {
      console.error('[useTestState] Error starting test', {
        ...logContext,
        currentModuleIndex,
        error: startError,
      })
      setError(startError instanceof Error ? startError.message : 'Failed to start test')
      setHasStarted(false)
      setIsLoading(false)
    }
  }, [fetchQuestions, currentModuleIndex, logContext])

  const startModule = useCallback(() => {
    if (!currentModule) return

    if (currentModuleQuestions.length === 0) {
      console.error('[useTestState] Cannot start module with zero questions', {
        ...logContext,
        currentModuleIndex,
        moduleTitle: currentModule.title,
      })
      setError(`No questions are available for ${currentModule.title}.`)
      setModuleStarted(false)
      return
    }

    console.log('🚀 Starting module:', currentModule.title)
    setModuleStartTime(new Date())
    setModuleStarted(true)
    setIsTransitioning(false)
    setCurrentQuestionIndex(0)

    setTimeRemaining(currentModule.duration * 60)
    setQuestionStartTimes({})
    setQuestionTimeSpent({})

    console.log('✅ Module started successfully')
  }, [currentModule, currentModuleQuestions.length, currentModuleIndex, logContext])

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
    if (isCompletingRef.current) return
    isCompletingRef.current = true

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
      isCompletingRef.current = false
      return
    }

    if (currentModuleIndex < MODULE_CONFIGS.length - 1) {
      setCurrentModuleIndex(prev => prev + 1)
      setIsTransitioning(true)
      setModuleStarted(false)
      setCurrentModuleQuestions([])

      const nextModuleIdx = currentModuleIndex + 1
      const nextModule = MODULE_CONFIGS[nextModuleIdx]
      if (nextModule) {
        await fetchQuestions(nextModule.type, nextModule.questionCount, nextModuleIdx)
      }
      isCompletingRef.current = false
      return
    }

    // Last module completed: mark test as complete and prevent module start screen
    setModuleStarted(false)
    setIsTransitioning(true)
    setIsComplete(true)
    setCurrentModuleQuestions([])
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
    const difficultyPerformance: Record<string, { correct: number; total: number }> = {}
    const subtopicPerformance: Record<string, { correct: number; total: number }> = {}
    allResults.forEach(result => {
      if (!categoryPerformance[result.category]) {
        categoryPerformance[result.category] = { correct: 0, total: 0 }
      }
      categoryPerformance[result.category].total++
      if (result.isCorrect) {
        categoryPerformance[result.category].correct++
      }

      const diff = result.difficulty || 'medium'
      if (!difficultyPerformance[diff]) {
        difficultyPerformance[diff] = { correct: 0, total: 0 }
      }
      difficultyPerformance[diff].total++
      if (result.isCorrect) {
        difficultyPerformance[diff].correct++
      }

      const sub = (result as unknown as { subtopic?: string }).subtopic || result.category
      if (!subtopicPerformance[sub]) {
        subtopicPerformance[sub] = { correct: 0, total: 0 }
      }
      subtopicPerformance[sub].total++
      if (result.isCorrect) {
        subtopicPerformance[sub].correct++
      }
    })

    // SAT 400–1600 scoring
    const readingModules = finalModuleResults.slice(0, 2)
    const mathModules = finalModuleResults.slice(2, 4)
    const ebrwRaw = readingModules.flat().filter(r => r.isCorrect).length
    const ebrwTotal = readingModules.flat().length
    const mathRaw = mathModules.flat().filter(r => r.isCorrect).length
    const mathTotal = mathModules.flat().length
    const satScores = computeSATScores(ebrwRaw, ebrwTotal, mathRaw, mathTotal)

    const finalResults: TestResult = {
      id: `test-${Date.now()}`,
      userId,
      startTime: testStartTime,
      endTime,
      totalTimeSpent,
      totalQuestions,
      correctAnswers,
      score: Math.round((correctAnswers / totalQuestions) * 100),
      satScore: satScores.composite,
      ebrwScore: satScores.ebrw,
      mathScore: satScores.math,
      moduleResults: finalModuleResults,
      categoryPerformance,
      difficultyPerformance,
      subtopicPerformance,
      completedAt: endTime
    }

    setTestResults(finalResults)
    setIsComplete(true)

    try {
      // Epic #61: Include practiceTestId when saving test results
      const requestBody: Record<string, unknown> = { testResults: finalResults }
      if (practiceTestId) {
        requestBody.practiceTestId = practiceTestId
      }

      const response = await fetch('/api/test-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        console.error('Failed to save test results:', await response.text())
      } else {
        const data = await response.json()
        console.log('✅ Test results saved successfully:', data)
        trackEvent('test', 'practice_test_completed', {
          practiceTestId: practiceTestId || null,
          satScore: satScores.composite,
          ebrwScore: satScores.ebrw,
          mathScore: satScores.math,
          totalQuestions,
          correctAnswers,
          totalTimeSpent,
        })
      }
    } catch (saveError) {
      console.error('Error saving test results:', saveError)
    }
  }, [testStartTime, userId, practiceTestId])

  useEffect(() => {
    if (moduleStarted && timeRemaining > 0 && !isTransitioning && !isComplete) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    }

    if (moduleStarted && timeRemaining === 0 && !isComplete) {
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

  const abandonTest = useCallback(() => {
    setHasStarted(false)
    setModuleStarted(false)
    setCurrentModuleIndex(0)
    setCurrentQuestionIndex(0)
    setIsTransitioning(false)
    setIsComplete(false)
    setIsBreakTime(false)
    setBreakTimeRemaining(0)
    setShowReview(false)
    setTimeRemaining(0)
    setSelectedAnswers([])
    setModuleStartTime(null)
    setTestStartTime(null)
    setTestResults(null)
    setModuleResults([])
    setCurrentModuleQuestions([])
    setUsedQuestionIds([])
    usedQuestionIdsRef.current = []
    isCompletingRef.current = false
    setAllPracticeTestModules([])
    setQuestionStartTimes({})
    setQuestionTimeSpent({})
    setError(null)
  }, [])

  useEffect(() => {
    if (!isTransitioning || isBreakTime) return
    if (!currentModule || currentModuleQuestions.length > 0) return
    if (isLoading) return

    fetchQuestions(currentModule.type, currentModule.questionCount, currentModuleIndex)
  }, [isTransitioning, isBreakTime, currentModule, currentModuleIndex, currentModuleQuestions.length, isLoading, fetchQuestions])

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
    abandonTest,

    progress: currentModuleQuestions.length > 0
      ? Math.round(((currentQuestionIndex + 1) / currentModuleQuestions.length) * 100)
      : 0,
    questionsAnswered: selectedAnswers.filter(answer => answer !== -1).length,
    canGoNext: currentQuestionIndex < currentModuleQuestions.length - 1,
    canGoPrevious: currentQuestionIndex > 0,
    selectedAnswer: selectedAnswers[currentQuestionIndex] ?? -1
  }
}