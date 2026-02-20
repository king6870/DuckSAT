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
      return NextResponse.json(
        { success: false, error: 'Practice test not found' },
        { status: 404 }
      );
    }

    if (!practiceTest.isPublished) {
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
    const whereClause: any = {
      practiceTestId: id,
    };

    if (moduleIndex !== null) {
      whereClause.moduleIndex = moduleIndex;
    }

    // Fetch questions with deterministic ordering
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
            imageData: true,
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

    // Parse JSON fields and convert imageData to base64
    const questions = practiceTestQuestions.map((ptq) => {
      const q = ptq.question;
      return {
        id: q.id,
        question: q.question,
        passage: q.passage,
        options: JSON.parse(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        wrongAnswerExplanations: q.wrongAnswerExplanations 
          ? JSON.parse(q.wrongAnswerExplanations)
          : null,
        moduleType: q.moduleType,
        category: q.category,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        imageData: q.imageData 
          ? `data:${q.imageMimeType || 'image/svg+xml'};base64,${q.imageData.toString('base64')}`
          : null,
        imageAlt: q.imageAlt,
        chartData: q.chartData ? JSON.parse(q.chartData) : null,
        timeEstimate: q.timeEstimate,
        tags: JSON.parse(q.tags),
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
    console.error('[practice-tests] Error fetching test:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch practice test',
      },
      { status: 500 }
    );
  }
}
