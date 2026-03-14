import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
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
    gradeLevel,
  } = body

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      onboardingCompleted: true,
      highestSATScore: highestSATScore ? parseInt(highestSATScore, 10) : null,
      bluebookTestsTaken: bluebookTestsTaken ? parseInt(bluebookTestsTaken, 10) : null,
      otherPrepApps: otherPrepApps ? JSON.stringify(otherPrepApps) : null,
      strongCategories: strongCategories ? JSON.stringify(strongCategories) : null,
      weakCategories: weakCategories ? JSON.stringify(weakCategories) : null,
      targetScore: targetScore ? parseInt(targetScore, 10) : null,
      gradeLevel: gradeLevel || null,
    },
  })

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
