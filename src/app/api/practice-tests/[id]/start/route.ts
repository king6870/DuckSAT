/**
 * Practice Test Start Endpoint
 *
 * POST /api/practice-tests/[id]/start
 *
 * Enforces per-plan monthly usage limits server-side before the test runner
 * loads any questions. This is the single server-side enforcement point for
 * practice test gating.
 *
 * Returns:
 *   200: { allowed: true, used: number, limit: number | null }
 *   401: { error: 'Unauthorized' }
 *   403: { error: 'Plan upgrade required', message: string }
 *   404: { error: 'Not found' }
 *   429: { allowed: false, used: number, limit: number, resetDate: string, message: string }
 *
 * Plan limits (from stripe-config.ts):
 *   free    → 1 test/month (only Test 1 may be started; all others are plan-locked)
 *   monthly → 10 tests/month
 *   yearly  → 15 tests/month
 *   tester  → unlimited (isTester flag bypasses all gating)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkUsageLimit, incrementUsage } from '@/lib/subscription';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Tests that free-plan users may access (by exact name)
const FREE_ACCESSIBLE_TESTS = new Set(['SAT Practice Test 1']);

export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = session.user.id;

    // Verify test exists and is published
    const practiceTest = await prisma.practiceTest.findUnique({
      where: { id },
      select: { id: true, name: true, isPublished: true },
    });
    if (!practiceTest || !practiceTest.isPublished) {
      return NextResponse.json({ error: 'Practice test not found' }, { status: 404 });
    }

    // Look up user plan + tester flag
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        isTester: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Testers bypass all limits
    if (user.isTester) {
      await incrementUsage(userId, 'practice_test');
      return NextResponse.json({ allowed: true, used: null, limit: null });
    }

    // Derive effective plan
    const effectivePlan = getEffectivePlan(user);

    // Free plan: enforce plan-access lock (only Test 1 accessible)
    if (effectivePlan === 'free' && !FREE_ACCESSIBLE_TESTS.has(practiceTest.name)) {
      return NextResponse.json(
        {
          error: 'Plan upgrade required',
          message: 'Upgrade to Monthly or Yearly to access all 50 practice tests.',
          upgradeUrl: '/pricing',
        },
        { status: 403 },
      );
    }

    // Check monthly usage limit
    const { allowed, used, limit } = await checkUsageLimit(userId, 'practice_test');

    if (!allowed) {
      // Reset is always 1st of next calendar month at 00:00 UTC
      const now = new Date();
      const resetDate = new Date(Date.UTC(
        now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(),
        now.getUTCMonth() === 11 ? 0 : now.getUTCMonth() + 1,
        1,
      ));

      return NextResponse.json(
        {
          allowed: false,
          used,
          limit,
          resetDate: resetDate.toISOString(),
          message: `You've used all ${limit} practice test${limit === 1 ? '' : 's'} for this month. Your limit resets on ${resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`,
        },
        { status: 429 },
      );
    }

    // Allowed — record usage
    await incrementUsage(userId, 'practice_test');

    return NextResponse.json({ allowed: true, used: used + 1, limit });
  } catch (error) {
    console.error('[practice-tests/start] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Mirrors getEffectivePlan from subscription.ts (can't import the private one).
 * Returns the active plan key: 'free' | 'monthly' | 'yearly'
 */
function getEffectivePlan(user: {
  subscriptionPlan: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
}): string {
  const { subscriptionPlan, subscriptionStatus, currentPeriodEnd } = user;
  if (['active', 'trialing', 'past_due'].includes(subscriptionStatus)) {
    return subscriptionPlan;
  }
  if (subscriptionStatus === 'canceled' && currentPeriodEnd && currentPeriodEnd > new Date()) {
    return subscriptionPlan;
  }
  return 'free';
}
