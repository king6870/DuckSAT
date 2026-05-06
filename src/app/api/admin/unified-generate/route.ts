/**
 * Unified Question Generation API
 * 
 * This endpoint consolidates all question generation functionality into a single,
 * well-organized API with comprehensive options.
 * 
 * Features:
 * - Generate math and/or reading questions
 * - Filter by topic, subtopic, difficulty
 * - Configurable AI parameters (temperature, max tokens)
 * - Optional evaluation and database storage
 * - Detailed response with summary and question details
 * 
 * Usage:
 *   POST /api/admin/unified-generate
 *   Body: { mathCount: 5, readingCount: 5, storeInDatabase: true, ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { unifiedQuestionGenerator, GenerationOptions } from '@/services/unifiedQuestionGenerator'
import { prisma } from '@/lib/prisma'

type RequestBody = GenerationOptions & {
  includeCharts?: boolean
  topicId?: string
  subtopicId?: string
}

/**
 * POST handler for question generation
 */
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

    // Parse request body
    const body: RequestBody = await request.json()

    const specificTopicsFromBody = Array.isArray(body.specificTopics)
      ? body.specificTopics.filter((topic): topic is string => typeof topic === 'string')
      : undefined
    const specificSubtopicsFromBody = Array.isArray(body.specificSubtopics)
      ? body.specificSubtopics.filter((subtopic): subtopic is string => typeof subtopic === 'string')
      : undefined

    let specificTopics = specificTopicsFromBody
    let specificSubtopics = specificSubtopicsFromBody

    // Validate topic/subtopic IDs (legacy compatibility) and convert to name-based filters.
    if (body.topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: body.topicId } })
      if (!topic) {
        return NextResponse.json(
          { error: 'Invalid topic ID' },
          { status: 400 }
        )
      }
      specificTopics = [topic.name]
    }

    if (body.subtopicId) {
      const subtopic = await prisma.subtopic.findUnique({ where: { id: body.subtopicId } })
      if (!subtopic) {
        return NextResponse.json(
          { error: 'Invalid subtopic ID' },
          { status: 400 }
        )
      }
      specificSubtopics = [subtopic.name]
    }

    // Validate and set defaults
    const options: GenerationOptions = {
      mathCount: body.mathCount ?? 5,
      readingCount: body.readingCount ?? 5,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.maxTokens ?? 4000,
      includeImages: body.includeImages ?? body.includeCharts ?? true,
      includePassages: body.includePassages ?? true,
      storeInDatabase: body.storeInDatabase ?? false,
      skipEvaluation: body.skipEvaluation ?? false,
      moduleType: body.moduleType,
      difficulty: body.difficulty,
      specificTopics,
      specificSubtopics,
    }

    // Validate ranges
    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
      return NextResponse.json(
        { error: 'Temperature must be between 0 and 2' },
        { status: 400 }
      )
    }

    if (options.maxTokens !== undefined && (options.maxTokens < 1000 || options.maxTokens > 8000)) {
      return NextResponse.json(
        { error: 'Max tokens must be between 1000 and 8000' },
        { status: 400 }
      )
    }

    if ((options.mathCount ?? 0) + (options.readingCount ?? 0) === 0) {
      return NextResponse.json(
        { error: 'Must specify at least one question type (mathCount or readingCount)' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting unified question generation...')
    console.log('Options:', JSON.stringify(options, null, 2))

    // Generate questions
    const result = await unifiedQuestionGenerator.generateQuestions(options)

    console.log('✅ Generation complete:', result.summary)

    // Format response
    const acceptedQuestions = result.questions.filter((question) => question.isAccepted)
    const rejectedQuestions = result.questions.filter((question) => !question.isAccepted)

    return NextResponse.json({
      success: true,
      summary: result.summary,
      questions: {
        accepted: acceptedQuestions.map((q) => ({
          question: q.question,
          moduleType: q.moduleType,
          difficulty: q.difficulty,
          subtopic: q.subtopic,
          qualityScore: q.qualityScore,
          explanation: q.explanation,
          options: q.options,
          correctAnswer: q.correctAnswer,
          passage: q.passage,
          chartDescription: q.chartDescription,
          evaluationFeedback: q.evaluationFeedback,
          needsReview: q.evaluationFeedback?.includes('Fallback evaluation'),
        })),
        rejected: rejectedQuestions.map((q) => ({
          question: q.question,
          moduleType: q.moduleType,
          subtopic: q.subtopic,
          evaluationFeedback: q.evaluationFeedback,
        })),
      },
    })
  } catch (error) {
    console.error('❌ Unified question generation failed:', error)

    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    } : { message: 'Unknown error' }

    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: errorDetails.message,
        stack: errorDetails.stack,
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for information about this endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/unified-generate',
    description: 'Unified question generation API with comprehensive options',
    method: 'POST',
    authentication: 'Admin session required',
    requestBody: {
      mathCount: 'number (default: 5) - Number of math questions to generate',
      readingCount: 'number (default: 5) - Number of reading questions to generate',
      temperature: 'number (0-2, default: 0.7) - AI creativity level',
      maxTokens: 'number (1000-8000, default: 4000) - Maximum response length',
      includeImages: 'boolean (default: true) - Include diagrams/images for math questions',
      includePassages: 'boolean (default: true) - Include passages for reading questions',
      storeInDatabase: 'boolean (default: false) - Store accepted questions in database',
      skipEvaluation: 'boolean (default: false) - Skip quality evaluation step',
      moduleType: 'string ("math" | "reading-writing") - Filter by module type',
      difficulty: 'string ("easy" | "medium" | "hard") - Filter by difficulty',
      specificTopics: 'string[] - Filter by topic names',
      specificSubtopics: 'string[] - Filter by subtopic names',
      topicId: 'string (UUID, optional compatibility) - Converted to specificTopics',
      subtopicId: 'string (UUID, optional compatibility) - Converted to specificSubtopics',
    },
    response: {
      success: 'boolean',
      summary: {
        total: 'number - Total questions generated',
        accepted: 'number - Questions accepted after evaluation',
        rejected: 'number - Questions rejected after evaluation',
        mathCount: 'number - Math questions generated',
        readingCount: 'number - Reading questions generated',
        avgQuality: 'number - Average quality score',
        retryCount: 'number - Questions regenerated during retry step',
        validationErrors: 'number - Questions flagged by validation',
      },
      questions: {
        accepted: 'array - Accepted question details',
        rejected: 'array - Rejected question details',
      },
    },
    examples: [
      {
        name: 'Basic generation',
        request: { mathCount: 3, readingCount: 3 },
      },
      {
        name: 'Generate and store',
        request: { mathCount: 5, readingCount: 5, storeInDatabase: true },
      },
      {
        name: 'Math only, hard difficulty',
        request: { mathCount: 10, readingCount: 0, difficulty: 'hard' },
      },
      {
        name: 'Specific subtopic',
        request: { mathCount: 5, subtopicId: 'clq...' },
      },
    ],
  })
}
