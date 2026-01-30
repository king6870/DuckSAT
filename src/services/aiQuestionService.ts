// AI Question Generation Service using GPT-5 and Grok
import { getAllSubtopics, SATSubtopic } from '@/data/sat-topics'
import { prisma } from '@/lib/prisma'
import {
  buildMathQuestionsPrompt,
  buildReadingQuestionsPrompt,
  buildMathSubtopicPrompt,
  buildReadingSubtopicPrompt,
  buildEvaluationPrompt,
} from './questionPromptTemplates'
import {
  LLM_SETTINGS,
  SYSTEM_ROLES,
  QUALITY_THRESHOLDS,
  EVALUATION_CRITERIA,
} from './promptConfig'

// Type alias for enriched subtopics from getAllSubtopics
type EnrichedSubtopic = SATSubtopic & { topicId: string; topicName: string; moduleType: string }

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

export class AIQuestionService {
  private readonly GPT5_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview'
  private readonly GPT5_KEY = process.env.AZURE_OPENAI_API_KEY || ''
  private readonly GROK_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview'

  /**
   * Generate 10 SAT questions (5 math, 5 reading) using GPT-5
   */
  async generateQuestions(): Promise<GeneratedQuestion[]> {
    console.log('🤖 Generating questions with GPT-5...')
    
    try {
      const mathQuestions = await this.generateMathQuestions()
      const readingQuestions = await this.generateReadingQuestions()
      
      const allQuestions = [...mathQuestions, ...readingQuestions]
      
      // Evaluate all questions
      const evaluatedQuestions = await this.evaluateQuestions(allQuestions)
      
      // Generate images for math questions with charts
      const questionsWithImages = await this.generateImagesForQuestions(evaluatedQuestions)
      
      return questionsWithImages
    } catch (error) {
      console.error('Failed to generate questions:', error)
      throw error
    }
  }

  /**
   * Generate 5 math questions with charts/graphs
   */
  private async generateMathQuestions(): Promise<GeneratedQuestion[]> {
    const mathSubtopics = getAllSubtopics().filter(s => s.moduleType === 'math')
    const selectedSubtopics = this.selectRandomSubtopics(mathSubtopics, 5)

    const prompt = this.buildMathPrompt(selectedSubtopics)
    const response = await this.callGPT5(prompt)
    
    return this.parseMathQuestions(response, selectedSubtopics)
  }

  /**
   * Generate 5 reading questions with passages
   */
  private async generateReadingQuestions(): Promise<GeneratedQuestion[]> {
    const readingSubtopics = getAllSubtopics().filter(s => s.moduleType === 'reading-writing')
    const selectedSubtopics = this.selectRandomSubtopics(readingSubtopics, 5)

    const prompt = this.buildReadingPrompt(selectedSubtopics)
    const response = await this.callGPT5(prompt)
    
    return this.parseReadingQuestions(response, selectedSubtopics)
  }

  /**
   * Evaluate questions using Grok
   */
  async evaluateQuestions(questions: GeneratedQuestion[]): Promise<EvaluatedQuestion[]> {
    console.log('🔍 Evaluating questions with Grok...')
    
    const evaluatedQuestions: EvaluatedQuestion[] = []
    
    for (const question of questions) {
      try {
        const evaluation = await this.evaluateWithGrok(question)
        evaluatedQuestions.push({
          ...question,
          ...evaluation
        })
      } catch (error) {
        console.error('Failed to evaluate question:', error)
        // Add with default evaluation if Grok fails
        evaluatedQuestions.push({
          ...question,
          difficulty: 'medium',
          qualityScore: 75,
          isAccepted: true,
          evaluationFeedback: 'Fallback evaluation - evaluator unavailable'
        })
      }
    }
    
    return evaluatedQuestions
  }

