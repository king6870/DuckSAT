import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

class GraphMathQuestionGenerator {
  private readonly AZURE_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview'
  private readonly API_KEY = process.env.AZURE_OPENAI_API_KEY || ''

  async generateGraphMathQuestions() {
    console.log('🔢 Generating graph-only math questions...')
    
    const categories = [
      'Linear Functions and Graphs',
      'Quadratic Functions and Parabolas', 
      'Exponential and Logarithmic Functions',
      'Statistics and Data Analysis',
      'Coordinate Geometry',
      'Systems of Equations (Graphical)'
    ]

    for (const category of categories) {
      console.log(`📊 Generating questions for: ${category}`)
      
      const questions = await this.generateCategoryQuestions(category)
      const validatedQuestions = await this.tripleValidateWithGrok(questions, category)
      
      await this.saveQuestions(validatedQuestions, category)
    }
  }

  private async generateCategoryQuestions(category: string) {
    const prompt = `Generate 20 SAT Math questions for "${category}". 

CRITICAL REQUIREMENTS:
- ONLY graphs, charts, coordinate planes, function plots, data visualizations
- NO triangles, circles, polygons, geometric shapes, or 3D figures
- Each question MUST include a graph/chart that is essential to solving
- Focus on: linear/quadratic/exponential functions, data analysis, coordinate systems

For each question, provide:
{
  "question": "Question text referring to the graph",
  "options": ["A) option", "B) option", "C) option", "D) option"],
  "correctAnswer": 0,
  "explanation": "Detailed explanation",
  "difficulty": "easy|medium|hard",
  "chartData": {
    "type": "line|scatter|bar|function",
    "title": "Graph title",
    "xAxis": "X-axis label",
    "yAxis": "Y-axis label", 
    "data": [{"x": 0, "y": 0}, {"x": 1, "y": 2}] // or appropriate data structure
  },
  "graphType": "coordinate-plane|function-graph|statistics-chart"
}

Return as JSON array of 20 questions.`

    try {
      const response = await fetch(this.AZURE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.API_KEY
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure')
      }

      const content = data.choices[0].message.content
      
      // Clean and parse JSON
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      }
      
      const questions = JSON.parse(cleanContent)
      
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array of questions')
      }
      
      return questions
      
    } catch (error) {
      console.error(`❌ Error generating questions for ${category}:`, error)
      return []
    }
  }

  private async tripleValidateWithGrok(questions: any[], category: string) {
    console.log(`🔍 Triple-validating ${questions.length} questions with Grok...`)
    
    const validatedQuestions = []
    
    for (const question of questions) {
      const validation = await this.validateQuestionWithGrok(question, category)
      
      if (validation.isValid && validation.hasProperGraph) {
        validatedQuestions.push({
          ...question,
          validationScore: validation.score,
          grokFeedback: validation.feedback
        })
      } else {
        console.log(`❌ Rejected question: ${validation.feedback}`)
      }
    }
    
    console.log(`✅ Validated ${validatedQuestions.length}/${questions.length} questions`)
    return validatedQuestions
  }

  private async validateQuestionWithGrok(question: any, category: string) {
    const validationPrompt = `TRIPLE-CHECK this SAT Math question for "${category}":

Question: ${question.question}
Options: ${question.options.join(', ')}
Correct Answer: ${question.options[question.correctAnswer]}
Chart Data: ${JSON.stringify(question.chartData)}

VALIDATION CRITERIA (ALL MUST BE TRUE):
1. Question REQUIRES the graph/chart to solve (not just decorative)
2. Graph is mathematically accurate and properly labeled
3. NO geometric shapes, triangles, circles, or 3D figures
4. ONLY coordinate planes, function graphs, data charts, statistical plots
5. Answer is definitively correct based on the graph
6. Difficulty appropriate for SAT Math
7. Graph data is complete and makes sense

Rate 1-10 and explain. Only approve if 8+ and meets ALL criteria.

Respond in JSON:
{
  "isValid": true/false,
  "hasProperGraph": true/false,
  "score": 1-10,
  "feedback": "Detailed explanation of validation"
}`

    try {
      const response = await fetch(this.AZURE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.API_KEY
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: validationPrompt }],
          max_tokens: 500,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        console.log(`⚠️ Validation API error for question, skipping...`)
        return { isValid: false, hasProperGraph: false, score: 0, feedback: 'API Error' }
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return { isValid: false, hasProperGraph: false, score: 0, feedback: 'Invalid API response' }
      }

      let content = data.choices[0].message.content.trim()
      
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      }
      
      return JSON.parse(content)
      
    } catch (error) {
      console.log(`⚠️ Error validating question: ${error}`)
      return { isValid: false, hasProperGraph: false, score: 0, feedback: 'Validation error' }
    }
  }

  private async saveQuestions(questions: any[], category: string) {
    console.log(`💾 Saving ${questions.length} questions for ${category}`)
    
    for (const question of questions) {
      await prisma.question.create({
        data: {
          moduleType: 'math',
          difficulty: question.difficulty,
          category,
          subtopic: category,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          chartData: question.chartData,
          timeEstimate: 120, // 2 minutes per question
          source: 'AI Generated (Graph-Only)',
          tags: ['graphs', 'charts', 'coordinate-plane'],
          isActive: true
        }
      })
    }
    
    console.log(`✅ Saved ${questions.length} questions for ${category}`)
  }
}

async function main() {
  try {
    const generator = new GraphMathQuestionGenerator()
    await generator.generateGraphMathQuestions()
    
    // Get final count
    const totalQuestions = await prisma.question.count({
      where: { moduleType: 'math' }
    })
    
    console.log(`🎉 Successfully generated ${totalQuestions} graph-only math questions!`)
    
  } catch (error) {
    console.error('❌ Error generating questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
