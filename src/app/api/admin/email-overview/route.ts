import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import { getEmailOverview } from '@/lib/email-overview'

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const overview = await getEmailOverview()
    return NextResponse.json(overview)
  } catch (error) {
    console.error('[GET /api/admin/email-overview]', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}