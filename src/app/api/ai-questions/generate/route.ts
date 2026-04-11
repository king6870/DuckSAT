// API endpoint for AI question generation
import { NextRequest, NextResponse } from 'next/server'
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'
import { prisma } from '@/lib/prisma'

export async function POST(_request: NextRequest) {
  try {
    console.log('🚀 Starting AI question generation...')
    
    // Run the full 6-step pipeline: initialize → generate → evaluate → retry → validate → store
    const result = await unifiedQuestionGenerator.generateQuestions({ storeInDatabase: true })

    const acceptedQuestions = result.questions.filter(q => q.isAccepted)
    const rejectedQuestions = result.questions.filter(q => !q.isAccepted)

    console.log(`✅ Accepted: ${acceptedQuestions.length}, ❌ Rejected: ${rejectedQuestions.length}`)
    
    return NextResponse.json({
      success: true,
      summary: {
        generated: result.summary.total,
        evaluated: result.summary.total,
        accepted: result.summary.accepted,
        rejected: result.summary.rejected,
        stored: result.summary.accepted,
      },
      questions: {
        accepted: acceptedQuestions,
        rejected: rejectedQuestions
      }
    })
  } catch (error) {
    console.error('AI question generation failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get recent AI-generated questions
    const recentQuestions = await prisma.question.findMany({
      where: {
        source: 'AI Generated (GPT-5)'
      },
      select: {
        id: true,
        question: true,
        moduleType: true,
        difficulty: true,
        category: true,
        subtopic: true,
        subtopicId: true,
        passage: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        wrongAnswerExplanations: true,
        imageUrl: true,
        imageAlt: true,
        chartData: true,
        timeEstimate: true,
        source: true,
        tags: true,
        isActive: true,
        reviewStatus: true,
        reviewComments: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        subtopicRef: {
          select: {
            id: true,
            name: true,
            description: true,
            topic: {
              select: {
                id: true,
                name: true,
                moduleType: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    // Get generation statistics
    const stats = {
      totalAIQuestions: await prisma.question.count({
        where: { source: 'AI Generated (GPT-5)' }
      }),
      byDifficulty: {
        easy: await prisma.question.count({
          where: { 
            source: 'AI Generated (GPT-5)',
            difficulty: 'easy'
          }
        }),
        medium: await prisma.question.count({
          where: { 
            source: 'AI Generated (GPT-5)',
            difficulty: 'medium'
          }
        }),
        hard: await prisma.question.count({
          where: { 
            source: 'AI Generated (GPT-5)',
            difficulty: 'hard'
          }
        })
      },
      byModule: {
        math: await prisma.question.count({
          where: { 
            source: 'AI Generated (GPT-5)',
            moduleType: 'math'
          }
        }),
        reading: await prisma.question.count({
          where: { 
            source: 'AI Generated (GPT-5)',
            moduleType: 'reading-writing'
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      recentQuestions: recentQuestions.map(q => ({
        id: q.id,
        question: q.question.substring(0, 100) + '...',
        difficulty: q.difficulty,
        moduleType: q.moduleType,
        category: q.category,
        subtopic: q.subtopic,
        points: Math.round(q.timeEstimate / 30),
        hasPassage: !!q.passage,
        hasChart: !!q.chartData,
        createdAt: q.createdAt
      }))
    })
  } catch (error) {
    console.error('Failed to get AI questions:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve AI questions' },
      { status: 500 }
    )
  }
}
