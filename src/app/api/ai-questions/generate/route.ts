// API endpoint for AI question generation
import { NextRequest, NextResponse } from 'next/server'
import { aiQuestionService } from '@/services/aiQuestionService'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting AI question generation...')
    
    // Generate questions with GPT-5
    const generatedQuestions = await aiQuestionService.generateQuestions()
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
            source: 'AI Generated (GPT-5)',
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
