// Type definitions for admin question generation

export interface Topic {
  id: string
  name: string
  moduleType: 'math' | 'reading-writing'
  description: string | null
  subtopics: Subtopic[]
}

export interface Subtopic {
  id: string
  name: string
  description: string | null
  targetQuestions: number
  currentCount: number
}

export interface GenerationSettings {
  llmModel: string
  questionCount: number
  mathCount: number
  readingCount: number
  temperature: number
  maxTokens: number
  includeCharts: boolean
  includePassages: boolean
  topicId?: string
  subtopicId?: string
  moduleType?: 'math' | 'reading-writing'
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface QuestionResult {
  question: string
  moduleType: 'math' | 'reading-writing'
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  subtopic: string
  qualityScore: number
  evaluationFeedback: string
  needsReview: boolean
  storedId: string | null
  options: string[]
  correctAnswer: number
  points: number
  passage?: string
  chartDescription?: string
  explanation: string
}

export interface GenerationSummary {
  generated: number
  evaluated: number
  accepted: number
  rejected: number
  stored: number
  needsReview: number
}

export interface QuestionResultStatus {
  id: string | null
  status: 'stored' | 'error' | 'rejected'
  needsReview: boolean
  evaluationFeedback: string
}

export interface GenerationResult {
  success: boolean
  summary?: GenerationSummary
  questionResults?: QuestionResultStatus[]
  questions?: {
    accepted: QuestionResult[]
    rejected: RejectedQuestion[]
  }
  error?: string
  details?: string
  stack?: string
}

export interface RejectedQuestion {
  question: string
  moduleType: 'math' | 'reading-writing'
  subtopic: string
  evaluationFeedback: string
}

export interface TopicsResponse {
  success: boolean
  topics: Topic[]
}

// Database question model interface
export interface QuestionModel {
  id: string
  subtopicId: string | null
  moduleType: 'math' | 'reading-writing'
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  subtopic: string
  question: string
  passage: string | null
  options: string[]
  correctAnswer: number
  explanation: string
  wrongAnswerExplanations: Record<string, string> | null
  imageUrl: string | null
  imageAlt: string | null
  chartData: ChartData | null
  timeEstimate: number
  source: string
  tags: string[]
  isActive: boolean
  reviewStatus: 'pending' | 'approved' | 'rejected' | null
  reviewComments: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ChartData {
  description?: string
  interactionType?: string
  graphType?: string
  hasGeneratedImage?: boolean
  [key: string]: unknown
}
