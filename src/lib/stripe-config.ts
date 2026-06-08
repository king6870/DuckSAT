export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    practiceTestsPerMonth: 1,
    drillsPerMonth: 3,
    priceId: null,
  },
  monthly: {
    name: 'Monthly',
    practiceTestsPerMonth: 10,
    drillsPerMonth: Infinity,
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    trialDays: 0,
  },
  yearly: {
    name: 'Yearly',
    practiceTestsPerMonth: 15,
    drillsPerMonth: Infinity,
    priceId: process.env.STRIPE_YEARLY_PRICE_ID!,
    trialDays: 0,
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

export function getPlanLimits(plan: string) {
  if (plan === 'monthly' || plan === 'yearly') {
    return STRIPE_PLANS[plan];
  }
  return STRIPE_PLANS.free;
}
