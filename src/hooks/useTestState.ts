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
  
  // Per-question time tracking - use Record instead of Map for JSON serializability
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({})
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({})

  // Get current module config
  const currentModule = useMemo(() => {
    if (currentModuleIndex >= MODULE_CONFIGS.length) return null
    return MODULE_CONFIGS[currentModuleIndex]
  }, [currentModuleIndex])

  // Get current question
  const currentQuestion = useMemo(() => {
    if (!currentModule || currentModuleQuestions.length === 0) return null
    
    if (currentQuestionIndex >= currentModuleQuestions.length) return null
    return currentModuleQuestions[currentQuestionIndex]
  }, [currentModule, currentModuleQuestions, currentQuestionIndex])

  // Fetch questions from database with no-repeat logic
  const fetchQuestions = useCallback(async (moduleType: string, questionCount?: number) => {
    try {
      setIsLoading(true)
      const limit = questionCount || (moduleType === 'math' ? 22 : 27)
      console.log(`🔍 Fetching ${limit} questions for moduleType: ${moduleType}`)
      
      // Get more questions than needed to filter out used ones
      const response = await fetch(`/api/questions?moduleType=${moduleType}&limit=${limit * 2}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`)
      }

      const data = await response.json()
      const questions = data.questions || data // Handle both {questions: [...]} and [...] formats
      console.log(`📝 Received ${questions.length || 0} questions from API`)
      
      if (!questions || questions.length === 0) {
        console.warn('⚠️ No questions available from API, returning empty array')
        setCurrentModuleQuestions([])
        setSelectedAnswers([])
        setIsLoading(false)
        return []
      }

      // Filter out already used questions
      const availableQuestions = questions.filter((q: Question) => !usedQuestionIds.includes(q.id))
      
      // If we don't have enough unused questions, reset the used set (allow repeats but minimize them)
      let questionsToUse = availableQuestions
      if (availableQuestions.length < limit) {
        console.log('⚠️ Not enough unused questions, allowing some repeats')
        questionsToUse = questions
        setUsedQuestionIds([]) // Reset used questions to allow repeats
      }

      // Select the required number of questions
      const selectedQuestions = questionsToUse.slice(0, limit)
      
      // Add selected question IDs to used set
      const newUsedIds = [...usedQuestionIds]
      selectedQuestions.forEach((q: Question) => {
        if (!newUsedIds.includes(q.id)) newUsedIds.push(q.id)
      })
      setUsedQuestionIds(newUsedIds)
      
      setCurrentModuleQuestions(selectedQuestions)
      setSelectedAnswers(new Array(selectedQuestions.length).fill(-1))
      
      console.log(`✅ Set ${selectedQuestions.length} questions for current module`)
      
    } catch (error) {
      console.error('❌ Error fetching questions:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [usedQuestionIds])

  // Auto-start module 1 (Reading Module 2) after 10 seconds
  useEffect(() => {
    if (isTransitioning && currentModuleIndex === 1 && !moduleStarted) {
      const timer = setTimeout(() => {
        startModule()
      }, 10000) // 10 seconds

      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning, currentModuleIndex, moduleStarted])

  // Auto-start module 2 (Math Module 1) after 10 seconds
  useEffect(() => {
    if (isTransitioning && currentModuleIndex === 2 && !moduleStarted) {
      const timer = setTimeout(() => {
        startModule()
      }, 10000) // 10 seconds

      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning, currentModuleIndex, moduleStarted])

  // Auto-start module 3 (Math Module 2) after 10 seconds
  useEffect(() => {
    if (isTransitioning && currentModuleIndex === 3 && !moduleStarted) {
      const timer = setTimeout(() => {
        startModule()
      }, 10000) // 10 seconds

      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning, currentModuleIndex, moduleStarted])

  // Start timing when a new question is displayed
  useEffect(() => {
    if (moduleStarted && !isTransitioning && currentQuestion) {
      setQuestionStartTimes(prev => {
        if (!(currentQuestionIndex in prev)) {
          return { ...prev, [currentQuestionIndex]: Date.now() }
        }
        return prev
      })
    }
  }, [moduleStarted, isTransitioning, currentQuestion, currentQuestionIndex])

  // Handle 10-minute break between reading and math
  useEffect(() => {
    if (isBreakTime && breakTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setBreakTimeRemaining(prev => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (isBreakTime && breakTimeRemaining === 0) {
      // Break is over, start math module
      setIsBreakTime(false)
      setIsTransitioning(true)
      setCurrentModuleIndex(2) // Math module
    }
  }, [isBreakTime, breakTimeRemaining])

  const startTest = useCallback(async () => {
    try {
      setIsLoading(true)
      setTestStartTime(new Date())
      setHasStarted(true)
      setCurrentModuleIndex(0)
      setCurrentQuestionIndex(0)

      // Start with reading-writing module
      await fetchQuestions('reading-writing', 27)

      setIsTransitioning(false)
      setModuleStarted(false)
    } catch (error) {
      console.error('Error starting test:', error)
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

    // Set timer for current module (convert minutes to seconds)
    setTimeRemaining(currentModule.duration * 60)
    
    // Reset time tracking for new module
    setQuestionStartTimes({})
    setQuestionTimeSpent({})

    console.log('✅ Module started successfully')
  }, [currentModule])

  // Track time spent on current question before navigating away
  const recordQuestionTime = useCallback(() => {
    const startTime = questionStartTimes[currentQuestionIndex]
    if (startTime) {
      const now = Date.now()
      const timeSpent = Math.floor((now - startTime) / 1000)
      const existingTime = questionTimeSpent[currentQuestionIndex] || 0
      setQuestionTimeSpent(prev => ({
        ...prev,
        [currentQuestionIndex]: existingTime + timeSpent
      }))
    }
  }, [currentQuestionIndex, questionStartTimes, questionTimeSpent])

  const completeModule = useCallback(async () => {
    if (!currentModule || !moduleStartTime) return

    const endTime = new Date()
    
    // Record time for current question before completing
    recordQuestionTime()
    
    // Calculate module results with actual time per question
    const moduleQuestionResults: QuestionResult[] = currentModuleQuestions.map((question, index) => ({
      questionId: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      moduleType: question.moduleType,
      userAnswer: selectedAnswers[index] || -1,
      correctAnswer: question.correctAnswer,
      isCorrect: selectedAnswers[index] === question.correctAnswer,
      timeSpent: questionTimeSpent[index] || 0, // Use actual tracked time
      options: question.options,
      explanation: question.explanation
    }))

    // Add to module results
    const newModuleResults = [...moduleResults]
    newModuleResults[currentModuleIndex] = moduleQuestionResults
    setModuleResults(newModuleResults)

    // Check if this is the end of reading modules (before math)
    if (currentModuleIndex === 1) {
      // Start 10-minute break
      setIsBreakTime(true)
      setBreakTimeRemaining(600) // 10 minutes = 600 seconds
      setModuleStarted(false)
      return
    }

    // Move to next module or complete test
    if (currentModuleIndex < MODULE_CONFIGS.length - 1) {
      setCurrentModuleIndex(prev => prev + 1)
      setIsTransitioning(true)
      setModuleStarted(false)
      setCurrentModuleQuestions([]) // Clear questions for next module
      
      // Fetch questions for next module
      const nextModule = MODULE_CONFIGS[currentModuleIndex + 1]
      if (nextModule) {
        await fetchQuestions(nextModule.type, nextModule.questionCount)
        // After questions are fetched, clear transition state so timer can start
        setIsTransitioning(true)
      }
    } else {
      // Test complete
      completeTest(newModuleResults)
    }
  }, [currentModule, moduleStartTime, currentModuleQuestions, selectedAnswers, moduleResults, currentModuleIndex, fetchQuestions, recordQuestionTime, questionTimeSpent])

  const completeTest = useCallback((finalModuleResults: QuestionResult[][]) => {
    if (!testStartTime) return

    const endTime = new Date()
    const totalTimeSpent = Math.floor((endTime.getTime() - testStartTime.getTime()) / 1000)
    
    // Calculate overall results
    const allResults = finalModuleResults.flat()
    const correctAnswers = allResults.filter(r => r.isCorrect).length
    const totalQuestions = allResults.length
    
    // Calculate category performance
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
  }, [testStartTime, userId])

  // Timer countdown effect
  useEffect(() => {
    if (moduleStarted && timeRemaining > 0 && !isTransitioning && !isComplete) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (moduleStarted && timeRemaining === 0) {
      // Time's up for this module
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
    if (isBreakTime) {
      setIsBreakTime(false)
      setBreakTimeRemaining(0)
      setIsTransitioning(true)
      setCurrentModuleIndex(2) // Math module
    }
  }, [isBreakTime])

  return {
    // State
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
    timeRemaining,
    selectedAnswers,
    testResults,
    currentModule,
    currentQuestion,
    currentModuleQuestions,
    showReview,
    
    // Actions
    startTest,
    startModule,
    completeModule,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    setShowReview,
    skipBreak,
    
    // Computed values
    progress: currentModuleQuestions.length > 0 ? 
      Math.round(((currentQuestionIndex + 1) / currentModuleQuestions.length) * 100) : 0,
    questionsAnswered: selectedAnswers.filter(answer => answer !== -1).length,
    canGoNext: currentQuestionIndex < currentModuleQuestions.length - 1,
    canGoPrevious: currentQuestionIndex > 0,
    selectedAnswer: selectedAnswers[currentQuestionIndex] ?? -1
  }
}
