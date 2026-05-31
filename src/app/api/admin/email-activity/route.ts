import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import { listRecentEmailActivity } from '@/lib/email-activity'

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit') || 12)
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(Math.round(limitParam), 100)) : 12
    const activity = await listRecentEmailActivity(limit)

    return NextResponse.json(activity)
  } catch (error) {
    console.error('[GET /api/admin/email-activity]', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}