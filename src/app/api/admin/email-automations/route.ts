import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import {
  EMAIL_AUTOMATION_TRIGGER_TYPES,
  createEmailAutomation,
  listEmailAutomations,
  type EmailAutomationInput,
} from '@/lib/email-automations'

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

function validateInput(body: Partial<EmailAutomationInput>): string | null {
  if (!body.name?.trim()) {
    return 'name is required'
  }

  if (!body.triggerType || !EMAIL_AUTOMATION_TRIGGER_TYPES.includes(body.triggerType)) {
    return 'triggerType is required'
  }

  if (!body.templateId?.trim() && !body.subject?.trim()) {
    return 'subject is required'
  }

  if (!body.templateId?.trim() && !body.body?.trim()) {
    return 'body is required'
  }

  if (body.primaryButtonLabel && !body.primaryButtonUrl) {
    return 'primary button URL is required when button label is set'
  }

  if (body.secondaryButtonLabel && !body.secondaryButtonUrl) {
    return 'secondary button URL is required when button label is set'
  }

  return null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const automations = await listEmailAutomations()

    return NextResponse.json({ automations })
  } catch (error) {
    console.error('[GET /api/admin/email-automations]', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<EmailAutomationInput>
    const validationError = validateInput(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const automation = await createEmailAutomation(body as EmailAutomationInput)

    return NextResponse.json({ success: true, automation })
  } catch (error) {
    console.error('[POST /api/admin/email-automations]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}