import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import {
  LIFECYCLE_EVENT_NAMES,
  recordLifecycleAutomationEvent,
} from '@/lib/lifecycle-email-events'
import { prisma } from '@/lib/prisma'

// Simple in-memory rate limiter: max 5 signup attempts per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000 // 10 minutes
  const limit = 5

  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// Prune stale entries periodically to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 60 * 1000)

const USERNAME_RE = /^[a-zA-Z0-9_]+$/
const REFERRAL_CODE_RE = /^[A-Z0-9]{6,10}$/

/** Generate a unique 8-char alphanumeric referral code */
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
  // Fallback: use timestamp suffix for uniqueness
  return 'DK' + Date.now().toString(36).toUpperCase().slice(-6)
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: { username?: unknown; password?: unknown; referralCode?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const rawReferralCode = typeof body.referralCode === 'string' ? body.referralCode.trim().toUpperCase() : ''

  // Server-side validation
  if (!username || username.length < 3 || username.length > 20 || !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: 'invalid_username' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const lowerUsername = username.toLowerCase()

  // Check uniqueness (case-insensitive — usernames stored lowercase)
  const existing = await prisma.user.findFirst({
    where: { username: lowerUsername },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 })
  }

  // Validate referral code (if provided)
  // Wrapped in try-catch: if referral columns don't exist yet (migration pending),
  // we silently skip referral tracking rather than blocking signup entirely.
  let referrer: { id: string } | null = null
  let activeReferralCode = rawReferralCode
  let referralColumnsExist = true

  if (rawReferralCode) {
    if (!REFERRAL_CODE_RE.test(rawReferralCode)) {
      return NextResponse.json({ error: 'invalid_referral_code' }, { status: 400 })
    }
    try {
      referrer = await prisma.user.findFirst({
        where: { referralCode: rawReferralCode },
        select: { id: true },
      })
      if (!referrer) {
        return NextResponse.json({ error: 'referral_code_not_found' }, { status: 404 })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('referralCode') || msg.includes('Invalid column')) {
        // Migration not applied yet — skip referral validation
        referralColumnsExist = false
        referrer = null
        activeReferralCode = ''
        console.warn('[signup] referral columns missing, skipping referral tracking')
      } else {
        throw err
      }
    }
  }

  // Hash password (cost factor 12)
  const passwordHash = await hash(password, 12)

  // Generate this user's own referral code (skip if columns don't exist)
  const myReferralCode = referralColumnsExist ? await generateReferralCode() : null

  // Create user
  let newUser: { id: string }
  try {
    newUser = await prisma.user.create({
      data: {
        username: lowerUsername,
        email: `${lowerUsername}@duck.local`, // synthetic — never emailed
        name: lowerUsername,
        passwordHash,
        ...(myReferralCode !== null && {
          referralCode: myReferralCode,
          referredByCode: activeReferralCode || null,
        }),
      },
      select: { id: true },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Unique constraint violation (race condition on username or email)
    if (msg.includes('Unique constraint') || msg.includes('unique constraint') || msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 })
    }
    // If referral columns don't exist, retry without them
    if (msg.includes('referralCode') || msg.includes('referredByCode') || msg.includes('Invalid column')) {
      console.warn('[signup] referral columns missing on create, retrying without referral fields')
      try {
        newUser = await prisma.user.create({
          data: {
            username: lowerUsername,
            email: `${lowerUsername}@duck.local`,
            name: lowerUsername,
            passwordHash,
          },
          select: { id: true },
        })
        referrer = null // can't award referrer without migration
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        if (fallbackMsg.includes('Unique constraint') || fallbackMsg.includes('unique constraint') || fallbackMsg.includes('UNIQUE')) {
          return NextResponse.json({ error: 'username_taken' }, { status: 409 })
        }
        console.error('[signup] DB error on fallback create:', fallbackErr)
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    } else {
      console.error('[signup] DB error:', err)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  // Award referrer a bonus practice test
  if (referrer) {
    try {
      await prisma.$transaction([
        prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: newUser.id,
            codeUsed: activeReferralCode,
          },
        }),
        prisma.user.update({
          where: { id: referrer.id },
          data: { bonusPracticeTests: { increment: 1 } },
        }),
      ])
    } catch (err) {
      // Non-fatal: referral record creation failed (e.g. duplicate or migration pending)
      console.error('[signup] referral award error:', err)
    }
  }

  try {
    await recordLifecycleAutomationEvent({
      userId: newUser.id,
      eventName: LIFECYCLE_EVENT_NAMES.accountCreated,
      triggerKey: LIFECYCLE_EVENT_NAMES.accountCreated,
      metadata: {
        signupSource: 'credentials',
        referralSignup: Boolean(referrer),
      },
    })
  } catch (error) {
    console.error('[signup] lifecycle automation error:', error)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

