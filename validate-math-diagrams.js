const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class MathDiagramValidator {
  constructor() {
    this.AZURE_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview'
    this.API_KEY = 'FhyeuwcfKGaNEhoq3U7VOKg4s0sfobVW7fNIdDA7EaI05dyIXQqMJQQJ99BBACHYHv6XJ3w3AAAAACOGsrpa'
  }

  async validateMathDiagram(question) {
    const prompt = `You are an expert SAT math validator. Carefully analyze this math question with diagram/chart data.

Question: ${question.question}
Options: ${question.options.join(', ')}
Correct Answer: ${question.options[question.correctAnswer]}
Chart/Diagram Data: ${JSON.stringify(question.chartData)}

Check for:
1. Mathematical accuracy of the diagram/chart
2. Consistency between question text and visual data
3. Correct answer matches the diagram
4. All coordinates/values are mathematically sound
5. Diagram type matches the question content

Respond with JSON only:
{"isValid": true/false, "confidence": 0.0-1.0, "issues": ["list any problems found"], "diagramAccurate": true/false}`

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
              content: 'You are an expert SAT math question validator specializing in diagrams and charts. Always respond with valid JSON only.'
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

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`API Error ${response.status}: ${errorText}`)
        return { isValid: true, confidence: 0.5, issues: [], diagramAccurate: true }
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return result
      }
      
      return { isValid: true, confidence: 0.5, issues: [], diagramAccurate: true }
    } catch (error) {
      console.error('Validation error:', error.message)
      return { isValid: true, confidence: 0.5, issues: [], diagramAccurate: true }
    }
  }
}

async function main() {
  console.log('🔍 Starting math diagram validation with Grok...')
  
  const validator = new MathDiagramValidator()
  
  // Find all math questions with chart data
  console.log('📊 Fetching math questions with diagrams...')
  const mathQuestions = await prisma.question.findMany({
    where: { 
      isActive: true,
      moduleType: 'math',
      chartData: {
        not: null
      }
    }
  })
  
  console.log(`Found ${mathQuestions.length} math questions with diagrams`)
  
  if (mathQuestions.length === 0) {
    console.log('⚠️  No math questions with diagrams found!')
    await prisma.$disconnect()
    return
  }
  
  let validatedCount = 0
  let issuesFound = 0
  let deletedCount = 0
  
  for (const question of mathQuestions) {
    console.log(`\nValidating ${validatedCount + 1}/${mathQuestions.length}:`)
    console.log(`Question: ${question.question.substring(0, 60)}...`)
    console.log(`Category: ${question.category} | Difficulty: ${question.difficulty}`)
    
    const validation = await validator.validateMathDiagram(question)
    
    console.log(`Confidence: ${validation.confidence}`)
    console.log(`Diagram Accurate: ${validation.diagramAccurate}`)
    
    if (validation.issues && validation.issues.length > 0) {
      console.log(`Issues found: ${validation.issues.join(', ')}`)
      issuesFound++
    }
    
    // Delete if validation fails or confidence is too low
    if (!validation.isValid || !validation.diagramAccurate || validation.confidence < 0.7) {
      console.log(`❌ DELETING - Failed validation`)
      
      await prisma.question.delete({
        where: { id: question.id }
      })
      deletedCount++
    } else {
      console.log(`✅ KEEPING - Passed validation`)
    }
    
    validatedCount++
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n🎉 Math diagram validation complete!')
  console.log(`📊 Results:`)
  console.log(`   - Total validated: ${validatedCount}`)
  console.log(`   - Issues found: ${issuesFound}`)
  console.log(`   - Questions deleted: ${deletedCount}`)
  console.log(`   - Questions kept: ${validatedCount - deletedCount}`)
  
  // Final count
  const finalMathWithDiagrams = await prisma.question.count({
    where: { 
      isActive: true,
      moduleType: 'math',
      chartData: {
        not: null
      }
    }
  })
  
  console.log(`📈 Final math questions with diagrams: ${finalMathWithDiagrams}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
