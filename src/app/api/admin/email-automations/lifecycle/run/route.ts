import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import { runLifecycleAutomationSweep } from '@/lib/lifecycle-email-events'

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as { referenceDate?: string }
    const referenceDate = body.referenceDate ? new Date(body.referenceDate) : new Date()

    if (Number.isNaN(referenceDate.getTime())) {
      return NextResponse.json({ error: 'referenceDate must be a valid ISO date' }, { status: 400 })
    }

    const summary = await runLifecycleAutomationSweep(referenceDate)
    return NextResponse.json({ success: true, summary, referenceDate: referenceDate.toISOString() })
  } catch (error) {
    console.error('[POST /api/admin/email-automations/lifecycle/run]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}