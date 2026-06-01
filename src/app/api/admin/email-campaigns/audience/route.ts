import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import { findCampaignAudience, type EmailCampaignFilters } from '@/lib/email-campaigns'

function parseBoolean(value: string | null): boolean | undefined {
  if (value == null || value === '') return undefined
  return value === 'true'
}

function parseFilters(request: NextRequest): EmailCampaignFilters {
  const { searchParams } = new URL(request.url)

  return {
    search: searchParams.get('search')?.trim() || undefined,
    plan: (searchParams.get('plan')?.trim() || 'all') as EmailCampaignFilters['plan'],
    joinedViaQr: parseBoolean(searchParams.get('joinedViaQr')),
    includeTesters: parseBoolean(searchParams.get('includeTesters')),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const audience = await findCampaignAudience(parseFilters(request))

    return NextResponse.json({
      matchedCount: audience.matchedCount,
      deliverableCount: audience.deliverableCount,
      skippedCount: audience.skippedCount,
      sample: audience.recipients.slice(0, 25),
    })
  } catch (error) {
    console.error('[GET /api/admin/email-campaigns/audience]', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}