import { TestState, TestSession } from '@/types/test'
import { MODULE_CONFIGS } from '@/data/moduleConfigs'

export class TestStateManager {
  private static readonly STORAGE_KEY = 'ducksat_test_state'

  /**
   * Initialize a new test session
   */
  static initializeTestSession(userId: string): TestState {
    const sessionId = this.generateSessionId()
    const now = new Date()

    const session: TestSession = {
      id: sessionId,
      userId,
      startTime: now,
      modules: [],
      overallScore: 0,
      totalTimeSpent: 0,
      status: 'in-progress'
    }

    const initialState: TestState = {
      currentModule: 1,
      currentQuestion: 0,
      currentQuestionIndex: 0,
      moduleType: 'reading-writing',
      questions: [[], [], [], []],
      answers: [[], [], [], []],
      currentAnswers: [],
      timeRemaining: MODULE_CONFIGS[0].duration * 60,
      moduleStartTime: now,
      testStartTime: now,
      isTransitioning: false,
      completedModules: [],
      session,
      moduleStarted: false,
      progress: 0,
      questionsAnswered: 0,
      lastModulePerformance: null,
      modules: MODULE_CONFIGS,
      testSession: null
    }

    this.saveState(initialState)
    return initialState
  }

  /**
   * Save test state to local storage
   */
  static saveState(state: TestState): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          ...state,
          moduleStartTime: state.moduleStartTime.toISOString(),
          testStartTime: state.testStartTime.toISOString(),
          session: {
            ...state.session,
            startTime: state.session.startTime.toISOString(),
            endTime: state.session.endTime?.toISOString()
          }
        }))
      }
    } catch (error) {
      console.error('Failed to save test state:', error)
    }
  }

  /**
   * Load test state from local storage
   */
  static loadState(): TestState | null {
    try {
      if (typeof window === 'undefined') return null
      
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) return null

      const parsed = JSON.parse(saved)
      return {
        ...parsed,
        moduleStartTime: new Date(parsed.moduleStartTime),
        testStartTime: new Date(parsed.testStartTime),
        session: {
          ...parsed.session,
          startTime: new Date(parsed.session.startTime),
          endTime: parsed.session.endTime ? new Date(parsed.session.endTime) : undefined
        }
      }
    } catch (error) {
      console.error('Failed to load test state:', error)
      return null
    }
  }

  /**
   * Clear test state
   */
  static clearState(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY)
      }
    } catch (error) {
      console.error('Failed to clear test state:', error)
    }
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate test state structure
   */
  static validateState(state: unknown): state is TestState {
    if (!state || typeof state !== 'object') return false
    
    const s = state as Record<string, unknown>
    return (
      typeof s.currentModule === 'number' &&
      typeof s.currentQuestion === 'number' &&
      typeof s.currentQuestionIndex === 'number' &&
      Array.isArray(s.questions) &&
      Array.isArray(s.answers) &&
      s.session !== null &&
      typeof s.session === 'object' &&
      typeof (s.session as Record<string, unknown>).id === 'string'
    )
  }
}
