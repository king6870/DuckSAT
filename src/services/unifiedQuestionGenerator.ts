/**
 * Unified Question Generation Service
 * 
 * This service consolidates all question generation logic into a single,
 * well-organized module with clear responsibilities:
 * 
 * 1. Question Generation (using GPT-5/Azure OpenAI)
 * 2. Question Evaluation (using Grok/evaluation logic)
 * 3. Image Generation (for math charts/graphs)
 * 4. Database Storage (persisting questions)
 * 
 * Usage:
 *   const generator = new UnifiedQuestionGenerator()
 *   const result = await generator.generateQuestions(options)
 */

import { getAllSubtopics, SATSubtopic } from '@/data/sat-topics'
import { prisma } from '@/lib/prisma'
import {
  buildMathQuestionsPrompt,
  buildReadingQuestionsPrompt,
  buildEvaluationPrompt,
} from './questionPromptTemplates'
import {
  LLM_SETTINGS,
  SYSTEM_ROLES,
  QUALITY_THRESHOLDS,
  EVALUATION_CRITERIA,
} from './promptConfig'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GeneratedQuestion {
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  points: number
  explanation: string
  moduleType: 'reading-writing' | 'math'
  category: string
  subtopic: string
  hasChart?: boolean
  chartDescription?: string
  imagePrompt?: string
  interactionType?: 'point-placement' | 'point-dragging' | 'line-drawing' | 'none'
  graphType?: 'coordinate-plane' | 'function-graph' | 'geometry-diagram' | 'statistics-chart' | 'unit-circle'
  imageUrl?: string
}

export interface EvaluatedQuestion extends GeneratedQuestion {
  difficulty: 'easy' | 'medium' | 'hard'
  qualityScore: number
  isAccepted: boolean
  evaluationFeedback: string
  imageAlt?: string
}

export interface GenerationOptions {
  // Question counts
  mathCount?: number
  readingCount?: number
  
  // Filtering options
  moduleType?: 'math' | 'reading-writing'
  difficulty?: 'easy' | 'medium' | 'hard'
  topicId?: string
  subtopicId?: string
  
  // AI settings
  temperature?: number
  maxTokens?: number
  
  // Feature flags
  includeCharts?: boolean
  includePassages?: boolean
  
  // Storage options
  storeInDatabase?: boolean
  skipEvaluation?: boolean
}

export interface GenerationResult {
  summary: {
    generated: number
    evaluated: number
    accepted: number
    rejected: number
    stored: number
    needsReview: number
  }
  questions: {
    accepted: EvaluatedQuestion[]
    rejected: EvaluatedQuestion[]
  }
  storedQuestionIds?: string[]
}

