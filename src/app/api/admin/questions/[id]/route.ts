import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        question: true,
        passage: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        wrongAnswerExplanations: true,
        moduleType: true,
        difficulty: true,
        category: true,
        subtopic: true,
        subtopicId: true,
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
        updatedAt: true
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      question: question
    })

  } catch (error) {
    console.error('Error fetching question:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch question' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        question: body.question,
        passage: body.passage,
        options: body.options,
        correctAnswer: body.correctAnswer,
        explanation: body.explanation,
        wrongAnswerExplanations: body.wrongAnswerExplanations,
        moduleType: body.moduleType,
        difficulty: body.difficulty,
        category: body.category,
        subtopic: body.subtopic,
        chartData: body.chartData,
        timeEstimate: body.timeEstimate,
        tags: body.tags,
        isActive: body.isActive
      }
    })

    return NextResponse.json({
      success: true,
      question: updatedQuestion
    })

  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ 
      error: 'Failed to update question' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.question.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json({ 
      error: 'Failed to delete question' 
    }, { status: 500 })
  }
}
