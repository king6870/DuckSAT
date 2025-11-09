const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class GrokValidator {
  constructor() {
    this.AZURE_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview';
    this.API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
  }

  async validateQuestion(question) {
    const prompt = `Analyze this SAT question for accuracy. Respond with JSON: {"isValid": true, "confidence": 0.8}

Question: ${question.question}
Options: ${question.options.join(', ')}
Correct Answer: ${question.options[question.correctAnswer]}`

    try {
      const response = await fetch(this.AZURE_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': this.API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert SAT question validator. Always respond with valid JSON only.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 100
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`API Error ${response.status}: ${errorText}`)
        return { isValid: true, confidence: 0.5 }
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[^}]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return result
      }

      return { isValid: true, confidence: 0.5 }
    } catch (error) {
      console.error('Validation error:', error.message)
      return { isValid: true, confidence: 0.5 }
    }
  }

  async generateQuestion(category, difficulty, moduleType) {
    const prompt = `Generate a SAT ${moduleType} question for ${category} at ${difficulty} level. Respond with JSON: {"question": "text", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "text"}`

    try {
      const response = await fetch(this.AZURE_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': this.API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert SAT question writer. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (!response.ok) return null

      const data = await response.json()
      const content = data.choices[0].message.content

      // Try to extract JSON from response
      const jsonMatch = content.match(/\{([\s\S]*?)\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])

        return {
          moduleType,
          difficulty,
          category,
          question: result.question,
          options: result.options,
          correctAnswer: result.correctAnswer,
          explanation: result.explanation,
          timeEstimate: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
          isActive: true
        }
      }

      return null
    } catch (error) {
      console.error('Generation error:', error.message)
      return null
    }
  }
}

async function main() {
  console.log('🤖 Starting Azure OpenAI validation and generation...')
  
  const validator = new GrokValidator()
  
  // Step 1: Validate existing questions
  console.log('📋 Fetching existing questions...')
  const existingQuestions = await prisma.question.findMany({
    where: { isActive: true }
  })
  
  console.log(`Found ${existingQuestions.length} questions to validate`)
  
  let deletedCount = 0
  let validatedCount = 0
  
  for (const question of existingQuestions) {
    console.log(`Validating ${validatedCount + 1}/${existingQuestions.length}: ${question.question.substring(0, 30)}...`)
    
    const validation = await validator.validateQuestion(question)
    
    if (!validation.isValid || validation.confidence < 0.6) {
      console.log(`❌ Deleting (confidence: ${validation.confidence})`)
      
      await prisma.question.delete({
        where: { id: question.id }
      })
      deletedCount++
    } else {
      console.log(`✅ Keeping (confidence: ${validation.confidence})`)
    }
    
    validatedCount++
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`✅ Validation complete: ${deletedCount} deleted, ${validatedCount - deletedCount} kept`)
  
  // Step 2: Generate 300 new questions
  console.log('🚀 Generating 300 new questions...')
  
  const categories = {
    'reading-writing': ['Reading Comprehension', 'Grammar', 'Vocabulary', 'Writing Skills'],
    'math': ['Algebra', 'Geometry', 'Statistics', 'Advanced Math']
  }
  
  const difficulties = ['easy', 'medium', 'hard']
  let generatedCount = 0
  
  for (let i = 0; i < 300; i++) {
    const moduleType = Math.random() < 0.5 ? 'reading-writing' : 'math'
    const category = categories[moduleType][Math.floor(Math.random() * categories[moduleType].length)]
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
    
    console.log(`Generating ${i + 1}/300: ${moduleType} - ${category} - ${difficulty}`)
    
    const newQuestion = await validator.generateQuestion(category, difficulty, moduleType)
    
    if (newQuestion) {
      await prisma.question.create({
        data: newQuestion
      })
      generatedCount++
      console.log(`✅ Created`)
    } else {
      console.log(`❌ Failed`)
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  console.log(`🥇 Final total: ${generatedCount} questions`)
  
  await prisma.$disconnect()
}

main().catch(console.error)