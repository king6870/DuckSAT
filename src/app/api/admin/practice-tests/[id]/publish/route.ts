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

    // Fetch practice test with questions and module/question type metadata for validation
    const practiceTest = await prisma.practiceTest.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              select: {
                moduleType: true,
              },
            },
          },
        },
      },
    });

    if (!practiceTest) {
      console.warn('[admin/practice-tests] Publish failed: test not found', {
        practiceTestId: id,
        adminEmail: session.user.email,
      })
      return NextResponse.json(
        { success: false, error: 'Practice test not found' },
        { status: 404 }
      );
    }

    if (practiceTest.isPublished) {
      console.warn('[admin/practice-tests] Publish skipped: test already published', {
        practiceTestId: id,
        adminEmail: session.user.email,
      })
      return NextResponse.json(
        { success: false, error: 'Practice test is already published' },
        { status: 400 }
      );
    }

    const questionIds = practiceTest.questions.map(q => q.questionId);

    if (questionIds.length === 0) {
      console.warn('[admin/practice-tests] Publish failed: no questions linked', {
        practiceTestId: id,
        adminEmail: session.user.email,
      })
      return NextResponse.json(
        { success: false, error: 'Practice test has no questions' },
        { status: 400 }
      );
    }

    // Publish-time validation guard (prevents incomplete tests from going live)
    const expectedModuleIndexes = [0, 1, 2, 3]
    const expectedModuleTypes: Record<number, 'reading-writing' | 'math'> = {
      0: 'reading-writing',
      1: 'reading-writing',
      2: 'math',
      3: 'math',
    }

    const moduleCounts = new Map<number, number>()
    const unexpectedModuleIndexes = new Set<number>()
    const moduleTypeIssues: string[] = []

    for (const assignment of practiceTest.questions) {
      moduleCounts.set(assignment.moduleIndex, (moduleCounts.get(assignment.moduleIndex) || 0) + 1)

      if (!expectedModuleIndexes.includes(assignment.moduleIndex)) {
        unexpectedModuleIndexes.add(assignment.moduleIndex)
        continue
      }

      const expectedType = expectedModuleTypes[assignment.moduleIndex]
      const actualType = assignment.question.moduleType as 'reading-writing' | 'math'
      if (actualType !== expectedType) {
        moduleTypeIssues.push(
          `Module ${assignment.moduleIndex} expects ${expectedType} but found ${actualType} question ${assignment.questionId}`
        )
      }
    }

    const missingModuleIndexes = expectedModuleIndexes.filter(index => !moduleCounts.has(index))
    const emptyModuleIndexes = expectedModuleIndexes.filter(index => (moduleCounts.get(index) || 0) === 0)

    const issues: string[] = [
      ...missingModuleIndexes.map(index => `Missing module index ${index}`),
      ...emptyModuleIndexes.map(index => `Module ${index} has 0 questions`),
      ...Array.from(unexpectedModuleIndexes).map(index => `Unexpected module index ${index}`),
      ...moduleTypeIssues,
    ]

    if (issues.length > 0) {
      const moduleCountsObject = Object.fromEntries(
        Array.from(moduleCounts.entries()).sort((a, b) => a[0] - b[0]).map(([index, count]) => [String(index), count])
      )

      console.warn('[admin/practice-tests] Publish blocked by validation guard', {
        practiceTestId: id,
        adminEmail: session.user.email,
        moduleCounts: moduleCountsObject,
        issues,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Practice test is incomplete and cannot be published',
          validation: {
            passed: false,
            issues,
            moduleCounts: moduleCountsObject,
          },
        },
        { status: 400 }
      )
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
      validation: {
        passed: true,
        moduleCounts: Object.fromEntries(Array.from(moduleCounts.entries()).sort((a, b) => a[0] - b[0]).map(([index, count]) => [String(index), count])),
      },
    });

  } catch (error) {
    let testId = 'unknown'
    try {
      const params = await context.params
      testId = params.id
    } catch {
      testId = 'unknown'
    }

    console.error('[admin/practice-tests] Error publishing test', {
      practiceTestId: testId,
      error,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to publish practice test',
      },
      { status: 500 }
    );
  }
}
