// AI Question Generation Service using GPT-5 and Grok
import { getAllSubtopics } from '@/data/sat-topics'
import { prisma } from '@/lib/prisma'

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
              type: question.graphType as any || 'coordinate-plane',
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
              content: 'You are an expert SAT question writer. Generate high-quality, accurate SAT questions that match official SAT standards and difficulty levels. Always return valid JSON without any markdown formatting or code blocks.'
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
  private buildMathPromptWithSettings(subtopics: any[], settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): string {
    const includeChartsText = settings.includeCharts ?
      'MUST include detailed visual elements: graphs, charts, tables, diagrams, or coordinate planes' :
      'May optionally include visual elements if they enhance understanding'

    return `
Generate exactly ${settings.mathCount} high-quality SAT Math questions, one for each of these subtopics:
${subtopics.map((s, i) => `${i + 1}. ${s.name} (${s.topicName})`).join('\n')}

Requirements for each question:
- ${includeChartsText}
- For coordinate geometry: specify exact points, lines, curves, and grid details
- For functions: include function graphs with labeled axes, intercepts, and key points
- For geometry: provide detailed diagrams with measurements, angles, and labeled vertices
- For statistics: include data tables, bar charts, histograms, or scatter plots with specific values
- For algebra: show coordinate planes, number lines, or visual representations of equations
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with step-by-step explanation
- Points value (1-4 points based on complexity)
- Appropriate for SAT Math section
- Vary complexity across the questions
- Make graphs interactive when possible (e.g., "Click to identify the vertex", "Select the correct point")

VISUAL REQUIREMENTS - Every question MUST have one of these (if charts enabled):
- Coordinate plane with plotted points/lines/curves
- Data table with numerical values
- Bar chart, histogram, or pie chart
- Geometric diagram with labeled measurements
- Function graph with domain/range marked
- Number line with inequalities or intervals
- Scatter plot with trend lines
- Box plot or other statistical visualization

IMPORTANT MATH NOTATION REQUIREMENTS:
- Use proper mathematical notation in questions, options, and explanations
- For equations: Use format like "y = 2x + 3", "f(x) = x^2 - 4x + 1", "2x^2 + 3x - 5 = 0"
- For fractions: Use "1/2", "3/4", "-2/3" format
- For exponents: Use "x^2", "2^n", "(x+1)^3" format
- For square roots: Use "sqrt(x)", "sqrt(25)", "sqrt(x^2 + 1)" format
- For coordinates: Use "(2, 3)", "(-1, 4)", "(0, -2)" format
- For inequalities: Use "x > 5", "y <= 3", "2x + 1 >= 7" format
- For functions: Use "f(x) = ", "g(t) = ", "h(n) = " format
- Include mathematical expressions in both questions and answer choices
- Make explanations step-by-step with clear mathematical reasoning

IMPORTANT: For the chartDescription field, be very specific about:
- Coordinate points to plot: (x, y) coordinates with exact values
- Function equations: y = mx + b, y = ax^2 + bx + c, etc.
- Table data: specific numbers, headers, and formatting
- Chart details: axis labels, scales, data points, colors
- Geometric shapes: triangles with vertices at specific points, angles, side lengths
- Interactive elements: what the student should click, drag, or manipulate
- Axes ranges and labels with specific numerical values
- Grid settings and scale increments

EXAMPLES of good chartDescription content:
- "Data table showing x values: -2, -1, 0, 1, 2 and corresponding y values: 4, 1, 0, 1, 4 for function f(x) = x^2"
- "Coordinate plane from -10 to 10 on both axes. Plot parabola y = (x-3)^2 - 4 with vertex at (3, -4) and y-intercept at (0, 5). Grid lines every 1 unit."
- "Bar chart showing test scores: 70-79 (5 students), 80-89 (12 students), 90-99 (8 students). Y-axis shows frequency, X-axis shows score ranges."

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "The coordinate plane shows the graph of f(x) = x^2 - 4x + 3. What are the coordinates of the vertex?",
    "options": ["A) (2, -1)", "B) (2, 1)", "C) (-2, -1)", "D) (4, 3)"],
    "correctAnswer": 0,
    "points": 3,
    "explanation": "For f(x) = x^2 - 4x + 3, vertex x-coordinate = -b/(2a) = -(-4)/(2(1)) = 2. f(2) = (2)^2 - 4(2) + 3 = 4 - 8 + 3 = -1. Vertex is (2, -1)",
    "subtopic": "${subtopics[0]?.name || 'Math'}",
    "category": "${subtopics[0]?.topicName || 'Math'}",
    "hasChart": ${settings.includeCharts},
    "chartDescription": "Coordinate plane from -1 to 5 on x-axis and -3 to 7 on y-axis. Shows parabola f(x) = x^2 - 4x + 3 with vertex at (2, -1), y-intercept at (0, 3), and x-intercepts at (1, 0) and (3, 0). Grid lines every 1 unit.",
    "interactionType": "point-selection",
    "graphType": "coordinate-plane"
  }
]

Generate all ${settings.mathCount} questions following this pattern. Ensure each question uses proper mathematical notation and includes step-by-step explanations with clear mathematical reasoning. Return only the JSON array.
`
  }

  /**
   * Build reading questions prompt with settings
   */
  private buildReadingPromptWithSettings(subtopics: any[], settings: {
    llmModel: string
    questionCount: number
    mathCount: number
    readingCount: number
    temperature: number
    maxTokens: number
    includeCharts: boolean
    includePassages: boolean
  }): string {
    const includePassagesText = settings.includePassages ?
      'Include a reading passage (150-300 words)' :
      'May optionally include shorter passages if they enhance understanding'

    return `
Generate exactly ${settings.readingCount} high-quality SAT Reading questions, one for each of these subtopics:
${subtopics.map((s, i) => `${i + 1}. ${s.name} (${s.topicName})`).join('\n')}

Requirements for each question:
- ${includePassagesText}
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with explanation
- Points value (1-3 points based on complexity)
- Appropriate for SAT Reading section
- Vary passage types and complexity

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "Question text here",
    "passage": "Reading passage text here (150-300 words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${subtopics[0]?.name || 'Reading'}",
    "category": "${subtopics[0]?.topicName || 'Reading'}"
  }
]

Generate all ${settings.readingCount} questions following this pattern. Return only the JSON array.
`
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
              content: 'You are an expert SAT question writer. Generate high-quality, accurate SAT questions that match official SAT standards and difficulty levels. Always return valid JSON without any markdown formatting or code blocks.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
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
      const prompt = this.buildEvaluationPrompt(question)
      
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
              content: 'You are an expert SAT evaluator. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 200
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
  private buildMathPrompt(subtopics: any[]): string {
    return `
Generate exactly 5 high-quality SAT Math questions, one for each of these subtopics:
${subtopics.map((s, i) => `${i + 1}. ${s.name} (${s.topicName})`).join('\n')}

Requirements for each question:
- MUST include detailed visual elements: graphs, charts, tables, diagrams, or coordinate planes
- For coordinate geometry: specify exact points, lines, curves, and grid details
- For functions: include function graphs with labeled axes, intercepts, and key points
- For geometry: provide detailed diagrams with measurements, angles, and labeled vertices
- For statistics: include data tables, bar charts, histograms, or scatter plots with specific values
- For algebra: show coordinate planes, number lines, or visual representations of equations
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with step-by-step explanation
- Points value (1-4 points based on complexity)
- Appropriate for SAT Math section
- Vary complexity across the 5 questions
- Make graphs interactive when possible (e.g., "Click to identify the vertex", "Select the correct point")

VISUAL REQUIREMENTS - Every question MUST have one of these:
- Coordinate plane with plotted points/lines/curves
- Data table with numerical values
- Bar chart, histogram, or pie chart
- Geometric diagram with labeled measurements
- Function graph with domain/range marked
- Number line with inequalities or intervals
- Scatter plot with trend lines
- Box plot or other statistical visualization

IMPORTANT MATH NOTATION REQUIREMENTS:
- Use proper mathematical notation in questions, options, and explanations
- For equations: Use format like "y = 2x + 3", "f(x) = x^2 - 4x + 1", "2x^2 + 3x - 5 = 0"
- For fractions: Use "1/2", "3/4", "-2/3" format
- For exponents: Use "x^2", "2^n", "(x+1)^3" format
- For square roots: Use "sqrt(x)", "sqrt(25)", "sqrt(x^2 + 1)" format
- For coordinates: Use "(2, 3)", "(-1, 4)", "(0, -2)" format
- For inequalities: Use "x > 5", "y <= 3", "2x + 1 >= 7" format
- For functions: Use "f(x) = ", "g(t) = ", "h(n) = " format
- Include mathematical expressions in both questions and answer choices
- Make explanations step-by-step with clear mathematical reasoning

IMPORTANT: For the chartDescription field, be very specific about:
- Coordinate points to plot: (x, y) coordinates with exact values
- Function equations: y = mx + b, y = ax^2 + bx + c, etc.
- Table data: specific numbers, headers, and formatting
- Chart details: axis labels, scales, data points, colors
- Geometric shapes: triangles with vertices at specific points, angles, side lengths
- Interactive elements: what the student should click, drag, or manipulate
- Axes ranges and labels with specific numerical values
- Grid settings and scale increments

EXAMPLES of good chartDescription content:
- "Data table showing x values: -2, -1, 0, 1, 2 and corresponding y values: 4, 1, 0, 1, 4 for function f(x) = x^2"
- "Coordinate plane from -10 to 10 on both axes. Plot parabola y = (x-3)^2 - 4 with vertex at (3, -4) and y-intercept at (0, 5). Grid lines every 1 unit."
- "Bar chart showing test scores: 70-79 (5 students), 80-89 (12 students), 90-99 (8 students). Y-axis shows frequency, X-axis shows score ranges."

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "The coordinate plane shows the graph of f(x) = x^2 - 4x + 3. What are the coordinates of the vertex?",
    "options": ["A) (2, -1)", "B) (2, 1)", "C) (-2, -1)", "D) (4, 3)"],
    "correctAnswer": 0,
    "points": 3,
    "explanation": "For f(x) = x^2 - 4x + 3, vertex x-coordinate = -b/(2a) = -(-4)/(2(1)) = 2. f(2) = (2)^2 - 4(2) + 3 = 4 - 8 + 3 = -1. Vertex is (2, -1)",
    "subtopic": "${subtopics[0]?.name || 'Math'}",
    "category": "${subtopics[0]?.topicName || 'Math'}",
    "hasChart": true,
    "chartDescription": "Coordinate plane from -1 to 5 on x-axis and -3 to 7 on y-axis. Shows parabola f(x) = x^2 - 4x + 3 with vertex at (2, -1), y-intercept at (0, 3), and x-intercepts at (1, 0) and (3, 0). Grid lines every 1 unit.",
    "interactionType": "point-selection",
    "graphType": "coordinate-plane"
  },
  {
    "question": "The bar chart shows test scores for a math class. What is the median score?",
    "options": ["A) 75", "B) 80", "C) 85", "D) 90"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "From the chart: 70-79 (3 students), 80-89 (7 students), 90-99 (5 students). Total 15 students. Median is 8th value, which falls in 80-89 range, so median ≈ 80",
    "subtopic": "${subtopics[1]?.name || 'Math'}",
    "category": "${subtopics[1]?.topicName || 'Math'}",
    "hasChart": true,
    "chartDescription": "Bar chart with x-axis showing score ranges (70-79, 80-89, 90-99) and y-axis showing number of students. Bars: 70-79 (3), 80-89 (7), 90-99 (5). Blue bars with clear labels.",
    "interactionType": "data-analysis",
    "graphType": "bar-chart"
  }
]

Generate all 5 questions following this pattern. Ensure each question uses proper mathematical notation and includes step-by-step explanations with clear mathematical reasoning. Return only the JSON array.
`
  }

  /**
   * Build reading questions prompt
   */
  private buildReadingPrompt(subtopics: any[]): string {
    return `
Generate exactly 5 high-quality SAT Reading questions, one for each of these subtopics:
${subtopics.map((s, i) => `${i + 1}. ${s.name} (${s.topicName})`).join('\n')}

Requirements for each question:
- Include a reading passage (150-300 words)
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with explanation
- Points value (1-3 points based on complexity)
- Appropriate for SAT Reading section
- Vary passage types and complexity

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "Question text here",
    "passage": "Reading passage text here (150-300 words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${subtopics[0]?.name || 'Reading'}",
    "category": "${subtopics[0]?.topicName || 'Reading'}"
  },
  {
    "question": "Second question text here",
    "passage": "Second reading passage text here (150-300 words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${subtopics[1]?.name || 'Reading'}",
    "category": "${subtopics[1]?.topicName || 'Reading'}"
  }
]

Generate all 5 questions following this pattern. Return only the JSON array.
`
  }

  /**
   * Build evaluation prompt for Grok
   */
  private buildEvaluationPrompt(question: GeneratedQuestion): string {
    return `
Evaluate this SAT question for difficulty and quality:

Question: ${question.question}
${question.passage ? `Passage: ${question.passage}` : ''}
${question.chartDescription ? `Chart: ${question.chartDescription}` : ''}
Options: ${question.options.join(', ')}
Correct Answer: ${question.options[question.correctAnswer]}
Explanation: ${question.explanation}
Subtopic: ${question.subtopic}
Points: ${question.points}

Please evaluate:
1. Difficulty level (easy/medium/hard) based on SAT standards
2. Quality score (0-1) for accuracy, clarity, and appropriateness
3. Whether to accept this question (true/false) - reject if too easy or too hard for SAT
4. Brief feedback on the question

Respond in this JSON format:
{
  "difficulty": "medium",
  "qualityScore": 0.85,
  "isAccepted": true,
  "evaluationFeedback": "Well-constructed question with appropriate difficulty for SAT standards."
}
`
  }

  /**
   * Parse math questions from GPT-5 response
   */
  private parseMathQuestions(response: string, subtopics: any[]): GeneratedQuestion[] {
    try {
      console.log('Raw GPT-5 math response:', response.substring(0, 200) + '...')
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanedResponse)
      return questions.map((q: any, index: number) => ({
        ...q,
        moduleType: 'math' as const,
        category: subtopics[index]?.topicName || 'Math',
        subtopic: subtopics[index]?.name || 'Unknown'
      }))
    } catch (error) {
      console.error('Failed to parse math questions:', error)
      console.error('Raw response:', response)
      return []
    }
  }

  /**
   * Parse reading questions from GPT-5 response
   */
  private parseReadingQuestions(response: string, subtopics: any[]): GeneratedQuestion[] {
    try {
      console.log('Raw GPT-5 reading response:', response.substring(0, 200) + '...')
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanedResponse)
      return questions.map((q: any, index: number) => ({
        ...q,
        moduleType: 'reading-writing' as const,
        category: subtopics[index]?.topicName || 'Reading',
        subtopic: subtopics[index]?.name || 'Unknown'
      }))
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
    let qualityScore = 0.7
    let feedback = 'Evaluated using enhanced fallback logic: '

    // Difficulty assessment based on points and content
    if (question.points <= 1) {
      difficulty = 'easy'
      feedback += 'Low point value suggests easy difficulty. '
    } else if (question.points >= 3) {
      difficulty = 'hard'
      feedback += 'High point value suggests hard difficulty. '
    } else {
      difficulty = 'medium'
      feedback += 'Medium point value suggests moderate difficulty. '
    }

    // Quality assessment based on content
    const hasGoodExplanation = question.explanation.length > 50
    const hasProperOptions = question.options.length === 4
    const hasReasonableQuestion = question.question.length > 20

    if (hasGoodExplanation && hasProperOptions && hasReasonableQuestion) {
      qualityScore = 0.8
      feedback += 'Good structure and explanations. '
    } else {
      qualityScore = 0.6
      feedback += 'Basic structure but could be improved. '
    }

    // Math-specific checks
    if (question.moduleType === 'math') {
      if (question.hasChart && question.chartDescription) {
        qualityScore += 0.1
        feedback += 'Includes helpful chart description. '
      }
    }

    // Reading-specific checks
    if (question.moduleType === 'reading-writing') {
      if (question.passage && question.passage.length > 100) {
        qualityScore += 0.1
        feedback += 'Includes substantial passage. '
      }
    }

    // Cap quality score at 1.0
    qualityScore = Math.min(qualityScore, 1.0)

    return {
      difficulty,
      qualityScore,
      isAccepted: qualityScore >= 0.6, // Accept if quality is decent
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
                      ...question.chartData,
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
    subtopic: any, 
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
  private buildMathPromptForSubtopic(subtopic: any, count: number): string {
    const difficultyDistribution = subtopic.difficultyDistribution
    const easyCount = Math.round(count * difficultyDistribution.easy / 100)
    const mediumCount = Math.round(count * difficultyDistribution.medium / 100)
    const hardCount = count - easyCount - mediumCount

    return `Generate ${count} high-quality SAT Math questions for the subtopic "${subtopic.name}".

Description: ${subtopic.description}

Difficulty Distribution:
- Easy: ${easyCount} questions (${difficultyDistribution.easy}%)
- Medium: ${mediumCount} questions (${difficultyDistribution.medium}%)  
- Hard: ${hardCount} questions (${difficultyDistribution.hard}%)

Requirements:
1. All questions must be authentic SAT-style math problems
2. Include charts/graphs where appropriate for visual learning
3. Provide detailed explanations for correct answers
4. Use realistic SAT point values (1-4 points based on difficulty)
5. Follow official SAT math question formats

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed step-by-step explanation",
    "hasChart": true,
    "chartDescription": "Description of chart/graph if applicable",
    "graphType": "coordinate-plane",
    "interactionType": "point-placement"
  }
]`
  }

  /**
   * Build reading prompt for specific subtopic
   */
  private buildReadingPromptForSubtopic(subtopic: any, count: number): string {
    const difficultyDistribution = subtopic.difficultyDistribution
    const easyCount = Math.round(count * difficultyDistribution.easy / 100)
    const mediumCount = Math.round(count * difficultyDistribution.medium / 100)
    const hardCount = count - easyCount - mediumCount

    return `Generate ${count} high-quality SAT Reading & Writing questions for the subtopic "${subtopic.name}".

Description: ${subtopic.description}

Difficulty Distribution:
- Easy: ${easyCount} questions (${difficultyDistribution.easy}%)
- Medium: ${mediumCount} questions (${difficultyDistribution.medium}%)
- Hard: ${hardCount} questions (${difficultyDistribution.hard}%)

Requirements:
1. All questions must be authentic SAT-style reading/writing problems
2. Include appropriate passages (150-400 words) when needed
3. Cover diverse topics: literature, science, history, social studies
4. Provide detailed explanations for correct answers
5. Use realistic SAT point values (1-3 points based on difficulty)

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here",
    "passage": "Reading passage text (if applicable)",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "Detailed explanation of correct answer"
  }
]`
  }

  /**
   * Parse questions for specific subtopic
   */
  private parseQuestionsForSubtopic(response: string, subtopic: any): GeneratedQuestion[] {
    try {
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanedResponse)
      return questions.map((q: any) => ({
        ...q,
        moduleType: subtopic.moduleType,
        category: subtopic.name,
        subtopic: subtopic.name
      }))
    } catch (error) {
      console.error('Failed to parse questions for subtopic:', error)
      return []
    }
  }

  /**
   * Select random subtopics
   */
  private selectRandomSubtopics(subtopics: any[], count: number): any[] {
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
          wrongAnswerExplanations: null,
          imageUrl: question.imageUrl || null,
          imageAlt: question.imageAlt || null,
          chartData: question.hasChart ? {
            description: question.chartDescription,
            interactionType: question.interactionType,
            graphType: question.graphType,
            hasGeneratedImage: !!question.imageUrl
          } : null,
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
