import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import {
  getEmailTemplateById,
  updateEmailTemplate,
  type EmailTemplateInput,
} from '@/lib/email-templates'

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

function validateInput(body: Partial<EmailTemplateInput>): string | null {
  if (!body.name?.trim()) {
    return 'name is required'
  }

  if (!body.subject?.trim()) {
    return 'subject is required'
  }

  if (!body.body?.trim()) {
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await context.params
    const template = await getEmailTemplateById(id)

    if (!template) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('[GET /api/admin/email-templates/[id]]', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)

    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await context.params
    const body = (await request.json()) as Partial<EmailTemplateInput>
    const validationError = validateInput(body)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const template = await updateEmailTemplate(id, body as EmailTemplateInput)

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('[PATCH /api/admin/email-templates/[id]]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}