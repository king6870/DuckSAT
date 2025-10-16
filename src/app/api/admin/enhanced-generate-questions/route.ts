import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/middleware/adminAuth'
import { aiQuestionService } from '@/services/aiQuestionService'
import { prisma } from '@/lib/prisma'

interface GenerationSettings {
  llmModel: string
  questionCount: number
  mathCount: number
  readingCount: number
  temperature: number
  maxTokens: number
  includeCharts: boolean
  includePassages: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const settings: GenerationSettings = await request.json()

    // Validate settings
    if (!settings.llmModel || settings.questionCount <= 0) {
      return NextResponse.json(
        { error: 'Invalid settings: LLM model and question count are required' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting enhanced AI question generation...')
    console.log('Settings:', settings)

    // Generate questions with specified settings
    const generatedQuestions = await aiQuestionService.generateQuestionsWithSettings(settings)
    console.log(`✅ Generated ${generatedQuestions.length} questions`)

    // Evaluate questions with Grok
    const evaluatedQuestions = await aiQuestionService.evaluateQuestions(generatedQuestions)
    console.log(`🔍 Evaluated ${evaluatedQuestions.length} questions`)

    // Filter accepted questions
    const acceptedQuestions = evaluatedQuestions.filter(q => q.isAccepted)
    const rejectedQuestions = evaluatedQuestions.filter(q => !q.isAccepted)

    console.log(`✅ Accepted: ${acceptedQuestions.length}, ❌ Rejected: ${rejectedQuestions.length}`)

    // Store accepted questions in database
    const storedQuestions = []
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
            imageUrl: question.imageUrl || undefined,
            imageAlt: question.chartDescription || undefined,
            chartData: question.hasChart ? { description: question.chartDescription } : undefined,
            timeEstimate: question.points * 30, // 30 seconds per point
            source: `AI Generated (${settings.llmModel})`,
            tags: [question.difficulty, question.category, question.subtopic],
            isActive: true
          }
        })

        storedQuestions.push(storedQuestion)

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

    return NextResponse.json({
      success: true,
      summary: {
        generated: generatedQuestions.length,
        evaluated: evaluatedQuestions.length,
        accepted: acceptedQuestions.length,
        rejected: rejectedQuestions.length,
        stored: storedQuestions.length
      },
      questions: {
        accepted: acceptedQuestions.map(q => ({
          question: q.question,
          moduleType: q.moduleType,
          difficulty: q.difficulty,
          category: q.category,
          subtopic: q.subtopic,
          qualityScore: q.qualityScore || 0,
          explanation: q.explanation,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          passage: q.passage,
          chartDescription: q.chartDescription,
          evaluationFeedback: q.evaluationFeedback || ''
        })),
        rejected: rejectedQuestions.map(q => ({
          question: q.question,
          moduleType: q.moduleType,
          subtopic: q.subtopic,
          evaluationFeedback: q.evaluationFeedback || ''
        }))
      }
    })
  } catch (error) {
    console.error('Enhanced AI question generation failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
