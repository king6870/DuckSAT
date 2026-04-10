import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
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

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: { username?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

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

  // Hash password (cost factor 12)
  const passwordHash = await hash(password, 12)

  // Create user
  try {
    await prisma.user.create({
      data: {
        username: lowerUsername,
        email: `${lowerUsername}@duck.local`, // synthetic — never emailed
        name: lowerUsername,
        passwordHash,
      },
    })
  } catch (err) {
    // Unique constraint violation (race condition on username or email)
    if (
      err instanceof Error &&
      (err.message.includes('Unique constraint') || err.message.includes('unique'))
    ) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 })
    }
    console.error('[signup] DB error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
