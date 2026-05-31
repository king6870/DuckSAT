const LIFECYCLE_EVENT_TYPE = 'lifecycle'

const LIFECYCLE_EVENT_NAMES = {
  accountCreated: 'account_created',
  goalSet: 'goal_set',
  profileIncomplete48Hours: 'profile_incomplete_48_hours',
  studyStreakMilestone: 'study_streak_milestone',
  significantScoreImprovement: 'significant_score_improvement',
  weakSpotDetected: 'weak_spot_detected',
  weeklySummary: 'weekly_summary',
  inactiveSevenDays: 'inactive_seven_days',
  officialTestFourteenDays: 'official_test_fourteen_days',
  officialTestOneDay: 'official_test_one_day',
  premiumSubscriptionPurchased: 'premium_subscription_purchased',
  subscriptionCancellationRequested: 'subscription_cancellation_requested',
} as const

export type LifecycleBlueprintTriggerType = 'user_event' | 'practice_test_completed'

export interface LifecycleEmailBlueprint {
  key: string
  templateName: string
  automationName: string
  description: string
  triggerType: LifecycleBlueprintTriggerType
  triggerFilters?: Record<string, string>
  aiPrompt: string
  triggerSummary: string
  defaultPrimaryButtonUrl?: string
  allowedTokens: string[]
}