  /**
   * Generate and store images for questions with chart descriptions
   */
  async generateImagesForQuestions(questions: EvaluatedQuestion[]): Promise<EvaluatedQuestion[]> {
    const { imageGenerationService } = await import('./imageGenerationService')
    
    const questionsWithImages = await Promise.all(
      questions.map(async (question) => {
        if (question.hasChart && question.chartDescription && question.moduleType === 'math') {
          try {
            console.log(`🎨 Generating image for ${question.graphType} chart...`)
            
            const chartConfig = {
              type: (question.graphType as 'coordinate-plane' | 'bar-chart' | 'scatter-plot' | 'box-plot' | 'geometric-diagram' | 'function-graph') || 'coordinate-plane',
              description: question.chartDescription,
              width: 600,
              height: 400
            }
            
            // Try DALL-E first, fallback to SVG
            let imageUrl = await imageGenerationService.generateChartImage(chartConfig)
            
            if (!imageUrl) {
              console.log('📊 DALL-E failed, generating SVG fallback...')
              imageUrl = await imageGenerationService.generateSVGChart(chartConfig)
            }
            
            if (imageUrl) {
              return {
                ...question,
                imageUrl,
                imageAlt: question.chartDescription
              }
            }
          } catch (error) {
            console.error('Image generation failed for question:', error)
          }
        }
        
        return question
      })
    )
    
    return questionsWithImages
  }

  /**
   * Generate questions with custom settings
   */
  async generateQuestionsWithSettings(settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): Promise<GeneratedQuestion[]> {
    console.log('🤖 Generating questions with custom settings...')

    try {
      const mathQuestions = await this.generateMathQuestionsWithSettings(settings)
      const readingQuestions = await this.generateReadingQuestionsWithSettings(settings)

      const allQuestions = [...mathQuestions, ...readingQuestions]

      // Generate images for math questions with charts if enabled
      if (settings.includeCharts) {
        const questionsWithImages = await this.generateImagesForQuestions(allQuestions as EvaluatedQuestion[])
        return questionsWithImages
      }

      return allQuestions
    } catch (error) {
      console.error('Failed to generate questions with settings:', error)
      throw error
    }
  }

  /**
   * Generate math questions with custom settings
   */
  private async generateMathQuestionsWithSettings(settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): Promise<GeneratedQuestion[]> {
    const mathSubtopics = getAllSubtopics().filter(s => s.moduleType === 'math')
    const selectedSubtopics = this.selectRandomSubtopics(mathSubtopics, settings.mathCount)

    const prompt = this.buildMathPromptWithSettings(selectedSubtopics, settings)
    const response = await this.callGPT5WithSettings(prompt, settings)

    return this.parseMathQuestions(response, selectedSubtopics)
  }

  /**
   * Generate reading questions with custom settings
   */
  private async generateReadingQuestionsWithSettings(settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): Promise<GeneratedQuestion[]> {
    const readingSubtopics = getAllSubtopics().filter(s => s.moduleType === 'reading-writing')
    const selectedSubtopics = this.selectRandomSubtopics(readingSubtopics, settings.readingCount)

    const prompt = this.buildReadingPromptWithSettings(selectedSubtopics, settings)
    const response = await this.callGPT5WithSettings(prompt, settings)

    return this.parseReadingQuestions(response, selectedSubtopics)
  }

