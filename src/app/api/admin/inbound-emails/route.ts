import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import { listInboundEmails } from '@/lib/inbound-emails'

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
    const limitParam = Number(searchParams.get('limit') || 50)
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(Math.round(limitParam), 200)) : 50
    const emails = await listInboundEmails(limit)

    return NextResponse.json({ emails })
  } catch (error) {
    console.error('[GET /api/admin/inbound-emails]', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}