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

  const referralCount = await prisma.referral.count({ where: { referrerId: userId } })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ducksatapp.azurewebsites.net'
  const link = `${baseUrl}/auth/signup?ref=${code}`

  return NextResponse.json({
    code,
    link,
    count: referralCount,
    bonusTests: user.bonusPracticeTests ?? 0,
  })
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