  /**
   * Call GPT-5 with custom settings
   */
  private async callGPT5WithSettings(prompt: string, settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): Promise<string> {
    console.log(`Calling ${settings.llmModel} API with custom settings...`)

    try {
      const response = await fetch(this.GPT5_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.GPT5_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: SYSTEM_ROLES.QUESTION_GENERATOR
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens
        })
      })

      console.log(`${settings.llmModel} Response Status:`, response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`${settings.llmModel} API Error Response:`, errorText)
        throw new Error(`${settings.llmModel} API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`${settings.llmModel} Response Data:`, JSON.stringify(data, null, 2))

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error(`Invalid ${settings.llmModel} response structure`)
      }

      const content = data.choices[0].message.content
      console.log(`${settings.llmModel} Content Length:`, content.length)

      return content
    } catch (error) {
      console.error(`${settings.llmModel} API call failed:`, error)
      throw error
    }
  }

  /**
   * Build math questions prompt with settings
   */
  private buildMathPromptWithSettings(subtopics: EnrichedSubtopic[], settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): string {
    return buildMathQuestionsPrompt(subtopics as unknown as { name: string; topicName?: string; description?: string; difficultyDistribution?: { easy: number; medium: number; hard: number }; moduleType?: 'math' | 'reading-writing' }[], {
      includeCharts: settings.includeCharts,
      mathCount: settings.mathCount,
    })
  }

  /**
   * Build reading questions prompt with settings
   */
  private buildReadingPromptWithSettings(subtopics: EnrichedSubtopic[], settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): string {
    return buildReadingQuestionsPrompt(subtopics as unknown as { name: string; topicName?: string; description?: string; difficultyDistribution?: { easy: number; medium: number; hard: number }; moduleType?: 'math' | 'reading-writing' }[], {
      includePassages: settings.includePassages,
      readingCount: settings.readingCount,
    })
  }
  private async callGPT5(prompt: string): Promise<string> {
    console.log('Calling GPT-5 API...')
    
    try {
      const response = await fetch(this.GPT5_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.GPT5_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: SYSTEM_ROLES.QUESTION_GENERATOR
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: LLM_SETTINGS.DEFAULT_TEMPERATURE,
          max_tokens: LLM_SETTINGS.DEFAULT_MAX_TOKENS
        })
      })

      console.log('GPT-5 Response Status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GPT-5 API Error Response:', errorText)
        throw new Error(`GPT-5 API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('GPT-5 Response Data:', JSON.stringify(data, null, 2))
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid GPT-5 response structure')
      }
      
      const content = data.choices[0].message.content
      console.log('GPT-5 Content Length:', content.length)
      
      return content
    } catch (error) {
      console.error('GPT-5 API call failed:', error)
      throw error
    }
  }

  /**
   * Evaluate question with Grok (fixed API)
   */
  private async evaluateWithGrok(question: GeneratedQuestion): Promise<{
    difficulty: 'easy' | 'medium' | 'hard'
    qualityScore: number
    isAccepted: boolean
    evaluationFeedback: string
  }> {
    try {
      const prompt = this.buildEvaluationPromptForQuestion(question)
      
      const response = await fetch(this.GROK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.GPT5_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: SYSTEM_ROLES.EVALUATOR
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: LLM_SETTINGS.EVALUATION_TEMPERATURE,
          max_tokens: LLM_SETTINGS.EVALUATION_MAX_TOKENS
        })
      })

      if (response.ok) {
        const data = await response.json()
        return this.parseGrokEvaluation(data.choices[0].message.content)
      } else {
        throw new Error(`Grok API failed: ${response.status}`)
      }
    } catch (error) {
      console.log('Using fallback evaluation')
      return this.enhancedFallbackEvaluation(question)
    }
  }

  /**
   * Build math questions prompt
   */
  private buildMathPrompt(subtopics: EnrichedSubtopic[]): string {
    return buildMathQuestionsPrompt(subtopics as unknown as { name: string; topicName?: string; description?: string; difficultyDistribution?: { easy: number; medium: number; hard: number }; moduleType?: 'math' | 'reading-writing' }[], { includeCharts: true })
  }

  /**
   * Build reading questions prompt
   */
  private buildReadingPrompt(subtopics: EnrichedSubtopic[]): string {
    return buildReadingQuestionsPrompt(subtopics as unknown as { name: string; topicName?: string; description?: string; difficultyDistribution?: { easy: number; medium: number; hard: number }; moduleType?: 'math' | 'reading-writing' }[], { includePassages: true })
  }

  /**
   * Build evaluation prompt for Grok
   */
  private buildEvaluationPromptForQuestion(question: GeneratedQuestion): string {
    return buildEvaluationPrompt(question)
  }

  /**
   * Parse math questions from GPT-5 response
   */
  private parseMathQuestions(response: string, subtopics: EnrichedSubtopic[]): GeneratedQuestion[] {
    try {
      console.log('Raw GPT-5 math response:', response.substring(0, 200) + '...')
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanedResponse) as Array<Record<string, unknown>>
      return questions.map((q: Record<string, unknown>, index: number) => ({
        ...q,
        moduleType: 'math' as const,
        category: subtopics[index]?.topicName || 'Math',
        subtopic: subtopics[index]?.name || 'Unknown'
      })) as GeneratedQuestion[]
    } catch (error) {
      console.error('Failed to parse math questions:', error)
      console.error('Raw response:', response)
      return []
    }
  }

  /**
   * Parse reading questions from GPT-5 response
   */
  private parseReadingQuestions(response: string, subtopics: EnrichedSubtopic[]): GeneratedQuestion[] {
    try {
      console.log('Raw GPT-5 reading response:', response.substring(0, 200) + '...')
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanedResponse) as Array<Record<string, unknown>>
      return questions.map((q: Record<string, unknown>, index: number) => ({
        ...q,
        moduleType: 'reading-writing' as const,
        category: subtopics[index]?.topicName || 'Reading',
        subtopic: subtopics[index]?.name || 'Unknown'
      })) as GeneratedQuestion[]
    } catch (error) {
      console.error('Failed to parse reading questions:', error)
      console.error('Raw response:', response)
      return []
    }
  }

  /**
   * Parse Grok evaluation response
   */
  private parseGrokEvaluation(response: string): {
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
        evaluationFeedback: evaluation.evaluationFeedback || 'No feedback provided'
      }
    } catch (error) {
      console.error('Failed to parse Grok evaluation:', error)
      return {
        difficulty: 'medium',
        qualityScore: 0.5,
        isAccepted: true,
        evaluationFeedback: 'Evaluation parsing failed'
      }
    }
  }

  /**
   * Enhanced fallback evaluation when Grok is unavailable
   */
  private enhancedFallbackEvaluation(question: GeneratedQuestion): {
    difficulty: 'easy' | 'medium' | 'hard'
    qualityScore: number
    isAccepted: boolean
    evaluationFeedback: string
  } {
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
    let qualityScore: number = QUALITY_THRESHOLDS.BASE_QUALITY_SCORE
    let feedback = 'Evaluated using enhanced fallback logic: '

    // Difficulty assessment based on points and content
    if (question.points <= EVALUATION_CRITERIA.EASY_MAX_POINTS) {
      difficulty = 'easy'
      feedback += 'Low point value suggests easy difficulty. '
    } else if (question.points >= EVALUATION_CRITERIA.HARD_MIN_POINTS) {
      difficulty = 'hard'
      feedback += 'High point value suggests hard difficulty. '
    } else {
      difficulty = 'medium'
      feedback += 'Medium point value suggests moderate difficulty. '
    }

    // Quality assessment based on content
    const hasGoodExplanation = question.explanation.length > QUALITY_THRESHOLDS.MIN_EXPLANATION_LENGTH
    const hasProperOptions = question.options.length === QUALITY_THRESHOLDS.REQUIRED_OPTIONS_COUNT
    const hasReasonableQuestion = question.question.length > QUALITY_THRESHOLDS.MIN_QUESTION_LENGTH

    if (hasGoodExplanation && hasProperOptions && hasReasonableQuestion) {
      qualityScore = QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE
      feedback += 'Good structure and explanations. '
    } else {
      qualityScore = QUALITY_THRESHOLDS.ACCEPTANCE_THRESHOLD
      feedback += 'Basic structure but could be improved. '
    }

    // Math-specific checks
    if (question.moduleType === 'math') {
      if (question.hasChart && question.chartDescription) {
        qualityScore += EVALUATION_CRITERIA.QUALITY_BOOST_CHART
        feedback += 'Includes helpful chart description. '
      }
    }

    // Reading-specific checks
    if (question.moduleType === 'reading-writing') {
      if (question.passage && question.passage.length > QUALITY_THRESHOLDS.MIN_PASSAGE_LENGTH) {
        qualityScore += EVALUATION_CRITERIA.QUALITY_BOOST_PASSAGE
        feedback += 'Includes substantial passage. '
      }
    }

    // Cap quality score at max
    qualityScore = Math.min(qualityScore, EVALUATION_CRITERIA.MAX_QUALITY_SCORE)

    return {
      difficulty,
      qualityScore,
      isAccepted: qualityScore >= QUALITY_THRESHOLDS.ACCEPTANCE_THRESHOLD,
      evaluationFeedback: feedback + `Final quality score: ${(qualityScore * 100).toFixed(0)}%`
    }
  }

  /**
   * Generate and store questions in database
   */
  async generateAndStoreQuestions(): Promise<{
    generated: number
    evaluated: number
    accepted: number
    rejected: number
    stored: number
    storedQuestionIds: string[]
  }> {
    try {
      console.log('🤖 Generating questions with GPT-5...')
      
      // Generate questions
      const generatedQuestions = await this.generateQuestions()
      console.log(`✅ Generated ${generatedQuestions.length} questions`)
      
      // Evaluate questions
      const evaluatedQuestions = await this.evaluateQuestions(generatedQuestions)
      console.log(`🔍 Evaluated ${evaluatedQuestions.length} questions`)
      
      // Filter accepted questions
      const acceptedQuestions = evaluatedQuestions.filter(q => q.isAccepted)
      const rejectedQuestions = evaluatedQuestions.filter(q => !q.isAccepted)
      
      console.log(`✅ Accepted: ${acceptedQuestions.length}, ❌ Rejected: ${rejectedQuestions.length}`)
      
      // Store accepted questions in database
      const storedQuestionIds: string[] = []
      
      for (const question of acceptedQuestions) {
        try {
          // Find the subtopic in database
          const subtopic = await prisma.subtopic.findFirst({
            where: {
              name: {
                contains: question.subtopic,
                mode: 'insensitive'
              }
            }
          })

          // Check if this is a fallback evaluation
          const isFallbackEvaluation = question.evaluationFeedback?.includes('Fallback evaluation') || 
                                        question.evaluationFeedback?.includes('fallback logic')
          
          const reviewStatus = isFallbackEvaluation ? 'pending' : null
          const reviewComments = isFallbackEvaluation 
            ? '⚠️ Auto-generated question - Review needed. ' + question.evaluationFeedback
            : null

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
              wrongAnswerExplanations: undefined,
              imageUrl: undefined, // Will be set after image generation
              imageAlt: question.imageAlt || question.chartDescription || undefined,
              chartData: question.hasChart ? { 
                description: question.chartDescription,
                interactionType: question.interactionType,
                graphType: question.graphType,
                hasGeneratedImage: false // Will be updated after generation
              } : undefined,
              timeEstimate: question.points * 30, // 30 seconds per point
              source: 'AI Generated (GPT-5)',
              tags: [question.difficulty, question.category, question.subtopic],
              isActive: true,
              reviewStatus: reviewStatus,
              reviewComments: reviewComments
            }
          })

          storedQuestionIds.push(storedQuestion.id)

          // Generate and store image after question is created (for DB storage)
          if (question.hasChart && question.chartDescription && question.moduleType === 'math') {
            try {
              const { questionImageService } = await import('./questionImageService')
              const imageUrl = await questionImageService.generateAndStoreImage(
                storedQuestion.id,
                {
                  chartDescription: question.chartDescription,
                  graphType: question.graphType,
                  width: 600,
                  height: 400
                }
              )
              
              if (imageUrl) {
                // Update chartData to reflect successful image generation
                await prisma.question.update({
                  where: { id: storedQuestion.id },
                  data: {
                    chartData: {
                      description: question.chartDescription,
                      interactionType: question.interactionType,
                      graphType: question.graphType,
                      hasGeneratedImage: true
                    }
                  }
                })
              }
            } catch (error) {
              console.error(`Failed to generate image for question ${storedQuestion.id}:`, error)
            }
          }

          // Update subtopic count if linked
          if (subtopic) {
            await prisma.subtopic.update({
              where: { id: subtopic.id },
              data: {
                currentCount: {
                  increment: 1
                }
              }
            })
          }
        } catch (error) {
          console.error('Failed to store question:', error)
        }
      }

      return {
        generated: generatedQuestions.length,
        evaluated: evaluatedQuestions.length,
        accepted: acceptedQuestions.length,
        rejected: rejectedQuestions.length,
        stored: storedQuestionIds.length,
        storedQuestionIds
      }
    } catch (error) {
      console.error('Question generation and storage failed:', error)
      throw error
    }
  }

  /**
   * Generate questions for a specific subtopic
   */
  async generateQuestionsForSubtopic(
    subtopic: EnrichedSubtopic, 
    count: number
  ): Promise<{
    generated: number
    accepted: number
    rejected: number
    stored: number
  }> {
    console.log(`🎯 Generating ${count} questions for: ${subtopic.name}`)
    
    try {
      let prompt: string
      
      if (subtopic.moduleType === 'math') {
        prompt = this.buildMathPromptForSubtopic(subtopic, count)
      } else {
        prompt = this.buildReadingPromptForSubtopic(subtopic, count)
      }
      
      // Generate questions
      const response = await this.callGPT5(prompt)
      const generatedQuestions = this.parseQuestionsForSubtopic(response, subtopic)
      
      console.log(`✅ Generated ${generatedQuestions.length} questions`)
      
      // Evaluate questions
      const evaluatedQuestions = await this.evaluateQuestions(generatedQuestions)
      const acceptedQuestions = evaluatedQuestions.filter(q => q.isAccepted)
      const rejectedQuestions = evaluatedQuestions.filter(q => !q.isAccepted)
      
      console.log(`🔍 Accepted: ${acceptedQuestions.length}, Rejected: ${rejectedQuestions.length}`)
      
      // Store accepted questions
      let storedCount = 0
      for (const question of acceptedQuestions) {
        try {
          await prisma.question.create({
            data: {
              moduleType: question.moduleType,
              difficulty: question.difficulty,
              category: question.category,
              subtopic: question.subtopic,
              question: question.question,
              passage: question.passage || null,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              chartData: question.hasChart ? {
                description: question.chartDescription,
                interactionType: question.interactionType,
                graphType: question.graphType,
                type: question.graphType?.includes('coordinate') ? 'scatter' : 
                      question.graphType?.includes('statistics') ? 'bar' : 'line'
              } : undefined,
              timeEstimate: question.points * 30,
              source: 'AI Generated (GPT-5 + Grok)',
              tags: [question.difficulty, question.category, question.subtopic],
              isActive: true
            }
          })
          storedCount++
        } catch (error) {
          console.error('Failed to store question:', error)
        }
      }
      
      return {
        generated: generatedQuestions.length,
        accepted: acceptedQuestions.length,
        rejected: rejectedQuestions.length,
        stored: storedCount
      }
      
    } catch (error) {
      console.error(`Failed to generate questions for ${subtopic.name}:`, error)
      throw error
    }
  }

  /**
   * Build math prompt for specific subtopic
   */
  private buildMathPromptForSubtopic(subtopic: EnrichedSubtopic, count: number): string {
    return buildMathSubtopicPrompt(subtopic as unknown as { name: string; topicName?: string; description?: string; difficultyDistribution?: { easy: number; medium: number; hard: number }; moduleType?: 'math' | 'reading-writing' }, count)
  }

  /**
   * Build reading prompt for specific subtopic
   */
  private buildReadingPromptForSubtopic(subtopic: EnrichedSubtopic, count: number): string {
    return buildReadingSubtopicPrompt(subtopic as unknown as { name: string; topicName?: string; description?: string; difficultyDistribution?: { easy: number; medium: number; hard: number }; moduleType?: 'math' | 'reading-writing' }, count)
  }

  /**
   * Parse questions for specific subtopic
   */
  private parseQuestionsForSubtopic(response: string, subtopic: EnrichedSubtopic): GeneratedQuestion[] {
    try {
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanedResponse) as Array<Record<string, unknown>>
      return questions.map((q: Record<string, unknown>) => ({
        ...q,
        moduleType: subtopic.moduleType,
        category: subtopic.name,
        subtopic: subtopic.name
      })) as GeneratedQuestion[]
    } catch (error) {
      console.error('Failed to parse questions for subtopic:', error)
      return []
    }
  }

  /**
   * Select random subtopics
   */
  private selectRandomSubtopics(subtopics: EnrichedSubtopic[], count: number): EnrichedSubtopic[] {
    const shuffled = [...subtopics].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  async storeQuestion(question: GeneratedQuestion): Promise<void> {
    try {
      await prisma.question.create({
        data: {
          moduleType: question.moduleType,
          difficulty: 'medium',
          category: question.category,
          subtopic: question.subtopic || question.category,
          question: question.question,
          passage: question.passage || null,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          wrongAnswerExplanations: undefined,
          imageUrl: question.imageUrl || null,
          imageAlt: question.chartDescription || null,
          chartData: question.hasChart ? JSON.parse(JSON.stringify({
            description: question.chartDescription,
            interactionType: question.interactionType,
            graphType: question.graphType,
            hasGeneratedImage: !!question.imageUrl
          })) : null,
          timeEstimate: question.points * 30,
          source: 'ai-generated',
          tags: [question.category, question.subtopic],
          isActive: true
        }
      })
    } catch (error) {
      console.error('Error storing question:', error)
      throw error
    }
  }
}

export const aiQuestionService = new AIQuestionService()
