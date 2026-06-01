import 'server-only'

import { processEmailAutomationEvent } from '@/lib/email-automations'
import { prisma } from '@/lib/prisma'

export const LIFECYCLE_EVENT_TYPE = 'lifecycle'

export const LIFECYCLE_EVENT_NAMES = {
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

const STUDY_STREAK_MILESTONES = [3, 5, 7, 10, 14, 30] as const
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

type LifecycleMetadata = Record<string, string | number | boolean>

interface LifecycleEventInput {
  userId: string
  eventName: string
  triggerKey: string
  metadata?: Record<string, unknown>
  pagePath?: string
}

function startOfDay(value: Date): Date {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

function toDateKey(value: Date): string {
  return startOfDay(value).toISOString().slice(0, 10)
}

function normalizeMetadata(metadata?: Record<string, unknown>): LifecycleMetadata | undefined {
  if (!metadata) {
    return undefined
  }

  const normalizedEntries = Object.entries(metadata)
    .map(([key, value]) => {
      if (!key.trim() || value == null) {
        return null
      }

      if (value instanceof Date) {
        return [key, value.toISOString()] as const
      }

      if (Array.isArray(value)) {
        const flattened = value
          .filter((item) => item != null)
          .map((item) => String(item).trim())
          .filter(Boolean)
          .join(', ')

        return flattened ? ([key, flattened] as const) : null
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [key, value] as const
      }

      return [key, JSON.stringify(value)] as const
    })
    .filter((entry): entry is readonly [string, string | number | boolean] => entry != null)

  if (normalizedEntries.length === 0) {
    return undefined
  }

  return Object.fromEntries(normalizedEntries)
}

export function formatLifecycleDate(value: Date | string | null | undefined): string {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return DATE_FORMATTER.format(date)
}

export function getDaysUntilDate(targetDate: Date | string, referenceDate = new Date()): number {
  const target = startOfDay(targetDate instanceof Date ? targetDate : new Date(targetDate))
  const reference = startOfDay(referenceDate)
  const diffMs = target.getTime() - reference.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

export function getDaysSinceDate(value: Date | string, referenceDate = new Date()): number {
  const target = startOfDay(value instanceof Date ? value : new Date(value))
  const reference = startOfDay(referenceDate)
  const diffMs = reference.getTime() - target.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

export async function recordLifecycleAutomationEvent(input: LifecycleEventInput): Promise<void> {
  const metadata = normalizeMetadata(input.metadata)

  await prisma.userEvent.create({
    data: {
      userId: input.userId,
      eventType: LIFECYCLE_EVENT_TYPE,
      eventName: input.eventName,
      metadata: metadata ? JSON.stringify(metadata) : null,
      pagePath: input.pagePath || null,
    },
  })

  await processEmailAutomationEvent({
    userId: input.userId,
    triggerType: 'user_event',
    triggerKey: input.triggerKey,
    eventType: LIFECYCLE_EVENT_TYPE,
    eventName: input.eventName,
    pagePath: input.pagePath,
    metadata,
  })
}

export async function getCurrentStudyStreakDays(userId: string, referenceDate = new Date()): Promise<number> {
  const today = startOfDay(referenceDate)

  const activityDays = await prisma.userDailyActivity.findMany({
    where: {
      userId,
      date: { lte: today },
      OR: [
        { questionsAnswered: { gt: 0 } },
        { drillsCompleted: { gt: 0 } },
        { testsCompleted: { gt: 0 } },
      ],
    },
    orderBy: { date: 'desc' },
    select: { date: true },
    take: 60,
  })

  if (activityDays.length === 0) {
    return 0
  }

  const uniqueDayKeys = Array.from(new Set(activityDays.map((entry) => toDateKey(entry.date))))

  if (uniqueDayKeys[0] !== toDateKey(today)) {
    return 0
  }

  let streakDays = 0
  const cursor = new Date(today)

  for (const dayKey of uniqueDayKeys) {
    if (dayKey !== toDateKey(cursor)) {
      break
    }

    streakDays += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streakDays
}

export async function maybeEmitStudyStreakMilestone(userId: string, referenceDate = new Date()): Promise<number | null> {
  const streakDays = await getCurrentStudyStreakDays(userId, referenceDate)

  if (!STUDY_STREAK_MILESTONES.includes(streakDays as (typeof STUDY_STREAK_MILESTONES)[number])) {
    return null
  }

  await recordLifecycleAutomationEvent({
    userId,
    eventName: LIFECYCLE_EVENT_NAMES.studyStreakMilestone,
    triggerKey: `${LIFECYCLE_EVENT_NAMES.studyStreakMilestone}:${streakDays}`,
    metadata: {
      studyStreakDays: streakDays,
      currentStudyStreakDays: streakDays,
      streakMilestone: streakDays,
    },
  })

  return streakDays
}

export interface LifecycleAutomationSweepSummary {
  profileIncomplete48Hours: number
  weeklySummary: number
  inactiveSevenDays: number
  officialTestFourteenDays: number
  officialTestOneDay: number
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(value: Date): Date {
  const next = startOfDay(value)
  const day = next.getDay()
  const offset = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + offset)
  return next
}

function buildWeeklyMiniGoal(input: {
  accuracyRate: number
  drillsCompleted: number
  testsCompleted: number
}): string {
  if (input.testsCompleted === 0) {
    return 'Take one full practice test this week to get a fresh score snapshot.'
  }

  if (input.drillsCompleted < 3) {
    return 'Complete 3 short drills this week to keep momentum high.'
  }

  if (input.accuracyRate < 70) {
    return 'Spend 20 focused minutes on your weakest topic before your next test.'
  }

  return 'Protect the streak with one focused DuckSAT session tomorrow.'
}

export async function runLifecycleAutomationSweep(referenceDate = new Date()): Promise<LifecycleAutomationSweepSummary> {
  const summary: LifecycleAutomationSweepSummary = {
    profileIncomplete48Hours: 0,
    weeklySummary: 0,
    inactiveSevenDays: 0,
    officialTestFourteenDays: 0,
    officialTestOneDay: 0,
  }

  const incompleteCutoff = new Date(referenceDate.getTime() - 48 * 60 * 60 * 1000)
  const incompleteUsers = await prisma.user.findMany({
    where: {
      createdAt: { lte: incompleteCutoff },
      satTestDate: null,
    },
    select: {
      id: true,
      createdAt: true,
      targetScore: true,
    },
  })

  for (const user of incompleteUsers) {
    await recordLifecycleAutomationEvent({
      userId: user.id,
      eventName: LIFECYCLE_EVENT_NAMES.profileIncomplete48Hours,
      triggerKey: LIFECYCLE_EVENT_NAMES.profileIncomplete48Hours,
      metadata: {
        targetScore: user.targetScore ?? '',
        hoursSinceSignup: Math.floor((referenceDate.getTime() - user.createdAt.getTime()) / (60 * 60 * 1000)),
      },
      pagePath: '/onboarding',
    })
    summary.profileIncomplete48Hours += 1
  }

  const currentWeekStart = startOfWeek(referenceDate)
  const previousWeekStart = addDays(currentWeekStart, -7)
  const previousWeekEndExclusive = currentWeekStart
  const previousWeekLabel = `${formatLifecycleDate(previousWeekStart)} - ${formatLifecycleDate(addDays(currentWeekStart, -1))}`
  const weeklyRows = await prisma.userDailyActivity.findMany({
    where: {
      date: {
        gte: previousWeekStart,
        lt: previousWeekEndExclusive,
      },
    },
    select: {
      userId: true,
      questionsAnswered: true,
      questionsCorrect: true,
      drillsCompleted: true,
      testsCompleted: true,
      totalTimeMs: true,
    },
  })

  const weeklyStats = new Map<string, {
    questionsAnswered: number
    questionsCorrect: number
    drillsCompleted: number
    testsCompleted: number
    totalTimeMs: number
  }>()

  for (const row of weeklyRows) {
    const current = weeklyStats.get(row.userId) ?? {
      questionsAnswered: 0,
      questionsCorrect: 0,
      drillsCompleted: 0,
      testsCompleted: 0,
      totalTimeMs: 0,
    }

    current.questionsAnswered += row.questionsAnswered
    current.questionsCorrect += row.questionsCorrect
    current.drillsCompleted += row.drillsCompleted
    current.testsCompleted += row.testsCompleted
    current.totalTimeMs += row.totalTimeMs
    weeklyStats.set(row.userId, current)
  }

  for (const [userId, stats] of weeklyStats) {
    const accuracyRate = stats.questionsAnswered > 0
      ? Math.round((stats.questionsCorrect / stats.questionsAnswered) * 100)
      : 0

    await recordLifecycleAutomationEvent({
      userId,
      eventName: LIFECYCLE_EVENT_NAMES.weeklySummary,
      triggerKey: `${LIFECYCLE_EVENT_NAMES.weeklySummary}:${toDateKey(previousWeekStart)}`,
      metadata: {
        weeklySummaryPeriod: previousWeekLabel,
        weeklyQuestionsAnswered: stats.questionsAnswered,
        weeklyQuestionsCorrect: stats.questionsCorrect,
        weeklyDrillsCompleted: stats.drillsCompleted,
        weeklyTestsCompleted: stats.testsCompleted,
        weeklyStudyTimeHours: Number((stats.totalTimeMs / (60 * 60 * 1000)).toFixed(1)),
        weeklyAccuracyRate: accuracyRate,
        weeklyMiniGoal: buildWeeklyMiniGoal({
          accuracyRate,
          drillsCompleted: stats.drillsCompleted,
          testsCompleted: stats.testsCompleted,
        }),
      },
      pagePath: '/progress',
    })
    summary.weeklySummary += 1
  }

  const inactivityCutoff = addDays(startOfDay(referenceDate), -7)
  const lastActivityByUser = await prisma.userDailyActivity.groupBy({
    by: ['userId'],
    _max: { date: true },
  })
  const lastActivityMap = new Map(lastActivityByUser.map((entry) => [entry.userId, entry._max.date]))
  const inactivityCandidates = await prisma.user.findMany({
    where: {
      createdAt: { lte: inactivityCutoff },
    },
    select: {
      id: true,
    },
  })

  for (const user of inactivityCandidates) {
    const lastActiveDate = lastActivityMap.get(user.id) ?? null
    if (lastActiveDate && startOfDay(lastActiveDate) > inactivityCutoff) {
      continue
    }

    await recordLifecycleAutomationEvent({
      userId: user.id,
      eventName: LIFECYCLE_EVENT_NAMES.inactiveSevenDays,
      triggerKey: `${LIFECYCLE_EVENT_NAMES.inactiveSevenDays}:${lastActiveDate ? toDateKey(lastActiveDate) : 'never'}`,
      metadata: {
        daysInactive: lastActiveDate ? getDaysSinceDate(lastActiveDate, referenceDate) : 7,
        lastActiveDate: lastActiveDate ? formatLifecycleDate(lastActiveDate) : 'Never',
      },
      pagePath: '/dashboard',
    })
    summary.inactiveSevenDays += 1
  }

  const usersWithTestDates = await prisma.user.findMany({
    where: {
      satTestDate: { not: null },
    },
    select: {
      id: true,
      targetScore: true,
      satTestDate: true,
    },
  })

  for (const user of usersWithTestDates) {
    if (!user.satTestDate) {
      continue
    }

    const daysUntilTest = getDaysUntilDate(user.satTestDate, referenceDate)
    if (daysUntilTest !== 14 && daysUntilTest !== 1) {
      continue
    }

    const eventName = daysUntilTest === 14
      ? LIFECYCLE_EVENT_NAMES.officialTestFourteenDays
      : LIFECYCLE_EVENT_NAMES.officialTestOneDay

    await recordLifecycleAutomationEvent({
      userId: user.id,
      eventName,
      triggerKey: `${eventName}:${toDateKey(user.satTestDate)}`,
      metadata: {
        targetScore: user.targetScore ?? '',
        satTestDate: formatLifecycleDate(user.satTestDate),
        testDate: formatLifecycleDate(user.satTestDate),
        daysUntilTest,
      },
      pagePath: '/practice-tests',
    })

    if (daysUntilTest === 14) {
      summary.officialTestFourteenDays += 1
    } else {
      summary.officialTestOneDay += 1
    }
  }

  return summary
}