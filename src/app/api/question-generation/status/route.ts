/**
 * API Endpoint: Get Generation Status (not implemented)
 * GET /api/question-generation/status
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Status endpoint not implemented. Use /api/admin/questions for latest results.' },
    { status: 501 }
  )
}
