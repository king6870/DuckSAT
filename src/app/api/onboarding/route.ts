import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  formatLifecycleDate,
  getDaysUntilDate,
  LIFECYCLE_EVENT_NAMES,
  recordLifecycleAutomationEvent,
} from '@/lib/lifecycle-email-events'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    highestSATScore,
    bluebookTestsTaken,
    otherPrepApps,
    strongCategories,
    weakCategories,
    targetScore,
    satTestDate,
    gradeLevel,
  } = body

  const parsedHighestSATScore = highestSATScore ? parseInt(highestSATScore, 10) : null
  const parsedBluebookTestsTaken = bluebookTestsTaken ? parseInt(bluebookTestsTaken, 10) : null
  const parsedTargetScore = targetScore ? parseInt(targetScore, 10) : null
  const parsedSatTestDate = satTestDate ? new Date(satTestDate) : null
  const normalizedSatTestDate = parsedSatTestDate && !Number.isNaN(parsedSatTestDate.getTime())
    ? parsedSatTestDate
    : null

  const existingUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      highestSATScore: true,
      targetScore: true,
      satTestDate: true,
    },
  })

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      onboardingCompleted: true,
      highestSATScore: parsedHighestSATScore,
      bluebookTestsTaken: parsedBluebookTestsTaken,
      otherPrepApps: otherPrepApps ? JSON.stringify(otherPrepApps) : null,
      strongCategories: strongCategories ? JSON.stringify(strongCategories) : null,
      weakCategories: weakCategories ? JSON.stringify(weakCategories) : null,
      targetScore: parsedTargetScore,
      satTestDate: normalizedSatTestDate,
      gradeLevel: gradeLevel || null,
    },
  })

  const satTestDateChanged = (existingUser.satTestDate?.toISOString() || '') !== (normalizedSatTestDate?.toISOString() || '')
  const targetScoreChanged = parsedTargetScore !== existingUser.targetScore

  if ((parsedTargetScore || normalizedSatTestDate) && (targetScoreChanged || satTestDateChanged)) {
    try {
      const scoreGap =
        parsedTargetScore != null && existingUser.highestSATScore != null
          ? parsedTargetScore - existingUser.highestSATScore
          : null
      await recordLifecycleAutomationEvent({
        userId: existingUser.id,
        eventName: LIFECYCLE_EVENT_NAMES.goalSet,
        triggerKey: `${LIFECYCLE_EVENT_NAMES.goalSet}:${parsedTargetScore ?? 'none'}:${normalizedSatTestDate ? normalizedSatTestDate.toISOString().slice(0, 10) : 'none'}`,
        metadata: {
          targetScore: parsedTargetScore,
          currentScore: parsedHighestSATScore ?? existingUser.highestSATScore ?? '',
          scoreGap: scoreGap ?? '',
          satTestDate: normalizedSatTestDate ? formatLifecycleDate(normalizedSatTestDate) : '',
          testDate: normalizedSatTestDate ? formatLifecycleDate(normalizedSatTestDate) : '',
          daysUntilTest: normalizedSatTestDate ? getDaysUntilDate(normalizedSatTestDate) : '',
          gradeLevel: gradeLevel || '',
        },
      })
    } catch (error) {
      console.error('[/api/onboarding] lifecycle automation error:', error)
    }
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      onboardingCompleted: true,
      highestSATScore: true,
      bluebookTestsTaken: true,
      otherPrepApps: true,
      strongCategories: true,
      weakCategories: true,
      targetScore: true,
      satTestDate: true,
      gradeLevel: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...user,
    otherPrepApps: user.otherPrepApps ? JSON.parse(user.otherPrepApps) : [],
    strongCategories: user.strongCategories ? JSON.parse(user.strongCategories) : [],
    weakCategories: user.weakCategories ? JSON.parse(user.weakCategories) : [],
  })
}
