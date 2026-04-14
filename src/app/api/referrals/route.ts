import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** GET /api/referrals — returns the current user's referral info */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, bonusPracticeTests: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate code if missing (e.g. old accounts pre-referral feature)
    let code = user.referralCode
    if (!code) {
      code = await generateReferralCode()
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
    }

    let referralCount = 0
    try {
      referralCount = await prisma.referral.count({ where: { referrerId: userId } })
    } catch {
      // referrals table may not exist yet (migration pending)
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ducksatapp.azurewebsites.net'
    const link = `${baseUrl}/auth/signup?ref=${code}`

    return NextResponse.json({
      code,
      link,
      count: referralCount,
      bonusTests: user.bonusPracticeTests ?? 0,
    })
  } catch (err: unknown) {
    // If columns don't exist yet (migration pending), return a provisional response
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes('referralCode') ||
      msg.includes('Invalid column') ||
      msg.includes('bonusPracticeTests')
    ) {
      console.warn('[referrals] DB schema not yet migrated, returning provisional response')
      // Generate a deterministic code from the user ID so it's stable across requests
      const provisional = deterministicCode(userId)
      const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ducksatapp.azurewebsites.net'
      return NextResponse.json({
        code: provisional,
        link: `${baseUrl}/auth/signup?ref=${provisional}`,
        count: 0,
        bonusTests: 0,
        migrationPending: true,
      })
    }
    console.error('[referrals] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Stable 8-char code derived from user ID — used before migration runs */
function deterministicCode(userId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  let code = ''
  for (let i = 0; i < 8; i++) {
    hash = ((hash << 5) - hash) + i
    hash |= 0
    code += chars[Math.abs(hash) % chars.length]
  }
  return code
}

async function generateReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    const conflict = await prisma.user.findFirst({ where: { referralCode: code }, select: { id: true } })
    if (!conflict) return code
  }
  return 'DK' + Date.now().toString(36).toUpperCase().slice(-6)
}
