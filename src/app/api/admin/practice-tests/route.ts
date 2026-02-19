/**
 * Admin Practice Tests API
 * Epic #61: Fixed SAT Practice Tests
 * 
 * POST /api/admin/practice-tests - Create a new practice test (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating a practice test
const createPracticeTestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  difficulty: z.enum(['diagnostic', 'standard', 'advanced']),
  modules: z.array(
    z.object({
      moduleIndex: z.number().int().min(0).max(3),
      moduleType: z.enum(['reading-writing', 'math']),
      questionIds: z.array(z.string()),
    })
  ).length(4), // Must have exactly 4 modules
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication and admin role
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: Add proper admin role check when user roles are implemented
    // For now, we'll allow any authenticated user
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { success: false, error: 'Admin access required' },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const validationResult = createPracticeTestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, description, difficulty, modules } = validationResult.data;

    // Validation: Check module structure
    const module0 = modules.find(m => m.moduleIndex === 0);
    const module1 = modules.find(m => m.moduleIndex === 1);
    const module2 = modules.find(m => m.moduleIndex === 2);
    const module3 = modules.find(m => m.moduleIndex === 3);

    if (!module0 || !module1 || !module2 || !module3) {
      return NextResponse.json(
        { success: false, error: 'All 4 modules (0-3) must be provided' },
        { status: 400 }
      );
    }

    // Validate module 0 and 1: 27 RW questions each
    if (module0.moduleType !== 'reading-writing' || module0.questionIds.length !== 27) {
      return NextResponse.json(
        { success: false, error: 'Module 0 must have exactly 27 reading-writing questions' },
        { status: 400 }
      );
    }

    if (module1.moduleType !== 'reading-writing' || module1.questionIds.length !== 27) {
      return NextResponse.json(
        { success: false, error: 'Module 1 must have exactly 27 reading-writing questions' },
        { status: 400 }
      );
    }

    // Validate module 2 and 3: 22 math questions each
    if (module2.moduleType !== 'math' || module2.questionIds.length !== 22) {
      return NextResponse.json(
        { success: false, error: 'Module 2 must have exactly 22 math questions' },
        { status: 400 }
      );
    }

    if (module3.moduleType !== 'math' || module3.questionIds.length !== 22) {
      return NextResponse.json(
        { success: false, error: 'Module 3 must have exactly 22 math questions' },
        { status: 400 }
      );
    }

    // Collect all question IDs and check for duplicates
    const allQuestionIds = modules.flatMap(m => m.questionIds);
    const uniqueQuestionIds = new Set(allQuestionIds);

    if (uniqueQuestionIds.size !== allQuestionIds.length) {
      return NextResponse.json(
        { success: false, error: 'Duplicate question IDs found within the test' },
        { status: 400 }
      );
    }

    // Verify all questions exist, are active, and not already reserved
    const questions = await prisma.question.findMany({
      where: {
        id: { in: allQuestionIds },
      },
      select: {
        id: true,
        isActive: true,
        isReserved: true,
        moduleType: true,
      },
    });

    if (questions.length !== allQuestionIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some question IDs do not exist in the database' },
        { status: 400 }
      );
    }

    const inactiveQuestions = questions.filter(q => !q.isActive);
    if (inactiveQuestions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some questions are inactive',
          inactiveQuestionIds: inactiveQuestions.map(q => q.id),
        },
        { status: 400 }
      );
    }

    const reservedQuestions = questions.filter(q => q.isReserved);
    if (reservedQuestions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some questions are already reserved for another practice test',
          reservedQuestionIds: reservedQuestions.map(q => q.id),
        },
        { status: 400 }
      );
    }

    // Verify question moduleTypes match the module assignments
    for (const module of modules) {
      const moduleQuestions = questions.filter(q => module.questionIds.includes(q.id));
      const wrongTypeQuestions = moduleQuestions.filter(q => q.moduleType !== module.moduleType);
      
      if (wrongTypeQuestions.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Module ${module.moduleIndex} has questions with wrong moduleType`,
            expectedType: module.moduleType,
            wrongQuestionIds: wrongTypeQuestions.map(q => q.id),
          },
          { status: 400 }
        );
      }
    }

    // Check for name uniqueness
    const existingTest = await prisma.practiceTest.findUnique({
      where: { name },
    });

    if (existingTest) {
      return NextResponse.json(
        { success: false, error: 'A practice test with this name already exists' },
        { status: 409 }
      );
    }

    // Create practice test with questions in a transaction
    const practiceTest = await prisma.$transaction(async (tx) => {
      // Create practice test
      const test = await tx.practiceTest.create({
        data: {
          name,
          description: description || null,
          difficulty,
          isPublished: false, // Created as draft
        },
      });

      // Create practice test questions with ordering
      let globalOrderIndex = 0;
      for (const module of modules) {
        for (const questionId of module.questionIds) {
          await tx.practiceTestQuestion.create({
            data: {
              practiceTestId: test.id,
              questionId,
              moduleIndex: module.moduleIndex,
              orderIndex: globalOrderIndex,
            },
          });
          globalOrderIndex++;
        }
      }

      return test;
    });

    console.log(`[admin/practice-tests] Created practice test: ${practiceTest.name} (ID: ${practiceTest.id})`);

    return NextResponse.json({
      success: true,
      practiceTest: {
        id: practiceTest.id,
        name: practiceTest.name,
        description: practiceTest.description,
        difficulty: practiceTest.difficulty,
        isPublished: practiceTest.isPublished,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('[admin/practice-tests] Error creating practice test:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create practice test',
      },
      { status: 500 }
    );
  }
}
