/**
 * API Endpoint: Generate Questions (proxy)
 * POST /api/question-generation/generate
 *
 * Forwards to /api/admin/enhanced-generate-questions to avoid duplicate logic.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const upstreamUrl = new URL('/api/admin/enhanced-generate-questions', request.nextUrl.origin)
    const bodyText = await request.text()

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') ?? 'application/json',
        'Cookie': request.headers.get('cookie') ?? '',
      },
      body: bodyText,
    })

    const responseText = await upstreamResponse.text()
    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Proxy generation failed', details: errorMessage },
      { status: 500 }
    )
  }
}
