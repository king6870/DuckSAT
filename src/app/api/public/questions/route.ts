import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '10')
        const category = searchParams.get('category')

        // Build where clause for pending questions
        const where: any = {
            reviewStatus: 'pending',
            isActive: true
        }

        if (category) {
            where.category = category
        }

        // Get random pending questions
        // Note: Prisma doesn't support RANDOM() natively in findMany, so we'll fetch a batch
        // For a real production app with millions of rows, we'd need a more efficient random strategy
        const questions = await prisma.question.findMany({
            where,
            select: {
                id: true,
                moduleType: true,
                difficulty: true,
                category: true,
                subtopic: true,
                question: true,
                passage: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                imageUrl: true,
                imageData: true,
                imageMimeType: true,
                chartData: true,
                reviewStatus: true,
                createdAt: true
            },
            take: limit,
            orderBy: {
                createdAt: 'desc' // Just get recent ones for now, or we could randomize in app
            }
        })

        // Convert binary imageData to base64 strings
        const processedQuestions = questions.map(q => ({
            ...q,
            imageData: q.imageData ? Buffer.from(q.imageData).toString('base64') : null
        }))

        return NextResponse.json({
            questions: processedQuestions
        })

    } catch (error) {
        console.error('Error fetching public questions:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { questionId, reviewStatus, reviewComments, reviewRating, diagramAccurate } = body

        if (!questionId || !reviewStatus) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!['approved', 'rejected'].includes(reviewStatus)) {
            return NextResponse.json({ error: 'Invalid review status' }, { status: 400 })
        }

        // Update the question
        // Note: In a real public app, you might want to just log a "vote" instead of immediately changing status
        // But for this request, we'll allow direct modification as requested "easier to traverse" implies a tool for the team
        const updatedQuestion = await prisma.question.update({
            where: { id: questionId },
            data: {
                reviewStatus,
                reviewRating: reviewRating || null,
                diagramAccurate: diagramAccurate !== undefined ? diagramAccurate : null,
                reviewComments: reviewComments || null,
                reviewedBy: 'public_reviewer', // Placeholder since no auth
                reviewedAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            question: {
                id: updatedQuestion.id,
                reviewStatus: updatedQuestion.reviewStatus
            }
        })

    } catch (error) {
        console.error('Error updating question:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
