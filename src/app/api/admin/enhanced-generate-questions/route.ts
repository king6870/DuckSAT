/**
 * Enhanced Question Generation API
 * 
 * Generates SAT questions with automatic quality control and regeneration.
 * 
 * Features:
 * - AI-powered question generation (GPT-5)
 * - Automatic quality evaluation (Grok)
 * - Smart regeneration: Questions with quality scores ≤80% are automatically regenerated
 * - Maximum 5 regeneration attempts per question
 * - Image generation for math questions with charts
 * - Topic/subtopic filtering support
 * 
 * Quality Control:
 * - Each question is evaluated for quality, accuracy, and SAT alignment
 * - Questions scoring ≤80% are regenerated up to 5 times
 * - Final questions have quality scores >80% or hit retry limit
 * 
 * @endpoint POST /api/admin/enhanced-generate-questions
 * @auth Admin only
 * @returns Generated and evaluated questions with images
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'
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
  specializedMode?: boolean
  specificTopics?: string[]
  specificSubtopics?: string[]
  moduleType?: 'math' | 'reading-writing'
  difficulty?: 'easy' | 'medium' | 'hard'
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Enhanced generation endpoint called')
    
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      console.error('❌ Unauthorized access attempt:', session?.user?.email)
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    console.log('✅ Authenticated admin:', session.user.email)

    // Validate Azure OpenAI environment variables EARLY
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY
    const endpointUrl = process.env.ENDPOINT_URL || process.env.AZURE_OPENAI_ENDPOINT
    
    if (!azureApiKey) {
      console.error('❌ AZURE_OPENAI_API_KEY is not set')
      return NextResponse.json(
        { 
          error: 'Azure OpenAI configuration missing',
          details: 'AZURE_OPENAI_API_KEY environment variable is not set. Please configure it in Vercel Dashboard → Settings → Environment Variables.',
          hint: 'See docs/VERCEL_ENV_SETUP.md for setup instructions'
        },
        { status: 500 }
      )
    }

    if (!endpointUrl) {
      console.error('❌ Azure OpenAI endpoint is not set')
      return NextResponse.json(
        { 
          error: 'Azure OpenAI configuration missing',
          details: 'ENDPOINT_URL or AZURE_OPENAI_ENDPOINT environment variable is not set. Please configure it in Vercel Dashboard.',
          hint: 'See docs/VERCEL_ENV_SETUP.md for setup instructions'
        },
        { status: 500 }
      )
    }

    console.log('✅ Azure OpenAI config present:', {
      apiKeyLength: azureApiKey.length,
      endpointDomain: new URL(endpointUrl).hostname
    })

    // Parse request body with error handling
    let settings: GenerationSettings
    try {
      settings = await request.json()
      console.log('📊 Parsed settings:', settings)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown parse error' },
        { status: 400 }
      )
    }

    // Validate settings
    if (!settings.llmModel || settings.questionCount <= 0) {
      console.error('❌ Invalid settings:', settings)
      return NextResponse.json(
        { error: 'Invalid settings: LLM model and question count are required' },
        { status: 400 }
      )
    }

    // Validate database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Database connection verified')
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          hint: 'Check DATABASE_URL and ensure database is accessible'
        },
        { status: 500 }
      )
    }

    // Validate topic/subtopic if provided
    let selectedTopicName: string | null = null
    let selectedSubtopicName: string | null = null

    if (settings.topicId) {
      try {
        const topic = await prisma.topic.findUnique({ where: { id: settings.topicId } })
        if (!topic) {
          console.error('❌ Topic not found:', settings.topicId)
          return NextResponse.json(
            { error: 'Invalid topic ID' },
            { status: 400 }
          )
        }
        selectedTopicName = topic.name
        console.log('✅ Valid topic:', topic.name)
      } catch (topicError) {
        console.error('❌ Error validating topic:', topicError)
        return NextResponse.json(
          { error: 'Failed to validate topic', details: topicError instanceof Error ? topicError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    if (settings.subtopicId) {
      try {
        const subtopic = await prisma.subtopic.findUnique({ where: { id: settings.subtopicId } })
        if (!subtopic) {
          console.error('❌ Subtopic not found:', settings.subtopicId)
          return NextResponse.json(
            { error: 'Invalid subtopic ID' },
            { status: 400 }
          )
        }
        selectedSubtopicName = subtopic.name
        console.log('✅ Valid subtopic:', subtopic.name)
      } catch (subtopicError) {
        console.error('❌ Error validating subtopic:', subtopicError)
        return NextResponse.json(
          { error: 'Failed to validate subtopic', details: subtopicError instanceof Error ? subtopicError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    if (settings.specificTopics && !Array.isArray(settings.specificTopics)) {
      return NextResponse.json(
        { error: 'specificTopics must be an array of strings' },
        { status: 400 }
      )
    }

    if (settings.specificSubtopics && !Array.isArray(settings.specificSubtopics)) {
      return NextResponse.json(
        { error: 'specificSubtopics must be an array of strings' },
        { status: 400 }
      )
    }

    const specificTopics = [
      ...(settings.specificTopics || []),
      ...(selectedTopicName ? [selectedTopicName] : [])
    ]

    const specificSubtopics = [
      ...(settings.specificSubtopics || []),
      ...(selectedSubtopicName ? [selectedSubtopicName] : [])
    ]

    const normalizedSpecificTopics = [...new Set(specificTopics.map(t => t.trim()).filter(Boolean))]
    const normalizedSpecificSubtopics = [...new Set(specificSubtopics.map(s => s.trim()).filter(Boolean))]

    console.log('🚀 Starting enhanced AI question generation...')
    console.log('Settings:', settings)

    // Generate questions using the unified service (6-step pipeline)
    let result
    try {
      result = await unifiedQuestionGenerator.generateQuestions({
        mathCount: settings.mathCount,
        readingCount: settings.readingCount,
        specializedMode: settings.specializedMode ?? false,
        specificTopics: normalizedSpecificTopics,
        specificSubtopics: normalizedSpecificSubtopics,
        includeImages: settings.includeCharts,
        includePassages: settings.includePassages,
        storeInDatabase: true,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        enableRetry: true,
        enableValidation: true,
        moduleType: settings.moduleType || 'both',
        difficulty: settings.difficulty || 'mixed'
      })
      console.log(`✅ Pipeline complete: ${result.summary.accepted}/${result.summary.total} questions accepted`)
    } catch (genError) {
      console.error('❌ Question generation failed:', genError)
      return NextResponse.json(
        { 
          error: 'Failed to generate questions', 
          details: genError instanceof Error ? genError.message : 'Unknown generation error',
          stack: process.env.NODE_ENV === 'development' && genError instanceof Error ? genError.stack : undefined
        },
        { status: 500 }
      )
    }

    // Extract accepted and rejected questions
    // Extract accepted and rejected questions
    const acceptedQuestions = result.questions.filter(q => q.isAccepted)
    const rejectedQuestions = result.questions.filter(q => !q.isAccepted)

    console.log(`✅ Final results: ${acceptedQuestions.length} accepted, ${rejectedQuestions.length} rejected`)

    // Return results (questions already stored in database by unified service)
    return NextResponse.json({
      success: true,
      summary: {
        generated: result.summary.total,
        evaluated: result.summary.total,
        accepted: result.summary.accepted,
        rejected: result.summary.rejected,
        stored: result.summary.accepted, // Unified service stores accepted questions
        needsReview: rejectedQuestions.length,
        retryCount: result.summary.retryCount,
        validationErrors: result.summary.validationErrors
      },
      questions: {
        accepted: acceptedQuestions.map(q => ({
          question: q.question,
          moduleType: q.moduleType,
          difficulty: q.difficulty,
          subtopic: q.subtopic,
          qualityScore: q.qualityScore || 0,
          explanation: q.explanation,
          options: q.options,
          correctAnswer: q.correctAnswer,
          passage: q.passage,
          imageUrl: q.imageUrl,
          chartDescription: q.chartDescription,
          evaluationFeedback: q.evaluationFeedback || '',
          needsReview: false // Already filtered to accepted
        })),
        rejected: rejectedQuestions.map(q => ({
          question: q.question,
          moduleType: q.moduleType,
          subtopic: q.subtopic,
          qualityScore: q.qualityScore,
          evaluationFeedback: q.evaluationFeedback || ''
        }))
      }
    })
  } catch (error) {
    console.error('Enhanced AI question generation failed:', error)
    
    // Provide detailed error information
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name
    } : { message: 'Unknown error', name: 'UnknownError' }
    
    // Add diagnostic information
    const diagnostics = {
      hasAzureApiKey: !!process.env.AZURE_OPENAI_API_KEY,
      hasEndpointUrl: !!(process.env.ENDPOINT_URL || process.env.AZURE_OPENAI_ENDPOINT),
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: errorDetails.message,
        errorType: errorDetails.name,
        stack: errorDetails.stack,
        diagnostics: diagnostics,
        hint: 'Check Vercel deployment logs for more details. Visit /api/admin/health-check for system diagnostics.'
      },
      { status: 500 }
    )
  }
}
