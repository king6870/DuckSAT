const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class DiagramGenerator {
  constructor() {
    this.AZURE_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview'
    this.API_KEY = 'FhyeuwcfKGaNEhoq3U7VOKg4s0sfobVW7fNIdDA7EaI05dyIXQqMJQQJ99BBACHYHv6XJ3w3AAAAACOGsrpa'
  }

  async generateDiagram(question) {
    const prompt = `Generate chart/diagram data for this SAT math question. Analyze the question and create appropriate visual data.

Question: ${question.question}
Category: ${question.category}
Options: ${question.options.join(', ')}

Create JSON chart data based on the question content:
- For geometry: coordinate points, lines, shapes
- For statistics: data tables, charts
- For algebra: graphs, functions
- For advanced math: complex diagrams

Respond with JSON only:
{"chartData": {"type": "coordinate-plane/bar-chart/line-graph/scatter-plot", "points": [...], "data": [...], "other_properties": "..."}, "needsDiagram": true/false}`

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
              content: 'You are an expert at creating mathematical diagrams and charts for SAT questions. Always respond with valid JSON only.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 400
        })
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return result
      }
      
      return null
    } catch (error) {
      console.error('Generation error:', error.message)
      return null
    }
  }
}

async function main() {
  console.log('📊 Adding diagrams to math questions...')
  
  const generator = new DiagramGenerator()
  
  // Get math questions that might need diagrams
  const mathQuestions = await prisma.question.findMany({
    where: { 
      isActive: true,
      moduleType: 'math'
    },
    take: 50 // Process first 50 math questions
  })
  
  console.log(`Found ${mathQuestions.length} math questions to process`)
  
  let processedCount = 0
  let diagramsAdded = 0
  
  for (const question of mathQuestions) {
    console.log(`\nProcessing ${processedCount + 1}/${mathQuestions.length}:`)
    console.log(`${question.category}: ${question.question.substring(0, 60)}...`)
    
    const diagramData = await generator.generateDiagram(question)
    
    if (diagramData && diagramData.needsDiagram && diagramData.chartData) {
      console.log(`✅ Adding diagram: ${diagramData.chartData.type}`)
      
      await prisma.question.update({
        where: { id: question.id },
        data: {
          chartData: diagramData.chartData
        }
      })
      
      diagramsAdded++
    } else {
      console.log(`⏭️  No diagram needed`)
    }
    
    processedCount++
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  console.log('\n🎉 Diagram generation complete!')
  console.log(`📊 Results:`)
  console.log(`   - Questions processed: ${processedCount}`)
  console.log(`   - Diagrams added: ${diagramsAdded}`)
  
  // Now run validation on questions with diagrams
  console.log('\n🔍 Now validating math questions with diagrams...')
  
  const questionsWithDiagrams = await prisma.question.findMany({
    where: { 
      isActive: true,
      moduleType: 'math',
      chartData: {
        not: null
      }
    }
  })
  
  console.log(`Found ${questionsWithDiagrams.length} math questions with diagrams to validate`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
