import { Question, ModulePerformance, DifficultyLevel, ModuleType } from '@/types/test'
import { QUESTION_POOLS } from '@/data/questionPools'

export class QuestionManager {
  private questionPools = QUESTION_POOLS

  /**
   * Generate questions for a specific module
   */
  generateModule(moduleId: number, previousPerformance?: ModulePerformance): Question[] {
    if (moduleId === 1) {
      // Module 1 Reading & Writing - fixed difficulty
      return this.shuffleQuestions([...this.questionPools.readingWriting.module1])
    } else if (moduleId === 2) {
      // Module 2 Reading & Writing - adaptive difficulty
      const difficulty = previousPerformance 
        ? this.getDifficultyLevel(previousPerformance)
        : 'medium'
      return this.getReadingWritingQuestions(difficulty)
    } else if (moduleId === 3) {
      // Module 3 Math - fixed difficulty
      return this.shuffleQuestions([...this.questionPools.math.module1])
    } else if (moduleId === 4) {
      // Module 4 Math - adaptive difficulty
      const difficulty = previousPerformance 
        ? this.getDifficultyLevel(previousPerformance)
        : 'medium'
      return this.getMathQuestions(difficulty)
    }
    
    throw new Error(`Invalid module ID: ${moduleId}`)
  }

  /**
   * Determine difficulty level based on performance
   */
  getDifficultyLevel(performance: ModulePerformance): DifficultyLevel {
    const scorePercentage = (performance.questionsCorrect / performance.totalQuestions) * 100
    
    if (scorePercentage >= 80) {
      return 'hard'
    } else if (scorePercentage >= 60) {
      return 'medium'
    } else {
      return 'easy'
    }
  }

  /**
   * Get Reading & Writing questions by difficulty
   */
  private getReadingWritingQuestions(difficulty: DifficultyLevel): Question[] {
    let questions: Question[]
    
    switch (difficulty) {
      case 'easy':
        questions = [...this.questionPools.readingWriting.module2Easy]
        break
      case 'medium':
        questions = [...this.questionPools.readingWriting.module2Medium]
        break
      case 'hard':
        questions = [...this.questionPools.readingWriting.module2Hard]
        break
      default:
        questions = [...this.questionPools.readingWriting.module2Medium]
    }
    
    return this.shuffleQuestions(questions)
  }

  /**
   * Get Math questions by difficulty
   */
  private getMathQuestions(difficulty: DifficultyLevel): Question[] {
    let questions: Question[]
    
    switch (difficulty) {
      case 'easy':
        questions = [...this.questionPools.math.module2Easy]
        break
      case 'medium':
        questions = [...this.questionPools.math.module2Medium]
        break
      case 'hard':
        questions = [...this.questionPools.math.module2Hard]
        break
      default:
        questions = [...this.questionPools.math.module2Medium]
    }
    
    return this.shuffleQuestions(questions)
  }

  /**
   * Shuffle questions array
   */
  shuffleQuestions(questions: Question[]): Question[] {
    const shuffled = [...questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Validate question pool integrity
   */
  validateQuestionPool(): boolean {
    try {
      // Check if all required pools exist
      const requiredPools = [
        this.questionPools.readingWriting.module1,
        this.questionPools.readingWriting.module2Easy,
        this.questionPools.readingWriting.module2Medium,
        this.questionPools.readingWriting.module2Hard,
        this.questionPools.math.module1,
        this.questionPools.math.module2Easy,
        this.questionPools.math.module2Medium,
        this.questionPools.math.module2Hard
      ]

      for (const pool of requiredPools) {
        if (!Array.isArray(pool) || pool.length === 0) {
          return false
        }

        // Validate each question in the pool
        for (const question of pool) {
          if (!this.validateQuestion(question)) {
            return false
          }
        }
      }

      // Check question counts
      if (this.questionPools.readingWriting.module1.length !== 27) return false
      if (this.questionPools.math.module1.length !== 22) return false

      return true
    } catch (error) {
      console.error('Question pool validation error:', error)
      return false
    }
  }

  /**
   * Validate individual question
   */
  private validateQuestion(question: Question): boolean {
    return (
      typeof question.id === 'string' &&
      question.id.length > 0 &&
      ['reading-writing', 'math'].includes(question.moduleType) &&
      ['easy', 'medium', 'hard'].includes(question.difficulty) &&
      typeof question.category === 'string' &&
      typeof question.question === 'string' &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      typeof question.correctAnswer === 'number' &&
      question.correctAnswer >= 0 &&
      question.correctAnswer < 4 &&
      typeof question.explanation === 'string' &&
      typeof question.timeEstimate === 'number' &&
      question.timeEstimate > 0
    )
  }

  /**
   * Get questions by category
   */
  getQuestionsByCategory(moduleType: ModuleType, category: string): Question[] {
    const allQuestions = moduleType === 'reading-writing' 
      ? [
          ...this.questionPools.readingWriting.module1,
          ...this.questionPools.readingWriting.module2Easy,
          ...this.questionPools.readingWriting.module2Medium,
          ...this.questionPools.readingWriting.module2Hard
        ]
      : [
          ...this.questionPools.math.module1,
          ...this.questionPools.math.module2Easy,
          ...this.questionPools.math.module2Medium,
          ...this.questionPools.math.module2Hard
        ]

    return allQuestions.filter(q => q.category === category)
  }

  /**
   * Get question statistics
   */
  getQuestionStats() {
    return {
      readingWriting: {
        module1: this.questionPools.readingWriting.module1.length,
        module2Easy: this.questionPools.readingWriting.module2Easy.length,
        module2Medium: this.questionPools.readingWriting.module2Medium.length,
        module2Hard: this.questionPools.readingWriting.module2Hard.length
      },
      math: {
        module1: this.questionPools.math.module1.length,
        module2Easy: this.questionPools.math.module2Easy.length,
        module2Medium: this.questionPools.math.module2Medium.length,
        module2Hard: this.questionPools.math.module2Hard.length
      }
    }
  }
}