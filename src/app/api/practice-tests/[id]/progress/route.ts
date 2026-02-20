/**
 * Practice Test Progress API
 * Epic #61: Fixed SAT Practice Tests
 * 
 * GET /api/practice-tests/[id]/progress - Return user's attempt history for a specific practice test
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

    // Fetch practice test
    const practiceTest = await prisma.practiceTest.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isPublished: true,
      },
    });

    if (!practiceTest) {
      return NextResponse.json(
        { success: false, error: 'Practice test not found' },
        { status: 404 }
      );
    }

    // Fetch all user attempts for this practice test
    const attempts = await prisma.testResult.findMany({
      where: {
        userId: session.user.id,
        practiceTestId: id,
      },
      select: {
        attemptNumber: true,
        score: true,
        satTotalScore: true,
        satReadingScore: true,
        satMathScore: true,
        totalTimeSpent: true,
        completedAt: true,
        categoryPerformance: true,
        subtopicPerformance: true,
        difficultyPerformance: true,
      },
      orderBy: {
        attemptNumber: 'asc',
      },
    });

    if (attempts.length === 0) {
      return NextResponse.json({
        success: true,
        progress: {
          practiceTestId: practiceTest.id,
          practiceTestName: practiceTest.name,
          totalAttempts: 0,
          bestScore: null,
          bestSatScore: null,
          improvement: null,
          attempts: [],
        },
      });
    }

    const bestScore = Math.max(...attempts.map(a => a.score));
    const bestSatScore = Math.max(...attempts.map(a => a.satTotalScore || 0));
    
    // Calculate improvement (first attempt vs latest attempt)
    const firstAttempt = attempts[0];
    const latestAttempt = attempts[attempts.length - 1];
    const improvement = firstAttempt.score > 0
      ? ((latestAttempt.score - firstAttempt.score) / firstAttempt.score) * 100
      : 0;

    // Parse JSON fields for attempts
    const attemptsData = attempts.map(attempt => ({
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      satTotalScore: attempt.satTotalScore,
      satReadingScore: attempt.satReadingScore,
      satMathScore: attempt.satMathScore,
      totalTimeSpent: attempt.totalTimeSpent,
      completedAt: attempt.completedAt,
      categoryPerformance: attempt.categoryPerformance 
        ? JSON.parse(attempt.categoryPerformance)
        : null,
      subtopicPerformance: attempt.subtopicPerformance
        ? JSON.parse(attempt.subtopicPerformance)
        : null,
      difficultyPerformance: attempt.difficultyPerformance
        ? JSON.parse(attempt.difficultyPerformance)
        : null,
    }));

    return NextResponse.json({
      success: true,
      progress: {
        practiceTestId: practiceTest.id,
        practiceTestName: practiceTest.name,
        totalAttempts: attempts.length,
        bestScore,
        bestSatScore,
        improvement: Math.round(improvement * 10) / 10, // Round to 1 decimal
        attempts: attemptsData,
      },
    });

  } catch (error) {
    console.error('[practice-tests] Error fetching progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch progress',
      },
      { status: 500 }
    );
  }
}
