import { prisma } from './prisma';
import { getPlanLimits } from './stripe-config';

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
      trialEnd: true,
      cancelAtPeriodEnd: true,
      bonusPracticeTests: true,
    },
  });

  if (!user) return null;

  const effectivePlan = getEffectivePlan(user);
  const limits = getPlanLimits(effectivePlan);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const [testUsage, drillUsage] = await Promise.all([
    prisma.usageRecord.findUnique({
      where: { userId_type_year_month: { userId, type: 'practice_test', year, month } },
    }),
    prisma.usageRecord.findUnique({
      where: { userId_type_year_month: { userId, type: 'drill', year, month } },
    }),
  ]);

  const baseTestLimit = limits.practiceTestsPerMonth;
  const testLimit = baseTestLimit === Infinity
    ? Infinity
    : baseTestLimit + (user.bonusPracticeTests ?? 0);

  return {
    plan: effectivePlan,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    trialEnd: user.trialEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    stripeCustomerId: user.stripeCustomerId,
    bonusPracticeTests: user.bonusPracticeTests ?? 0,
    usage: {
      practiceTests: {
        used: testUsage?.count ?? 0,
        limit: testLimit,
      },
      drills: {
        used: drillUsage?.count ?? 0,
        limit: limits.drillsPerMonth,
      },
    },
  };
}

export async function checkUsageLimit(userId: string, type: 'practice_test' | 'drill') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true, subscriptionStatus: true, currentPeriodEnd: true, bonusPracticeTests: true },
  });

  if (!user) return { allowed: false, used: 0, limit: 0 };

  const effectivePlan = getEffectivePlan(user);
  const limits = getPlanLimits(effectivePlan);
  const baseLimit = type === 'practice_test' ? limits.practiceTestsPerMonth : limits.drillsPerMonth;
  const limit = (type === 'practice_test' && baseLimit !== Infinity)
    ? baseLimit + (user.bonusPracticeTests ?? 0)
    : baseLimit;

  if (limit === Infinity) return { allowed: true, used: 0, limit: Infinity };

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const usage = await prisma.usageRecord.findUnique({
    where: { userId_type_year_month: { userId, type, year, month } },
  });

  const used = usage?.count ?? 0;
  return { allowed: used < limit, used, limit };
}

export async function incrementUsage(userId: string, type: 'practice_test' | 'drill') {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  await prisma.usageRecord.upsert({
    where: { userId_type_year_month: { userId, type, year, month } },
    update: { count: { increment: 1 } },
    create: { userId, type, year, month, count: 1 },
  });
}

function getEffectivePlan(user: {
  subscriptionPlan: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
}) {
  const { subscriptionPlan, subscriptionStatus, currentPeriodEnd } = user;

  // Paid subscriptions keep premium access.
  if (['active', 'past_due'].includes(subscriptionStatus)) {
    return subscriptionPlan;
  }

  // Canceled but still within paid period
  if (subscriptionStatus === 'canceled' && currentPeriodEnd && currentPeriodEnd > new Date()) {
    return subscriptionPlan;
  }

  // Everything else falls back to free
  return 'free';
}
