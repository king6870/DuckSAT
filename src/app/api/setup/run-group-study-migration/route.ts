import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runGroupStudyMigration } from '@/lib/runGroupStudyMigration'

// GET /api/setup/run-group-study-migration?secret=<SETUP_MIGRATION_SECRET>
// One-time setup endpoint for friends + group-study schema provisioning.
export async function GET(req: NextRequest) {
  const secret = process.env.SETUP_MIGRATION_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'SETUP_MIGRATION_SECRET is not configured in environment variables.' },
      { status: 403 }
    )
  }

  const provided = req.nextUrl.searchParams.get('secret')
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Invalid or missing secret.' }, { status: 403 })
  }

  const result = await runGroupStudyMigration(prisma)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
