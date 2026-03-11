/**
 * Practice Tests API - List Endpoint
 * Epic #61: Fixed SAT Practice Tests
 * 
 * GET /api/practice-tests - List all published practice tests with user attempt data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Query all published practice tests
    const tests = await prisma.practiceTest.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        createdAt: true,
        _count: {
          select: {
            questions: true, // Total question count
          },
        },
      },
      orderBy: {
        name: 'asc', // Sort Practice Test 1, 2, 3...
      },
    });

    // If user is authenticated, fetch attempt data
    if (session?.user?.id) {
      const testsWithAttempts = await Promise.all(
        tests.map(async (test) => {
          const attempts = await prisma.testResult.findMany({
            where: {
              userId: session.user.id,
              practiceTestId: test.id,
            },
            select: {
              score: true,
              satTotalScore: true,
              completedAt: true,
            },
            orderBy: {
              completedAt: 'desc',
            },
          });

          const bestScore = attempts.length > 0 
            ? Math.max(...attempts.map(a => a.score))
            : null;
          
          const bestSatScore = attempts.length > 0
            ? Math.max(...attempts.map(a => a.satTotalScore || 0))
            : null;

          const lastAttemptAt = attempts.length > 0
            ? attempts[0].completedAt
            : null;

          return {
            id: test.id,
            name: test.name,
            description: test.description,
            difficulty: test.difficulty,
            questionCount: test._count.questions,
            isPublished: true,
            userAttempts: attempts.length,
            bestScore,
            bestSatScore,
            lastAttemptAt,
          };
        })
      );

      return NextResponse.json({
        success: true,
        tests: testsWithAttempts,
      });
    }

    // Return tests without user-specific data for unauthenticated users
    const testsPublic = tests.map(test => ({
      id: test.id,
      name: test.name,
      description: test.description,
      difficulty: test.difficulty,
      questionCount: test._count.questions,
      isPublished: true,
    }));

    return NextResponse.json({
      success: true,
      tests: testsPublic,
    });

  } catch (error) {
    console.error('[practice-tests] Error listing tests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch practice tests',
      },
      { status: 500 }
    );
  }
}
