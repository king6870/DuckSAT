import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface GeneratedQuestion {
  id: string
  timestamp: string
  question: string
  options: string[]
  correctAnswer: number
  points: number
  explanation: string
  moduleType: string
  category: string
  subtopic: string
  difficulty: string
  qualityScore: number
  chartDescription?: string
  interactionType?: string
  graphType?: string
  passage?: string
}

async function importGeneratedQuestions() {
  try {
    console.log('🚀 Starting import of generated questions...')

    // Import math questions
    const mathQuestionsPath = path.join(process.cwd(), 'generated-math-questions.json')
    if (fs.existsSync(mathQuestionsPath)) {
      const mathQuestions: GeneratedQuestion[] = JSON.parse(fs.readFileSync(mathQuestionsPath, 'utf8'))
      console.log(`📊 Found ${mathQuestions.length} math questions`)

      for (const q of mathQuestions) {
        // Check if question already exists
        const existing = await prisma.question.findFirst({
          where: { 
            OR: [
              { question: q.question },
              { source: { contains: q.id } }
            ]
          }
        })

        if (existing) {
          console.log(`⏭️  Skipping existing question: ${q.id}`)
          continue
        }

        // Find or create subtopic
        let subtopic = await prisma.subtopic.findFirst({
          where: { 
            name: q.subtopic,
            topic: {
              name: q.category,
              moduleType: 'math'
            }
          }
        })

        if (!subtopic) {
          // Find or create topic first
          let topic = await prisma.topic.findFirst({
            where: { 
              name: q.category,
              moduleType: 'math'
            }
          })

          if (!topic) {
            topic = await prisma.topic.create({
              data: {
                name: q.category,
                moduleType: 'math',
                description: `${q.category} topics for SAT Math`
              }
            })
          }

          subtopic = await prisma.subtopic.create({
            data: {
              name: q.subtopic,
              description: `${q.subtopic} questions`,
              topicId: topic.id
            }
          })
        }

        // Create question
        await prisma.question.create({
          data: {
            moduleType: 'math',
            difficulty: q.difficulty,
            category: q.category,
            subtopicId: subtopic.id,
            question: q.question,
            passage: undefined,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            wrongAnswerExplanations: undefined,
            imageUrl: undefined,
            imageAlt: undefined,
            chartData: q.chartDescription ? {
              description: q.chartDescription,
              interactionType: q.interactionType || 'point-placement',
              graphType: q.graphType || 'coordinate-plane'
            } : undefined,
            timeEstimate: q.points * 30, // 30 seconds per point
            source: `AI Generated (GPT-5) - ${q.id}`,
            tags: [q.difficulty, q.category, q.subtopic],
            isActive: true
          }
        })

        console.log(`✅ Imported math question: ${q.subtopic}`)
      }
    }

    // Import reading questions
    const readingQuestionsPath = path.join(process.cwd(), 'generated-reading-questions.json')
    if (fs.existsSync(readingQuestionsPath)) {
      const readingQuestions: GeneratedQuestion[] = JSON.parse(fs.readFileSync(readingQuestionsPath, 'utf8'))
      console.log(`📚 Found ${readingQuestions.length} reading questions`)

      for (const q of readingQuestions) {
        // Check if question already exists
        const existing = await prisma.question.findFirst({
          where: { 
            OR: [
              { question: q.question },
              { source: { contains: q.id } }
            ]
          }
        })

        if (existing) {
          console.log(`⏭️  Skipping existing question: ${q.id}`)
          continue
        }

        // Find or create subtopic
        let subtopic = await prisma.subtopic.findFirst({
          where: { 
            name: q.subtopic,
            topic: {
              name: q.category,
              moduleType: 'reading-writing'
            }
          }
        })

        if (!subtopic) {
          // Find or create topic first
          let topic = await prisma.topic.findFirst({
            where: { 
              name: q.category,
              moduleType: 'reading-writing'
            }
          })

          if (!topic) {
            topic = await prisma.topic.create({
              data: {
                name: q.category,
                moduleType: 'reading-writing',
                description: `${q.category} topics for SAT Reading & Writing`
              }
            })
          }

          subtopic = await prisma.subtopic.create({
            data: {
              name: q.subtopic,
              description: `${q.subtopic} questions`,
              topicId: topic.id
            }
          })
        }

        // Create question
        await prisma.question.create({
          data: {
            moduleType: 'reading-writing',
            difficulty: q.difficulty,
            category: q.category,
            subtopicId: subtopic.id,
            question: q.question,
            passage: q.passage || undefined,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            wrongAnswerExplanations: undefined,
            imageUrl: undefined,
            imageAlt: undefined,
            chartData: undefined,
            timeEstimate: q.points * 30, // 30 seconds per point
            source: `AI Generated (GPT-5) - ${q.id}`,
            tags: [q.difficulty, q.category, q.subtopic],
            isActive: true
          }
        })

        console.log(`✅ Imported reading question: ${q.subtopic}`)
      }
    }

    console.log('🎉 Import completed successfully!')

    // Show summary
    const totalQuestions = await prisma.question.count()
    const mathCount = await prisma.question.count({ where: { moduleType: 'math' } })
    const readingCount = await prisma.question.count({ where: { moduleType: 'reading-writing' } })

    console.log(`📊 Database Summary:`)
    console.log(`   Total Questions: ${totalQuestions}`)
    console.log(`   Math Questions: ${mathCount}`)
    console.log(`   Reading Questions: ${readingCount}`)

  } catch (error) {
    console.error('❌ Error importing questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importGeneratedQuestions()
