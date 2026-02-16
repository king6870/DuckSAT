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
  private getApiKey(): string {
    return process.env.AZURE_OPENAI_API_KEY || ''
  }

  private getChatEndpoint(): string {
    const directUrl = process.env.ENDPOINT_URL
    if (directUrl) return directUrl

    const base = process.env.AZURE_OPENAI_ENDPOINT
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.DEPLOYMENT_NAME || 'gpt-4o'
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.env.API_VERSION || '2025-01-01-preview'

    if (!base) return ''
    return `${base.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  }

  private getGrokEndpoint(): string {
    return process.env.GROK_ENDPOINT || this.getChatEndpoint()
  }

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
   * Evaluate questions using Grok with automatic retry for low-quality questions
   */
  async evaluateQuestions(questions: GeneratedQuestion[], maxRetries: number = QUALITY_THRESHOLDS.MAX_REGENERATION_ATTEMPTS): Promise<EvaluatedQuestion[]> {
    console.log(`🔍 Evaluating questions with Grok (max ${maxRetries} retries for quality ≤${(QUALITY_THRESHOLDS.REGENERATION_THRESHOLD * 100).toFixed(0)}%)...`)
    
    const evaluatedQuestions: EvaluatedQuestion[] = []
    
    for (const question of questions) {
      const evaluatedQuestion = await this.evaluateQuestionWithRetry(question, maxRetries)
      evaluatedQuestions.push(evaluatedQuestion)
    }
    
    return evaluatedQuestions
  }

  /**
   * Evaluate a single question with automatic regeneration for quality scores ≤REGENERATION_THRESHOLD
   */
  private async evaluateQuestionWithRetry(
    question: GeneratedQuestion,
    maxRetries: number = QUALITY_THRESHOLDS.MAX_REGENERATION_ATTEMPTS
  ): Promise<EvaluatedQuestion> {
    let currentQuestion = question
    let attempts = 0
    const qualityThreshold = QUALITY_THRESHOLDS.REGENERATION_THRESHOLD
    
    while (attempts < maxRetries) {
      attempts++
      
      try {
        // Evaluate current question
        const evaluation = await this.evaluateWithGrok(currentQuestion)
        
        // Check quality score (convert from 0-100 scale to 0-1 if needed)
        const normalizedScore = evaluation.qualityScore > 1 
          ? evaluation.qualityScore / 100 
          : evaluation.qualityScore
        
        console.log(`📊 Question attempt ${attempts}: Quality = ${(normalizedScore * 100).toFixed(0)}%`)
        
        // If quality is acceptable, return this question
        if (normalizedScore > qualityThreshold) {
          console.log(`✅ Quality acceptable (>${(qualityThreshold * 100).toFixed(0)}%), accepting question`)
          return {
            ...currentQuestion,
            ...evaluation,
            qualityScore: normalizedScore
          }
        }
        
        // Quality too low, regenerate if retries remain
        if (attempts < maxRetries) {
          console.log(`🔄 Quality too low (≤${(qualityThreshold * 100).toFixed(0)}%), regenerating... (attempt ${attempts + 1}/${maxRetries})`)
          currentQuestion = await this.regenerateSingleQuestion(currentQuestion)
        } else {
          console.log(`⚠️ Max retries reached (${maxRetries}), accepting last attempt with quality ${(normalizedScore * 100).toFixed(0)}%`)
          return {
            ...currentQuestion,
            ...evaluation,
            qualityScore: normalizedScore,
            evaluationFeedback: `${evaluation.evaluationFeedback} (Max retries reached after ${attempts} attempts)`
          }
        }
        
      } catch (error) {
        console.error(`Failed to evaluate question (attempt ${attempts}):`, error)
        
        // If this is the last attempt or regeneration fails, use fallback
        if (attempts >= maxRetries) {
          return {
            ...currentQuestion,
            difficulty: 'medium',
            qualityScore: 0.75,
            isAccepted: true,
            evaluationFeedback: `Fallback evaluation after ${attempts} attempts - evaluator unavailable`
          }
        }
        
        // Try regenerating for next attempt
        try {
          currentQuestion = await this.regenerateSingleQuestion(currentQuestion)
        } catch (regenError) {
          // If regeneration fails, return with fallback evaluation
          return {
            ...currentQuestion,
            difficulty: 'medium',
            qualityScore: 0.75,
            isAccepted: true,
            evaluationFeedback: 'Fallback evaluation - regeneration failed'
          }
        }
      }
    }
    
    // Fallback return (shouldn't reach here)
    return {
      ...currentQuestion,
      difficulty: 'medium',
      qualityScore: 0.75,
      isAccepted: true,
      evaluationFeedback: `Accepted after ${attempts} attempts`
    }
  }

  /**
   * Regenerate a single question using the same parameters
   */
  private async regenerateSingleQuestion(question: GeneratedQuestion): Promise<GeneratedQuestion> {
    console.log(`🔄 Regenerating ${question.moduleType} question for ${question.subtopic}...`)
    
    const subtopic = getAllSubtopics().find(s => 
      s.name.toLowerCase() === question.subtopic.toLowerCase() &&
      s.moduleType === question.moduleType
    )
    
    if (!subtopic) {
      throw new Error(`Subtopic not found: ${question.subtopic}`)
    }
    
    let prompt: string
    
    if (question.moduleType === 'math') {
      prompt = this.buildMathPrompt([subtopic])
      const response = await this.callGPT5(prompt)
      const regenerated = this.parseMathQuestions(response, [subtopic])
      return regenerated[0] || question // Return first regenerated question or original if parsing fails
    } else {
      prompt = this.buildReadingPrompt([subtopic])
      const response = await this.callGPT5(prompt)
      const regenerated = this.parseReadingQuestions(response, [subtopic])
      return regenerated[0] || question
    }
  }

  /**
   * Validate questions after image generation to ensure diagram consistency
   * Penalizes questions that mention diagrams/charts but don't have imageUrl
   */
  async validateDiagramConsistency(questions: EvaluatedQuestion[]): Promise<EvaluatedQuestion[]> {
    console.log('🔍 Post-generation validation: Checking diagram consistency...')
    
    return questions.map(question => {
      // Skip if not a math question
      if (question.moduleType !== 'math') {
        return question
      }
      
      // Check if question text mentions diagram/chart/graph/coordinate/shows/figure
      const questionLower = question.question.toLowerCase()
      const mentionsDiagram = 
        questionLower.includes('diagram') ||
        questionLower.includes('chart') ||
        questionLower.includes('graph') ||
        questionLower.includes('coordinate plane') ||
        questionLower.includes('the figure') ||
        questionLower.includes('shown') ||
        questionLower.includes('illustrated') ||
        questionLower.includes('displayed')
      
      const hasImageUrl = !!question.imageUrl && question.imageUrl.length > 0
      const hasChartDescription = !!question.chartDescription && question.chartDescription.length > 10
      
      // Case 1: Question mentions diagram but has no image
      if (mentionsDiagram && !hasImageUrl) {
        console.log(`⚠️ Diagram consistency error: Question mentions visual but has no image`)
        console.log(`   Question: "${question.question.substring(0, 80)}..."`)
        console.log(`   hasChart: ${question.hasChart}, imageUrl: ${hasImageUrl}, chartDesc: ${hasChartDescription}`)
        
        // Severely penalize - reduce quality score by 40%
        const newQualityScore = Math.max(0.3, question.qualityScore - 0.4)
        
        return {
          ...question,
          qualityScore: newQualityScore,
          isAccepted: false,
          evaluationFeedback: `${question.evaluationFeedback} | CRITICAL ERROR: Question references a diagram/chart that doesn't exist. Quality penalized from ${(question.qualityScore * 100).toFixed(0)}% to ${(newQualityScore * 100).toFixed(0)}%.`
        }
      }
      
      // Case 2: Has chart flag but no image was generated
      if (question.hasChart && !hasImageUrl) {
        console.log(`⚠️ Image generation failed for question with hasChart=true`)
        console.log(`   Question: "${question.question.substring(0, 80)}..."`)
        
        // Moderate penalty - reduce quality score by 25%
        const newQualityScore = Math.max(0.4, question.qualityScore - 0.25)
        
        return {
          ...question,
          qualityScore: newQualityScore,
          isAccepted: false,
          evaluationFeedback: `${question.evaluationFeedback} | ERROR: Chart/diagram generation failed. Quality penalized from ${(question.qualityScore * 100).toFixed(0)}% to ${(newQualityScore * 100).toFixed(0)}%.`
        }
      }
      
      // Case 3: All good - diagram mentioned and image exists
      if (mentionsDiagram && hasImageUrl) {
        console.log(`✅ Diagram consistency OK: "${question.question.substring(0, 60)}..."`)
      }
      
      return question
    })
  }

  /**
   * Generate and store images for questions with chart descriptions
   */
  async generateImagesForQuestions(questions: EvaluatedQuestion[]): Promise<EvaluatedQuestion[]> {
    const { imageGenerationService } = await import('./imageGenerationService')
    
    console.log(`🎨 Processing ${questions.length} questions for image generation...`)
    const questionsWithCharts = questions.filter(q => q.hasChart && q.chartDescription && q.moduleType === 'math')
    console.log(`� Found ${questionsWithCharts.length} questions marked with hasChart=true`)
    
    if (questionsWithCharts.length === 0) {
      console.log('⚠️ No questions have hasChart=true, skipping image generation')
      return questions
    }
    
    const questionsWithImages = await Promise.all(
      questions.map(async (question) => {
        if (question.hasChart && question.chartDescription && question.moduleType === 'math') {
          try {
            console.log(`🎨 Generating image for question: "${question.question.substring(0, 50)}..."`)
            console.log(`   Graph type: ${question.graphType || 'not specified'}`)
            console.log(`   Description: ${question.chartDescription.substring(0, 100)}...`)
            
            const chartConfig = {
              type: (question.graphType as 'coordinate-plane' | 'bar-chart' | 'scatter-plot' | 'box-plot' | 'geometric-diagram' | 'function-graph') || 'coordinate-plane',
              description: question.chartDescription,
              width: 600,
              height: 400
            }
            
            // Try DALL-E first, fallback to SVG
            let imageUrl = await imageGenerationService.generateChartImage(chartConfig)
            
            if (!imageUrl) {
              console.log('📋 DALL-E failed, generating SVG fallback...')
              imageUrl = await imageGenerationService.generateSVGChart(chartConfig)
            }
            
            if (imageUrl) {
              console.log(`✅ Generated image successfully: ${imageUrl.substring(0, 80)}...`)
              return {
                ...question,
                imageUrl,
                imageAlt: question.chartDescription
              }
            } else {
              console.error(`❌ Failed to generate any image for question`)
              return question
            }
          } catch (error) {
            console.error('❌ Image generation error:', error instanceof Error ? error.message : String(error))
            return question
          }
        }
        
        return question
      })
    )
    
    const successCount = questionsWithImages.filter(q => q.imageUrl).length
    console.log(`✅ Image generation complete: ${successCount}/${questionsWithCharts.length} successful`)
    
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

      // Note: Image generation happens AFTER evaluation in the API route
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
      const endpoint = this.getChatEndpoint()
      const apiKey = this.getApiKey()
      if (!endpoint || !apiKey) {
        throw new Error('Missing Azure OpenAI config: set AZURE_OPENAI_API_KEY and ENDPOINT_URL or AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_DEPLOYMENT.')
      }

      // Detect if this is a reasoning model (gpt-5, o1, etc.)
      const isReasoningModel = settings.llmModel.toLowerCase().includes('gpt-5') || 
                              settings.llmModel.toLowerCase().includes('o1') ||
                              settings.llmModel.toLowerCase().includes('nano')
      
      // Reasoning models need MUCH higher token limits and different parameters
      const tokenLimit = isReasoningModel ? 32000 : settings.maxTokens
      
      console.log(`🤖 Model type: ${isReasoningModel ? 'Reasoning' : 'Standard'}, Token limit: ${tokenLimit}`)

      const requestBody: any = {
        messages: isReasoningModel 
          ? [
              // Reasoning models work better with single user message
              {
                role: 'user',
                content: `${SYSTEM_ROLES.QUESTION_GENERATOR}\n\n${prompt}`
              }
            ]
          : [
              {
                role: 'system',
                content: SYSTEM_ROLES.QUESTION_GENERATOR
              },
              {
                role: 'user',
                content: prompt
              }
            ]
      }
      
      // Reasoning models use max_completion_tokens, standard models use max_tokens
      if (isReasoningModel) {
        requestBody.max_completion_tokens = tokenLimit
      } else {
        requestBody.max_tokens = tokenLimit
        requestBody.temperature = settings.temperature
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
      console.log(`${settings.llmModel} Content Length:`, content?.length || 0)

      if (!content || content.trim().length === 0) {
        console.error(`❌ Empty response from ${settings.llmModel}!`)
        console.error('Token usage:', data.usage)
        console.error('Finish reason:', data.choices[0].finish_reason)
        
        // Check if it's a reasoning token issue
        if (data.usage?.completion_tokens_details?.reasoning_tokens) {
          const reasoningTokens = data.usage.completion_tokens_details.reasoning_tokens
          console.error(`⚠️ Reasoning model used ${reasoningTokens} tokens for reasoning but produced no output`)
          console.error(`💡 Try increasing max_tokens beyond ${settings.maxTokens}`)
        }
        
        throw new Error(`${settings.llmModel} returned empty content. This may be due to insufficient token limit for reasoning models.`)
      }

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
      const endpoint = this.getChatEndpoint()
      const apiKey = this.getApiKey()
      if (!endpoint || !apiKey) {
        throw new Error('Missing Azure OpenAI config: set AZURE_OPENAI_API_KEY and ENDPOINT_URL or AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_DEPLOYMENT.')
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
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
          max_completion_tokens: LLM_SETTINGS.DEFAULT_MAX_TOKENS
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
      console.log(`🔍 Evaluating question: "${question.question.substring(0, 60)}..."`)
      const prompt = this.buildEvaluationPromptForQuestion(question)

      const endpoint = this.getGrokEndpoint()
      const apiKey = this.getApiKey()
      
      if (!endpoint || !apiKey) {
        const errorMsg = `Missing config - Endpoint: ${endpoint ? 'OK' : 'MISSING'}, API Key: ${apiKey ? 'OK' : 'MISSING'}`
        console.error('❌ Evaluation config error:', errorMsg)
        throw new Error('Missing Azure OpenAI config for evaluation')
      }

      console.log(`📡 Calling evaluation API: ${endpoint.substring(0, 50)}...`)
      
      const requestBody = {
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
        max_completion_tokens: 500, // Increased from 200 for more detailed evaluation
        temperature: 0.1 // Lower temperature for consistent evaluation
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log(`📊 Evaluation API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Evaluation API error ${response.status}:`, errorText)
        throw new Error(`Evaluation API failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ Invalid API response structure:', JSON.stringify(data))
        throw new Error('Invalid evaluation response structure')
      }

      const evaluationContent = data.choices[0].message.content
      console.log(`📝 Raw evaluation response: ${evaluationContent.substring(0, 150)}...`)
      
      const evaluation = this.parseGrokEvaluation(evaluationContent)
      console.log(`✅ Parsed evaluation - Quality: ${(evaluation.qualityScore * 100).toFixed(0)}%, Difficulty: ${evaluation.difficulty}, Accepted: ${evaluation.isAccepted}`)
      
      return evaluation
      
    } catch (error) {
      console.error('⚠️ Evaluation failed, using fallback:', error instanceof Error ? error.message : String(error))
      const fallback = this.enhancedFallbackEvaluation(question)
      console.log(`📊 Fallback evaluation - Quality: ${(fallback.qualityScore * 100).toFixed(0)}%`)
      return fallback
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
      
      const questions = this.parseJsonArrayResponse(response)
      console.log(`📊 Parsed ${questions.length} math questions from response`)
      
      const parsed = questions.map((q: Record<string, unknown>, index: number) => {
        const question = {
          ...q,
          moduleType: 'math' as const,
          category: subtopics[index]?.topicName || 'Math',
          subtopic: subtopics[index]?.name || 'Unknown'
        } as GeneratedQuestion
        
        console.log(`   Question ${index + 1}: hasChart=${question.hasChart}, chartDesc=${question.chartDescription?.substring(0, 50)}...`)
        return question
      })
      
      const questionsWithCharts = parsed.filter(q => q.hasChart && q.chartDescription)
      console.log(`✅ Found ${questionsWithCharts.length} questions marked with charts`)
      
      return parsed
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
      
      const questions = this.parseJsonArrayResponse(response)
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

  private parseJsonArrayResponse(response: string): Array<Record<string, unknown>> {
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = response.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Try direct parse first
    try {
      const direct = JSON.parse(cleanedResponse)
      if (Array.isArray(direct)) {
        return direct as Array<Record<string, unknown>>
      }
      if (direct && typeof direct === 'object' && Array.isArray((direct as any).questions)) {
        return (direct as any).questions as Array<Record<string, unknown>>
      }
    } catch (error) {
      // fall through to extraction
    }

    // Extract JSON array from surrounding text
    const firstBracket = cleanedResponse.indexOf('[')
    const lastBracket = cleanedResponse.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const slice = cleanedResponse.slice(firstBracket, lastBracket + 1)
      return JSON.parse(slice) as Array<Record<string, unknown>>
    }

    throw new Error('No JSON array found in model response')
  }

  /**
   * Parse Grok evaluation response with robust error handling
   */
  private parseGrokEvaluation(response: string): {
    difficulty: 'easy' | 'medium' | 'hard'
    qualityScore: number
    isAccepted: boolean
    evaluationFeedback: string
  } {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '')
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      // Try to find JSON object in the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = jsonMatch[0]
      }

      const evaluation = JSON.parse(cleaned)
      
      // Validate required fields
      if (!evaluation.difficulty || !('qualityScore' in evaluation) || !('isAccepted' in evaluation)) {
        console.error('❌ Evaluation missing required fields:', evaluation)
        throw new Error('Invalid evaluation structure')
      }
      
      // Normalize quality score (handle both 0-1 and 0-100 scales)
      let normalizedScore = parseFloat(evaluation.qualityScore)
      if (normalizedScore > 1) {
        normalizedScore = normalizedScore / 100
      }
      
      // Validate difficulty
      const validDifficulties = ['easy', 'medium', 'hard']
      const difficulty = validDifficulties.includes(evaluation.difficulty) 
        ? evaluation.difficulty 
        : 'medium'
      
      const result = {
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        qualityScore: Math.max(0, Math.min(1, normalizedScore)), // Clamp between 0 and 1
        isAccepted: evaluation.isAccepted === true,
        evaluationFeedback: evaluation.evaluationFeedback || 'No feedback provided'
      }
      
      console.log('✅ Successfully parsed evaluation:', result)
      return result
      
    } catch (error) {
      console.error('❌ Failed to parse evaluation response:', error)
      console.error('Raw response:', response.substring(0, 200))
      
      // Return a conservative fallback score
      return {
        difficulty: 'medium',
        qualityScore: 0.5,
        isAccepted: false, // Mark as rejected so it gets regenerated
        evaluationFeedback: `Evaluation parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Raw response length: ${response.length} chars.`
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
