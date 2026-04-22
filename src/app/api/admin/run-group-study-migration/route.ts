import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'
import { runGroupStudyMigration } from '@/lib/runGroupStudyMigration'

// POST /api/admin/run-group-study-migration
// Admin-only endpoint to apply friends + group-study schema safely.
export async function POST() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? ''
  if (!ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runGroupStudyMigration(prisma)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
