import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import { generateEmailDraft } from '@/lib/email-ai-generator'

interface GenerateEmailRequest {
  prompt?: string
  triggerType?: string
  triggerSummary?: string
}

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as GenerateEmailRequest
    const prompt = body.prompt?.trim()

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const generated = await generateEmailDraft({
      prompt,
      triggerType: body.triggerType,
      triggerSummary: body.triggerSummary,
    })

    return NextResponse.json({
      success: true,
      generated: {
        subject: generated.subject,
        previewText: generated.previewText,
        eyebrow: generated.eyebrow,
        headline: generated.headline,
        body: generated.body,
        primaryButtonLabel: generated.primaryButtonLabel,
        primaryButtonUrl: generated.primaryButtonUrl,
        secondaryButtonLabel: generated.secondaryButtonLabel,
        secondaryButtonUrl: generated.secondaryButtonUrl,
        footer: generated.footer,
      },
      model: generated.model,
    })
  } catch (error) {
    console.error('[POST /api/admin/email-automations/generate]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}