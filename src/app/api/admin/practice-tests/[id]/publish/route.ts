/**
 * Admin Practice Test Publish API
 * Epic #61: Fixed SAT Practice Tests
 * 
 * PUT /api/admin/practice-tests/[id]/publish - Publish a practice test and reserve questions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication and admin role
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Admin authorization via email allowlist
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Fetch practice test with questions
    const practiceTest = await prisma.practiceTest.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            questionId: true,
          },
        },
      },
    });

    if (!practiceTest) {
      return NextResponse.json(
        { success: false, error: 'Practice test not found' },
        { status: 404 }
      );
    }

    if (practiceTest.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Practice test is already published' },
        { status: 400 }
      );
    }

    const questionIds = practiceTest.questions.map(q => q.questionId);

    if (questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Practice test has no questions' },
        { status: 400 }
      );
    }

    // Publish test and reserve questions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark practice test as published
      const updatedTest = await tx.practiceTest.update({
        where: { id },
        data: {
          isPublished: true,
          updatedAt: new Date(),
        },
      });

      // Mark all questions as reserved
      const updateResult = await tx.question.updateMany({
        where: {
          id: { in: questionIds },
        },
        data: {
          isReserved: true,
          updatedAt: new Date(),
        },
      });

      return {
        test: updatedTest,
        reservedCount: updateResult.count,
      };
    });

    console.log(
      `[admin/practice-tests] Published test: ${practiceTest.name} (ID: ${id}), ` +
      `reserved ${result.reservedCount} questions`
    );

    return NextResponse.json({
      success: true,
      published: true,
      reservedQuestionCount: result.reservedCount,
    });

  } catch (error) {
    console.error('[admin/practice-tests] Error publishing test:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to publish practice test',
      },
      { status: 500 }
    );
  }
}
