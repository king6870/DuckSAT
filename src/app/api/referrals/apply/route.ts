import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const REFERRAL_CODE_RE = /^[A-Z0-9]{6,10}$/

/**
 * POST /api/referrals/apply
 * Called after Google OAuth sign-in to retroactively apply a referral code.
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''

  if (!code || !REFERRAL_CODE_RE.test(code)) {
    return NextResponse.json({ error: 'invalid_referral_code' }, { status: 400 })
  }

  // Check if this user already has a referral applied
  const existingReferral = await prisma.referral.findUnique({ where: { refereeId: userId } })
  if (existingReferral) {
    return NextResponse.json({ error: 'referral_already_applied' }, { status: 409 })
  }

  // Check if user already has a referredByCode set
  const referee = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredByCode: true },
  })
  if (referee?.referredByCode) {
    return NextResponse.json({ error: 'referral_already_applied' }, { status: 409 })
  }

  // Find referrer
  const referrer = await prisma.user.findFirst({
    where: { referralCode: code },
    select: { id: true },
  })

  if (!referrer) {
    return NextResponse.json({ error: 'referral_code_not_found' }, { status: 404 })
  }

  // Prevent self-referral
  if (referrer.id === userId) {
    return NextResponse.json({ error: 'self_referral_not_allowed' }, { status: 400 })
  }

  // Apply referral
  try {
    await prisma.$transaction([
      prisma.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: userId,
          codeUsed: code,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { referredByCode: code },
      }),
      prisma.user.update({
        where: { id: referrer.id },
        data: { bonusPracticeTests: { increment: 1 } },
      }),
    ])
  } catch (err) {
    console.error('[referrals/apply] DB error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
