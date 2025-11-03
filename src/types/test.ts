// Core Test Types
export interface Question {
  id: string
  moduleType: 'reading-writing' | 'math'
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  explanation: string
  timeEstimate: number // seconds
  chartData?: any // Chart/diagram data
  imageUrl?: string
  imageAlt?: string
}

export interface Answer {
  questionId: string
  selectedAnswer: number
  timeSpent: number
  isCorrect: boolean
}

// New detailed question result for analytics
export interface QuestionResult {
  questionId: string
  question: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  moduleType: 'reading-writing' | 'math'
  userAnswer: number
  correctAnswer: number
  isCorrect: boolean
  timeSpent: number
  options: string[]
  explanation: string
}

// New comprehensive test result
export interface TestResult {
  id: string
  userId: string
  startTime: Date
  endTime: Date
  totalTimeSpent: number // seconds
  totalQuestions: number
  correctAnswers: number
  score: number // percentage
  moduleResults: QuestionResult[][] // results for each module
  categoryPerformance: Record<string, { correct: number; total: number }>
  subtopicPerformance?: Record<string, { correct: number; total: number }>
  difficultyPerformance?: Record<string, { correct: number; total: number }>
  completedAt: Date
}

export interface ModuleConfig {
  id: number
  type: 'reading-writing' | 'math'
  duration: number // minutes
  questionCount: number
  title: string
  description: string
  icon?: string
  color?: string
}

export interface ModulePerformance {
  score: number
  timeUsed: number
  questionsCorrect: number
  totalQuestions: number
  strongAreas: string[]
  weakAreas: string[]
  averageTimePerQuestion: number
}

export interface ModuleResult {
  moduleId: number
  moduleType: string
  score: number
  timeSpent: number
  answers: Answer[]
  performance: ModulePerformance
  completedAt: Date
}

export interface TestSession {
  id: string
  userId: string
  startTime: Date
  endTime?: Date
  modules: ModuleResult[]
  overallScore: number
  totalTimeSpent: number
  status: 'in-progress' | 'completed' | 'abandoned'
}

export interface TestState {
  currentModule: number // 1-4
  currentQuestion: number
  currentQuestionIndex: number
  moduleType: 'reading-writing' | 'math'
  questions: Question[][]
  answers: Answer[][]
  currentAnswers: Answer[]
  timeRemaining: number
  moduleStartTime: Date
  testStartTime: Date
  isTransitioning: boolean
  completedModules: number[]
  session: TestSession
  moduleStarted: boolean
  progress: number
  questionsAnswered: number
  lastModulePerformance: ModulePerformance | null
  modules: ModuleConfig[]
  testSession: TestSession | null
}

export interface QuestionPool {
  readingWriting: {
    module1: Question[]
    module2Easy: Question[]
    module2Medium: Question[]
    module2Hard: Question[]
  }
  math: {
    module1: Question[]
    module2Easy: Question[]
    module2Medium: Question[]
    module2Hard: Question[]
  }
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type ModuleType = 'reading-writing' | 'math'