export const SUPPORTED_LIFECYCLE_EMAIL_BLUEPRINTS: LifecycleEmailBlueprint[] = [
  {
    key: 'account-created',
    templateName: 'Lifecycle - Account created',
    automationName: 'Lifecycle - Account created',
    description: 'Welcomes new users and points them to the fastest first win inside DuckSAT.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.accountCreated,
    },
    aiPrompt: 'Write a warm welcome email for a brand-new DuckSAT user. Thank them for joining, set a high-performance tone, and direct them to start with one focused study session or their first practice test. Do not mention email verification.',
    triggerSummary: 'Fires immediately after a new account is created.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/dashboard',
    allowedTokens: ['{{firstName}}'],
  },
  {
    key: 'goal-set',
    templateName: 'Lifecycle - Goal set',
    automationName: 'Lifecycle - Goal set',
    description: 'Confirms the user target score and optional SAT date, then nudges them into a concrete prep plan.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.goalSet,
    },
    aiPrompt: 'Write an email that confirms the user target SAT score and, when available, their official test date. Use a coach-like tone and turn the goal into a concrete next step. If daysUntilTest is present, make the timeline feel urgent without sounding alarmist.',
    triggerSummary: 'Fires when a user sets or updates their target SAT score and/or official SAT test date during onboarding.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/practice-tests',
    allowedTokens: ['{{targetScore}}', '{{currentScore}}', '{{scoreGap}}', '{{testDate}}', '{{daysUntilTest}}'],
  },
  {
    key: 'profile-incomplete-48h',
    templateName: 'Lifecycle - Profile incomplete after 48 hours',
    automationName: 'Lifecycle - Profile incomplete after 48 hours',
    description: 'Reminds users to finish onboarding details so reminders and planning can work.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.profileIncomplete48Hours,
    },
    aiPrompt: 'Write a concise nudge email for a user who joined DuckSAT more than 48 hours ago but still has not added an official SAT test date. Explain that adding the date helps DuckSAT send countdown reminders and structure prep. Keep it friendly and action-oriented.',
    triggerSummary: 'Fires from the lifecycle sweep when a user is 48+ hours old and still has no official SAT test date saved.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/onboarding',
    allowedTokens: ['{{firstName}}', '{{targetScore}}', '{{hoursSinceSignup}}'],
  },
  {
    key: 'practice-test-completed',
    templateName: 'Lifecycle - Full practice test completed',
    automationName: 'Lifecycle - Full practice test completed',
    description: 'Recaps the latest full-test result and pushes the user into the right follow-up review workflow.',
    triggerType: 'practice_test_completed',
    aiPrompt: 'Write an email that recaps a completed full practice test, celebrates the effort, states the scaled score clearly, and directs the user to review mistakes and keep momentum. The tone should feel sharp and data-driven.',
    triggerSummary: 'Fires every time a user completes a full practice test.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/progress',
    allowedTokens: ['{{scaledScore}}', '{{mathScore}}', '{{readingWritingScore}}', '{{practiceTestName}}'],
  },
  {
    key: 'study-streak-milestone',
    templateName: 'Lifecycle - Study streak milestone',
    automationName: 'Lifecycle - Study streak milestone',
    description: 'Celebrates a study streak milestone and reinforces the habit loop.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.studyStreakMilestone,
    },
    aiPrompt: 'Write a short celebration email for a user who has hit a study streak milestone inside DuckSAT. Make the achievement feel earned, reinforce that consistency compounds, and ask for one more focused session today.',
    triggerSummary: 'Fires when a user reaches a tracked study streak milestone such as 3, 5, 7, 10, 14, or 30 days.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/dashboard',
    allowedTokens: ['{{studyStreakDays}}', '{{currentStudyStreakDays}}', '{{streakMilestone}}'],
  },
  {
    key: 'significant-score-improvement',
    templateName: 'Lifecycle - Significant score improvement',
    automationName: 'Lifecycle - Significant score improvement',
    description: 'Highlights meaningful score growth and pushes the user to protect the gain.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.significantScoreImprovement,
    },
    aiPrompt: 'Write an email for a user whose SAT score jumped meaningfully between full practice tests. Celebrate the improvement with conviction, name the gain, and explain that the next priority is protecting and extending the progress.',
    triggerSummary: 'Fires when DuckSAT detects a large positive SAT score delta after a full practice test.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/progress',
    allowedTokens: ['{{scaledScore}}', '{{previousScore}}', '{{improvementAmount}}', '{{mathScore}}', '{{readingWritingScore}}'],
  },
  {
    key: 'weak-spot-detected',
    templateName: 'Lifecycle - Weak spot detected',
    automationName: 'Lifecycle - Weak spot detected',
    description: 'Points the user toward the exact weak area DuckSAT just detected.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.weakSpotDetected,
    },
    aiPrompt: 'Write an email that calls out a specific weak area the system has just detected. Keep it direct but encouraging, explain that this is fixable, and tell the user to attack that exact topic now.',
    triggerSummary: 'Fires when DuckSAT detects a specific weak subtopic or category from a drill or full practice test.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/practice',
    allowedTokens: ['{{weakArea}}', '{{weakTopic}}', '{{weakAreaAccuracyRate}}'],
  },
  {
    key: 'weekly-summary',
    templateName: 'Lifecycle - Weekly summary',
    automationName: 'Lifecycle - Weekly summary',
    description: 'Summarizes the last study week and suggests the next highest-leverage move.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.weeklySummary,
    },
    aiPrompt: 'Write a weekly summary email that feels like a coach reviewing a training block. Reference the user activity stats, point out one positive signal, and give one specific mini-goal for the next week.',
    triggerSummary: 'Fires from the lifecycle sweep for the previous study week.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/progress',
    allowedTokens: ['{{weeklySummaryPeriod}}', '{{weeklyQuestionsAnswered}}', '{{weeklyQuestionsCorrect}}', '{{weeklyDrillsCompleted}}', '{{weeklyTestsCompleted}}', '{{weeklyStudyTimeHours}}', '{{weeklyAccuracyRate}}', '{{weeklyMiniGoal}}'],
  },
  {
    key: 'inactive-seven-days',
    templateName: 'Lifecycle - Inactive for 7 days',
    automationName: 'Lifecycle - Inactive for 7 days',
    description: 'Reactivates users who have gone cold for at least seven days.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.inactiveSevenDays,
    },
    aiPrompt: 'Write a reactivation email for a user who has been inactive inside DuckSAT for at least 7 days. The message should feel personal, remind them that small sessions still count, and make re-entry feel easy.',
    triggerSummary: 'Fires from the lifecycle sweep when the user has not been active for at least 7 days.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/dashboard',
    allowedTokens: ['{{daysInactive}}', '{{lastActiveDate}}'],
  },
  {
    key: 'official-test-fourteen-days',
    templateName: 'Lifecycle - Official SAT in 14 days',
    automationName: 'Lifecycle - Official SAT in 14 days',
    description: 'Shifts the user into a high-discipline two-week countdown plan.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.officialTestFourteenDays,
    },
    aiPrompt: 'Write a countdown email for a user who is exactly two weeks away from their official SAT. Make the timeline clear, emphasize focus over volume, and direct them to the most important work they should do now.',
    triggerSummary: 'Fires from the lifecycle sweep when the saved official SAT test date is exactly 14 days away.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/practice-tests',
    allowedTokens: ['{{targetScore}}', '{{testDate}}', '{{daysUntilTest}}'],
  },
  {
    key: 'official-test-one-day',
    templateName: 'Lifecycle - Official SAT tomorrow',
    automationName: 'Lifecycle - Official SAT tomorrow',
    description: 'Sends a calm, high-signal pre-test reminder one day before the SAT.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.officialTestOneDay,
    },
    aiPrompt: 'Write an email for a user whose official SAT is tomorrow. The tone should be calm, confident, and practical. Focus on what to do and what not to do in the final 24 hours.',
    triggerSummary: 'Fires from the lifecycle sweep when the saved official SAT test date is exactly 1 day away.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/practice-tests',
    allowedTokens: ['{{targetScore}}', '{{testDate}}', '{{daysUntilTest}}'],
  },
  {
    key: 'premium-purchased',
    templateName: 'Lifecycle - Premium subscription purchased',
    automationName: 'Lifecycle - Premium subscription purchased',
    description: 'Confirms the premium purchase and orients the user to their upgraded value immediately.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.premiumSubscriptionPurchased,
    },
    aiPrompt: 'Write a premium purchase confirmation email that feels premium, not transactional. Confirm the plan, remind the user what they just unlocked, and tell them the first best thing to do with the subscription.',
    triggerSummary: 'Fires immediately after Stripe reports a new premium subscription creation.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/pricing',
    allowedTokens: ['{{billingPlan}}', '{{subscriptionStatus}}', '{{currentPeriodEnd}}'],
  },
  {
    key: 'cancellation-requested',
    templateName: 'Lifecycle - Subscription cancellation requested',
    automationName: 'Lifecycle - Subscription cancellation requested',
    description: 'Confirms the cancellation request and makes the remaining access window explicit.',
    triggerType: 'user_event',
    triggerFilters: {
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: LIFECYCLE_EVENT_NAMES.subscriptionCancellationRequested,
    },
    aiPrompt: 'Write a thoughtful cancellation-request confirmation email. Confirm the user will keep access until the stated end date, keep the tone respectful, and mention what value they can still get before access ends.',
    triggerSummary: 'Fires when Stripe marks a subscription to cancel at period end.',
    defaultPrimaryButtonUrl: 'https://www.ducksat.com/pricing',
    allowedTokens: ['{{billingPlan}}', '{{accessEndsOn}}'],
  },
]

export const UNSUPPORTED_LIFECYCLE_EMAIL_BLUEPRINTS = [
  {
    key: 'password-reset-requested',
    reason: 'DuckSAT does not currently have a password reset request flow to hook into.',
  },
]