import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a review' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { rating, description, hasDiagram } = body;

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: params.id },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Create or update review
    const review = await prisma.questionReview.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId: params.id,
        },
      },
      create: {
        questionId: params.id,
        userId: user.id,
        rating,
        description: description || null,
        hasDiagram: hasDiagram || false,
      },
      update: {
        rating,
        description: description || null,
        hasDiagram: hasDiagram || false,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

// GET reviews for a specific question
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviews = await prisma.questionReview.findMany({
      where: { questionId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