type EnrichedSubtopic = SATSubtopic & { topicId: string; topicName: string; moduleType: 'math' | 'reading-writing' }

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class UnifiedQuestionGenerator {
  private readonly GPT5_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview'
  private readonly GPT5_KEY = process.env.AZURE_OPENAI_API_KEY || ''
  private readonly GROK_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview'

  /**
   * Main entry point for generating questions
   */
  async generateQuestions(options: GenerationOptions = {}): Promise<GenerationResult> {
    const {
      mathCount = 5,
      readingCount = 5,
      temperature = LLM_SETTINGS.DEFAULT_TEMPERATURE,
      maxTokens = LLM_SETTINGS.DEFAULT_MAX_TOKENS,
      includeCharts = true,
      includePassages = true,
      storeInDatabase = false,
      skipEvaluation = false,
    } = options

    console.log('🚀 Starting unified question generation...')
    console.log(`   Math: ${mathCount}, Reading: ${readingCount}`)

    try {
      // Step 1: Generate questions
      const generatedQuestions = await this.generateRawQuestions({
        mathCount,
        readingCount,
        temperature,
        maxTokens,
        includeCharts,
        includePassages,
        ...options,
      })

      console.log(`✅ Generated ${generatedQuestions.length} questions`)

      // Step 2: Evaluate questions (unless skipped)
      let evaluatedQuestions: EvaluatedQuestion[]
      if (skipEvaluation) {
        evaluatedQuestions = generatedQuestions.map(q => ({
          ...q,
          difficulty: 'medium' as const,
          qualityScore: QUALITY_THRESHOLDS.BASE_QUALITY_SCORE,
          isAccepted: true,
          evaluationFeedback: 'Evaluation skipped',
        }))
      } else {
        evaluatedQuestions = await this.evaluateQuestions(generatedQuestions)
      }

      console.log(`🔍 Evaluated ${evaluatedQuestions.length} questions`)

      // Step 3: Filter accepted/rejected
      const acceptedQuestions = evaluatedQuestions.filter(q => q.isAccepted)
      const rejectedQuestions = evaluatedQuestions.filter(q => !q.isAccepted)

      console.log(`✅ Accepted: ${acceptedQuestions.length}, ❌ Rejected: ${rejectedQuestions.length}`)

      // Step 4: Store in database (if requested)
      let storedQuestionIds: string[] = []
      let needsReview = 0

      if (storeInDatabase && acceptedQuestions.length > 0) {
        const storeResult = await this.storeQuestions(acceptedQuestions, options)
        storedQuestionIds = storeResult.storedIds
        needsReview = storeResult.needsReview
        console.log(`💾 Stored ${storedQuestionIds.length} questions in database`)
      }

      return {
        summary: {
          generated: generatedQuestions.length,
          evaluated: evaluatedQuestions.length,
          accepted: acceptedQuestions.length,
          rejected: rejectedQuestions.length,
          stored: storedQuestionIds.length,
          needsReview,
        },
        questions: {
          accepted: acceptedQuestions,
          rejected: rejectedQuestions,
        },
        storedQuestionIds,
      }
    } catch (error) {
      console.error('❌ Question generation failed:', error)
      throw error
    }
  }

  // ==========================================================================
  // GENERATION METHODS
  // ==========================================================================

  /**
   * Generate raw questions from GPT-5
   */
  private async generateRawQuestions(options: GenerationOptions & {
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): Promise<GeneratedQuestion[]> {
    const mathQuestions = options.mathCount > 0
      ? await this.generateMathQuestions(options)
      : []

    const readingQuestions = options.readingCount > 0
      ? await this.generateReadingQuestions(options)
      : []

    return [...mathQuestions, ...readingQuestions]
  }

  /**
   * Generate math questions
   */
  private async generateMathQuestions(options: GenerationOptions & {
    mathCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
  }): Promise<GeneratedQuestion[]> {
    const mathSubtopics = await this.getSubtopics('math', options)
    const selectedSubtopics = this.selectRandomSubtopics(mathSubtopics, options.mathCount)

    const prompt = buildMathQuestionsPrompt(selectedSubtopics, {
      includeCharts: options.includeCharts,
      mathCount: options.mathCount,
    })

    const response = await this.callLLM(prompt, options.temperature, options.maxTokens)
    return this.parseQuestions(response, selectedSubtopics, 'math')
  }

  /**
   * Generate reading questions
   */
  private async generateReadingQuestions(options: GenerationOptions & {
    readingCount: number
    temperature: number
    maxTokens: number
    includePassages: boolean
  }): Promise<GeneratedQuestion[]> {
    const readingSubtopics = await this.getSubtopics('reading-writing', options)
    const selectedSubtopics = this.selectRandomSubtopics(readingSubtopics, options.readingCount)

    const prompt = buildReadingQuestionsPrompt(selectedSubtopics, {
      includePassages: options.includePassages,
      readingCount: options.readingCount,
    })

    const response = await this.callLLM(prompt, options.temperature, options.maxTokens)
    return this.parseQuestions(response, selectedSubtopics, 'reading-writing')
  }

  // ==========================================================================
  // EVALUATION METHODS
  // ==========================================================================

  /**
   * Evaluate all questions for quality and difficulty
   */
  private async evaluateQuestions(questions: GeneratedQuestion[]): Promise<EvaluatedQuestion[]> {
    console.log('🔍 Evaluating questions...')

    const evaluatedQuestions: EvaluatedQuestion[] = []

    for (const question of questions) {
      try {
        const evaluation = await this.evaluateQuestion(question)
        evaluatedQuestions.push({
          ...question,
          ...evaluation,
        })
      } catch (error) {
        console.error('Failed to evaluate question:', error)
        // Use fallback evaluation
        evaluatedQuestions.push({
          ...question,
          ...this.fallbackEvaluation(question),
        })
      }
    }

    return evaluatedQuestions
  }

  /**
   * Evaluate a single question using Grok
   */
  private async evaluateQuestion(question: GeneratedQuestion): Promise<{
    difficulty: 'easy' | 'medium' | 'hard'
    qualityScore: number
    isAccepted: boolean
    evaluationFeedback: string
  }> {
    try {
      const prompt = buildEvaluationPrompt(question)

      const response = await this.callLLM(
        prompt,
        LLM_SETTINGS.EVALUATION_TEMPERATURE,
        LLM_SETTINGS.EVALUATION_MAX_TOKENS,
        SYSTEM_ROLES.EVALUATOR
      )

      return this.parseEvaluation(response)
    } catch {
      console.log('Grok evaluation failed, using fallback')
      return this.fallbackEvaluation(question)
    }
  }

  /**
   * Fallback evaluation when Grok is unavailable
   */
  private fallbackEvaluation(question: GeneratedQuestion): {
    difficulty: 'easy' | 'medium' | 'hard'
    qualityScore: number
    isAccepted: boolean
    evaluationFeedback: string
  } {
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
    let qualityScore: number = QUALITY_THRESHOLDS.BASE_QUALITY_SCORE
    let feedback = 'Fallback evaluation: '

    // Difficulty based on points
    if (question.points <= EVALUATION_CRITERIA.EASY_MAX_POINTS) {
      difficulty = 'easy'
      feedback += 'Low complexity. '
    } else if (question.points >= EVALUATION_CRITERIA.HARD_MIN_POINTS) {
      difficulty = 'hard'
      feedback += 'High complexity. '
    }

    // Quality checks
    const hasGoodExplanation = question.explanation.length > QUALITY_THRESHOLDS.MIN_EXPLANATION_LENGTH
    const hasProperOptions = question.options.length === QUALITY_THRESHOLDS.REQUIRED_OPTIONS_COUNT
    const hasReasonableQuestion = question.question.length > QUALITY_THRESHOLDS.MIN_QUESTION_LENGTH

    if (hasGoodExplanation && hasProperOptions && hasReasonableQuestion) {
      qualityScore = Number(QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE)
      feedback += 'Good structure. '
    }

    // Module-specific bonuses
    if (question.moduleType === 'math' && question.hasChart && question.chartDescription) {
      qualityScore += Number(EVALUATION_CRITERIA.QUALITY_BOOST_CHART)
      feedback += 'Includes chart. '
    }

    if (question.moduleType === 'reading-writing' && question.passage && 
        question.passage.length > QUALITY_THRESHOLDS.MIN_PASSAGE_LENGTH) {
      qualityScore += Number(EVALUATION_CRITERIA.QUALITY_BOOST_PASSAGE)
      feedback += 'Includes passage. '
    }

    qualityScore = Math.min(qualityScore, Number(EVALUATION_CRITERIA.MAX_QUALITY_SCORE))

    return {
      difficulty,
      qualityScore,
      isAccepted: qualityScore >= QUALITY_THRESHOLDS.ACCEPTANCE_THRESHOLD,
      evaluationFeedback: feedback + `Quality: ${(qualityScore * 100).toFixed(0)}%`,
    }
  }

  // ==========================================================================
  // STORAGE METHODS
  // ==========================================================================

  /**
   * Store accepted questions in database
   */
  private async storeQuestions(
    questions: EvaluatedQuestion[],
    options: GenerationOptions
  ): Promise<{ storedIds: string[]; needsReview: number }> {
    const storedIds: string[] = []
    let needsReview = 0

    for (const question of questions) {
      try {
        const subtopic = await this.findSubtopic(question.subtopic, options.subtopicId)

        const isFallbackEvaluation = question.evaluationFeedback?.includes('Fallback evaluation')
        const reviewStatus = isFallbackEvaluation ? 'pending' : null
        const reviewComments = isFallbackEvaluation
          ? '⚠️ Auto-generated - Review needed. ' + question.evaluationFeedback
          : null

        if (isFallbackEvaluation) needsReview++

        const storedQuestion = await prisma.question.create({
          data: {
            subtopicId: subtopic?.id || null,
            moduleType: question.moduleType,
            difficulty: question.difficulty,
            category: question.category,
            subtopic: question.subtopic,
            question: question.question,
            passage: question.passage || null,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            imageUrl: question.imageUrl || undefined,
            imageAlt: question.imageAlt || question.chartDescription || undefined,
            chartData: question.hasChart ? {
              description: question.chartDescription,
              interactionType: question.interactionType,
              graphType: question.graphType,
            } : undefined,
            timeEstimate: question.points * 30, // 30 seconds per point
            source: 'AI Generated (Unified)',
            tags: [question.difficulty, question.category, question.subtopic],
            isActive: true,
            reviewStatus,
            reviewComments,
          },
        })

        storedIds.push(storedQuestion.id)

        // Update subtopic count
        if (subtopic) {
          await prisma.subtopic.update({
            where: { id: subtopic.id },
            data: { currentCount: { increment: 1 } },
          })
        }

        // Generate image if diagram description exists (guaranteed for forcediagram)
        if (question.chartDescription && question.moduleType === 'math') {
          try {
            const imageUrl = await this.generateAndStoreImage(storedQuestion.id, question)
            if (imageUrl) {
              await prisma.question.update({
                where: { id: storedQuestion.id },
                data: { imageUrl }
              })
            } else {
              console.error(`Image generation returned no URL for question ${storedQuestion.id}`)
            }
          } catch (error) {
            console.error(`Failed to generate image for question ${storedQuestion.id}:`, error)
          }
        }
      } catch (error) {
        console.error('Failed to store question:', error)
      }
    }

    return { storedIds, needsReview }
  }

  /**
   * Generate and store image for a question
   */
  private async generateAndStoreImage(questionId: string, question: EvaluatedQuestion): Promise<void> {
    try {
      const { questionImageService } = await import('./questionImageService');
      const imageUrl = await questionImageService.generateAndStoreImage(questionId, {
        chartDescription: question.chartDescription!,
        graphType: question.graphType,
        width: 600,
        height: 400,
      });

      await prisma.question.update({
        where: { id: questionId },
        data: {
          chartData: {
            description: question.chartDescription,
            interactionType: question.interactionType,
            graphType: question.graphType,
            hasGeneratedImage: !!imageUrl,
          },
          imageUrl: imageUrl || '/assets/diagram-placeholder.svg',
        },
      });
    } catch (error) {
      console.error('Image generation failed:', error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Call LLM (GPT-5 or Grok)
   */
  private async callLLM(
    prompt: string,
    temperature: number,
    maxTokens: number,
    systemRole: string = SYSTEM_ROLES.QUESTION_GENERATOR
  ): Promise<string> {
    const response = await fetch(this.GPT5_ENDPOINT, {
      method: 'POST',
      try {
        const { questionImageService } = await import('./questionImageService')
        const imageUrl = await questionImageService.generateAndStoreImage(questionId, {
          chartDescription: question.chartDescription!,
          graphType: question.graphType,
          width: 600,
          height: 400,
        })

        await prisma.question.update({
          where: { id: questionId },
          data: {
            chartData: {
              description: question.chartDescription,
              interactionType: question.interactionType,
              graphType: question.graphType,
              hasGeneratedImage: !!imageUrl,
            },
          },
        })
        return imageUrl;
      } catch (error) {
        console.error('Error in generateAndStoreImage:', error)
        return null;
      }

    return data.choices[0].message.content
  }

  /**
   * Parse questions from LLM response
   */
  private parseQuestions(
    response: string,
    subtopics: EnrichedSubtopic[],
    moduleType: 'math' | 'reading-writing'
  ): GeneratedQuestion[] {
    try {
      // Clean response (remove markdown code blocks)
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const questions = JSON.parse(cleanedResponse) as Array<Record<string, unknown>>
      return questions.map((q: Record<string, unknown>, index: number) => ({
        ...q,
        moduleType,
        category: subtopics[index]?.topicName || (moduleType === 'math' ? 'Math' : 'Reading'),
        subtopic: subtopics[index]?.name || 'Unknown',
      })) as GeneratedQuestion[]
    } catch (error) {
      console.error('Failed to parse questions:', error)
      return []
    }
  }

  /**
   * Parse evaluation response
   */
  private parseEvaluation(response: string): {
    difficulty: 'easy' | 'medium' | 'hard'
    qualityScore: number
    isAccepted: boolean
    evaluationFeedback: string
  } {
    try {
      const evaluation = JSON.parse(response)
      return {
        difficulty: evaluation.difficulty || 'medium',
        qualityScore: evaluation.qualityScore || 0.5,
        isAccepted: evaluation.isAccepted !== false,
        evaluationFeedback: evaluation.evaluationFeedback || 'No feedback',
      }
    } catch {
      return {
        difficulty: 'medium',
        qualityScore: 0.5,
        isAccepted: true,
        evaluationFeedback: 'Parsing failed',
      }
    }
  }

  /**
   * Get subtopics based on filters
   */
  private async getSubtopics(
    moduleType: 'math' | 'reading-writing',
    options: GenerationOptions
  ): Promise<EnrichedSubtopic[]> {
    let subtopics = getAllSubtopics().filter(s => s.moduleType === moduleType)

    if (options.subtopicId) {
      const subtopic = await prisma.subtopic.findUnique({ where: { id: options.subtopicId } })
      if (subtopic) {
        subtopics = subtopics.filter(s => s.name === subtopic.name)
      }
    } else if (options.topicId) {
      subtopics = subtopics.filter(s => s.topicId === options.topicId)
    }

    return subtopics
  }

  /**
   * Select random subtopics
   */
  private selectRandomSubtopics(subtopics: EnrichedSubtopic[], count: number): EnrichedSubtopic[] {
    const shuffled = [...subtopics].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  /**
   * Find subtopic in database
   */
  private async findSubtopic(subtopicName: string, subtopicId?: string) {
    if (subtopicId) {
      return await prisma.subtopic.findUnique({ where: { id: subtopicId } })
    }

    return await prisma.subtopic.findFirst({
      where: {
        name: {
          contains: subtopicName,
          mode: 'insensitive',
        },
      },
    })
  }
}

// Export singleton instance
export const unifiedQuestionGenerator = new UnifiedQuestionGenerator()
