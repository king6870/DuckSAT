/**
 * Practice Test Detail API
 * Epic #61: Fixed SAT Practice Tests
 * 
 * GET /api/practice-tests/[id] - Fetch practice test with questions in module-ordered sequence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeDeepText, normalizeQuestionOptions, normalizeQuestionText } from '@/lib/math/textNormalization';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get('module');
    const moduleIndex = moduleParam !== null ? parseInt(moduleParam, 10) : null;

    // Validate module index if provided
    if (moduleIndex !== null && (moduleIndex < 0 || moduleIndex > 3)) {
      console.warn('[practice-tests] Invalid module query parameter', {
        practiceTestId: id,
        userId: session.user.id,
        moduleParam,
      })
      return NextResponse.json(
        { success: false, error: 'Invalid module index. Must be 0-3' },
        { status: 400 }
      );
    }

    // Fetch practice test
    const practiceTest = await prisma.practiceTest.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        isPublished: true,
      },
    });

    if (!practiceTest) {
      console.warn('[practice-tests] Practice test not found', {
        practiceTestId: id,
        userId: session.user.id,
      })
      return NextResponse.json(
        { success: false, error: 'Practice test not found' },
        { status: 404 }
      );
    }

    if (!practiceTest.isPublished) {
      console.warn('[practice-tests] Attempt to access unpublished practice test', {
        practiceTestId: id,
        userId: session.user.id,
      })
      return NextResponse.json(
        { success: false, error: 'Practice test not published' },
        { status: 403 }
      );
    }

    // Calculate attempt number (existing attempts + 1)
    const existingAttempts = await prisma.testResult.count({
      where: {
        userId: session.user.id,
        practiceTestId: id,
      },
    });

    const attemptNumber = existingAttempts + 1;

    // Build where clause for questions
    const whereClause: Record<string, unknown> = {
      practiceTestId: id,
    };

    if (moduleIndex !== null) {
      whereClause.moduleIndex = moduleIndex;
    }

    // Fetch questions with deterministic ordering
    // Note: imageData is excluded from the bulk response to reduce payload size.
    // Images are lazy-loaded via /api/questions/[id]/image when each question is displayed.
    const practiceTestQuestions = await prisma.practiceTestQuestion.findMany({
      where: whereClause,
      include: {
        question: {
          select: {
            id: true,
            question: true,
            passage: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            wrongAnswerExplanations: true,
            moduleType: true,
            category: true,
            subtopic: true,
            difficulty: true,
            imageUrl: true,
            imageMimeType: true,
            imageAlt: true,
            chartData: true,
            timeEstimate: true,
            tags: true,
          },
        },
      },
      orderBy: [
        { moduleIndex: 'asc' },
        { orderIndex: 'asc' },
      ],
    });

    if (practiceTestQuestions.length === 0) {
      console.error('[practice-tests] Published test has zero assigned questions', {
        practiceTestId: id,
        userId: session.user.id,
        requestedModuleIndex: moduleIndex,
      })
    }

    // Parse JSON fields and convert imageData to base64
    const questions = practiceTestQuestions.map((ptq) => {
      const q = ptq.question;
      let parsedOptions: string[] = []
      let parsedWrongAnswerExplanations: unknown = null
      let parsedChartData: unknown = null
      let parsedTags: string[] = []

      parsedOptions = normalizeQuestionOptions(q.options)

      if (q.wrongAnswerExplanations) {
        try {
          parsedWrongAnswerExplanations = normalizeDeepText(JSON.parse(q.wrongAnswerExplanations))
        } catch (error) {
          console.error('[practice-tests] Failed to parse wrongAnswerExplanations', {
            practiceTestId: id,
            questionId: q.id,
            error,
          })
        }
      }

      if (q.chartData) {
        try {
          parsedChartData = JSON.parse(q.chartData)
        } catch (error) {
          console.error('[practice-tests] Failed to parse chartData', {
            practiceTestId: id,
            questionId: q.id,
            error,
          })
        }
      }

      try {
        parsedTags = JSON.parse(q.tags)
      } catch (error) {
        console.error('[practice-tests] Failed to parse tags', {
          practiceTestId: id,
          questionId: q.id,
          error,
        })
      }

      // Images are lazy-loaded via /api/questions/[id]/image instead of inlined as base64
      let resolvedImageUrl: string | null = q.imageUrl || null;
      if (!resolvedImageUrl && q.imageMimeType) {
        // Question has stored image data — point to the image API for lazy loading
        resolvedImageUrl = `/api/questions/${q.id}/image`;
      }

      return {
        id: q.id,
        question: normalizeQuestionText(q.question),
        passage: q.passage ? normalizeQuestionText(q.passage) : null,
        options: parsedOptions,
        correctAnswer: q.correctAnswer,
        explanation: normalizeQuestionText(q.explanation),
        wrongAnswerExplanations: parsedWrongAnswerExplanations,
        moduleType: q.moduleType,
        category: q.category,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        imageUrl: resolvedImageUrl,
        imageData: null,
        imageMimeType: q.imageMimeType,
        imageAlt: q.imageAlt ? normalizeQuestionText(q.imageAlt) : null,
        chartData: parsedChartData,
        timeEstimate: q.timeEstimate,
        tags: parsedTags,
        moduleIndex: ptq.moduleIndex,
        orderIndex: ptq.orderIndex,
      };
    });

    // Group by moduleIndex if fetching all modules
    if (moduleIndex === null) {
      const modules = [
        {
          moduleIndex: 0,
          moduleType: 'reading-writing',
          title: 'Reading and Writing - Module 1',
          duration: 32,
          questions: questions.filter(q => q.moduleIndex === 0),
        },
        {
          moduleIndex: 1,
          moduleType: 'reading-writing',
          title: 'Reading and Writing - Module 2',
          duration: 32,
          questions: questions.filter(q => q.moduleIndex === 1),
        },
        {
          moduleIndex: 2,
          moduleType: 'math',
          title: 'Math - Module 1',
          duration: 35,
          questions: questions.filter(q => q.moduleIndex === 2),
        },
        {
          moduleIndex: 3,
          moduleType: 'math',
          title: 'Math - Module 2',
          duration: 35,
          questions: questions.filter(q => q.moduleIndex === 3),
        },
      ];

      return NextResponse.json({
        success: true,
        test: {
          id: practiceTest.id,
          name: practiceTest.name,
          description: practiceTest.description,
          difficulty: practiceTest.difficulty,
          attemptNumber,
          modules,
        },
      });
    }

    // Return single module if specified
    return NextResponse.json({
      success: true,
      test: {
        id: practiceTest.id,
        name: practiceTest.name,
        difficulty: practiceTest.difficulty,
        attemptNumber,
        moduleIndex,
        questions,
      },
    });

  } catch (error) {
    const params = await context.params.catch(() => ({ id: 'unknown' }))
    console.error('[practice-tests] Error fetching test', {
      practiceTestId: params.id,
      error,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch practice test',
      },
      { status: 500 }
    );
  }
}
