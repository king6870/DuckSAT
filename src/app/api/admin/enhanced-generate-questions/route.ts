import { NextRequest, NextResponse } from 'next/server'

// Adapter endpoint that validates an admin API key and forwards the generation request
// to the internal /api/admin/generate-questions endpoint. This keeps a stable documented
// endpoint while using the existing generation implementation.

const DEFAULT_TIMEOUT = 30_000

async function fetchWithTimeout(url: string, opts: any = {}, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const merged = { ...opts, signal: controller.signal }
    const res = await fetch(url, merged as any)
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { 'Allow': 'POST' } }
    )
  }

  // Simple admin auth using ADMIN_API_KEY environment variable. If ADMIN_API_KEY is not set,
  // requests are allowed through (to maintain compatibility in local dev). For production,
  // set ADMIN_API_KEY to require Authorization: Bearer <key>.
  const adminKey = process.env.ADMIN_API_KEY
  const authHeader = (request.headers.get('authorization') || '') as string
  if (adminKey) {
    if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Missing or invalid Authorization header.' },
        { status: 401 }
      )
    }
  }

  // Determine base URL to reach internal endpoints. Prefer NEXT_PUBLIC_BASE_URL or BASE_URL, fallback to host header.
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || `http://${request.headers.get('host')}`
  const target = new URL('/api/admin/generate-questions', base).toString()

  const body = await request.json()

  const maxAttempts = parseInt(process.env.ENHANCED_GENERATION_RETRIES || '2', 10) + 1
  let attempt = 0
  let lastErr: any = null

  while (attempt < maxAttempts) {
    attempt += 1
    try {
      const forwardHeaders: any = { 'Content-Type': 'application/json' }
      // Forward the admin API key if present
      if (adminKey) forwardHeaders['Authorization'] = `Bearer ${adminKey}`

      const forwardRes = await fetchWithTimeout(target, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify(body),
      }, parseInt(process.env.ENHANCED_GENERATION_TIMEOUT_MS || `${DEFAULT_TIMEOUT}`, 10))

      const text = await forwardRes.text()
      let parsed: any = null
      try { parsed = JSON.parse(text) } catch (e) { parsed = { raw: text } }

      if (!forwardRes.ok) {
        return NextResponse.json(
          { error: 'Generation service error', details: parsed },
          { status: forwardRes.status }
        )
      }

      // Return the generated response directly
      return NextResponse.json(parsed, { status: 200 })
    } catch (err) {
      lastErr = err
      // Simple retry/backoff
      if (attempt < maxAttempts) {
        const backoff = Math.min(60000, 500 * Math.pow(2, attempt))
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
    }
  }

  console.error('enhanced-generate-questions failed:', lastErr)
  return NextResponse.json(
    { error: 'Failed to reach generation service', message: String(lastErr) },
    { status: 502 }
  )
}
