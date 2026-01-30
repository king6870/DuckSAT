import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
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
  // New parameters for topic/subtopic filtering
  topicId?: string
  subtopicId?: string
  moduleType?: 'math' | 'reading-writing'
  difficulty?: 'easy' | 'medium' | 'hard'
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

    // Validate topic/subtopic if provided
    if (settings.topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: settings.topicId } })
      if (!topic) {
        return NextResponse.json(
          { error: 'Invalid topic ID' },
          { status: 400 }
        )
      }
    }

    if (settings.subtopicId) {
      const subtopic = await prisma.subtopic.findUnique({ where: { id: settings.subtopicId } })
      if (!subtopic) {
        return NextResponse.json(
          { error: 'Invalid subtopic ID' },
          { status: 400 }
        )
      }
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
    const storedQuestions: Array<{
      id: string;
      subtopicId: string | null;
      moduleType: string;
      difficulty: string;
    }> = []
    const questionResults: Array<{ 
      question: string; 
      status: 'stored' | 'error'; 
      error?: string; 
      id?: string; 
      needsReview?: boolean;
      evaluationFeedback?: string;
    }> = []
    
    for (const question of acceptedQuestions) {
      try {
        // Find the subtopic in database, prefer provided subtopicId
        let subtopic = null
        if (settings.subtopicId) {
          subtopic = await prisma.subtopic.findUnique({ where: { id: settings.subtopicId } })
        } else {
          subtopic = await prisma.subtopic.findFirst({
            where: {
              name: {
                contains: question.subtopic,
                mode: 'insensitive'
              }
            }
          })
        }

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
            imageUrl: question.imageUrl || undefined,
            imageAlt: question.chartDescription || undefined,
            chartData: question.hasChart ? { description: question.chartDescription } : undefined,
            timeEstimate: question.points * 30, // 30 seconds per point
            source: `AI Generated (${settings.llmModel})`,
            tags: [question.difficulty, question.category, question.subtopic],
            isActive: true,
            reviewStatus: reviewStatus,
            reviewComments: reviewComments
          }
        })

        storedQuestions.push(storedQuestion)
        questionResults.push({
          question: String(question.question || ''),
          id: storedQuestion.id,
          status: 'stored',
          needsReview: isFallbackEvaluation,
          evaluationFeedback: question.evaluationFeedback
        })

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
        questionResults.push({
          question: String(question.question || ''),
          id: undefined,
          status: 'error',
          needsReview: false,
          evaluationFeedback: error instanceof Error ? error.message : 'Unknown error storing question'
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        generated: generatedQuestions.length,
        evaluated: evaluatedQuestions.length,
        accepted: acceptedQuestions.length,
        rejected: rejectedQuestions.length,
        stored: storedQuestions.length,
        needsReview: questionResults.filter(r => r.needsReview).length
      },
      questionResults,
      questions: {
        accepted: acceptedQuestions.map((q, index) => ({
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
          evaluationFeedback: q.evaluationFeedback || '',
          needsReview: questionResults[index]?.needsReview || false,
          storedId: questionResults[index]?.id || null
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
    
    // Provide detailed error information
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : { message: 'Unknown error' }
    
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: errorDetails.message,
        stack: errorDetails.stack
      },
      { status: 500 }
    )
  }
}
