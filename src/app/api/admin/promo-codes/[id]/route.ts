import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'
import {
  getPromoCodeById,
  updatePromoCode,
  type PromoCodeInput,
} from '@/lib/promo-code-store'

function isAdminEmail(email: string | null | undefined): email is string {
  return !!email && ADMIN_EMAILS.includes(email)
}

function validateInput(body: Partial<PromoCodeInput>): string | null {
  if (!body.code?.trim()) {
    return 'code is required'
  }

  if (!body.label?.trim()) {
    return 'label is required'
  }

  if (!body.description?.trim()) {
    return 'description is required'
  }

  if (body.effectType !== 'tester_access' && body.effectType !== 'bonus_practice_tests') {
    return 'effectType is required'
  }

  if (!body.successMessage?.trim()) {
    return 'successMessage is required'
  }

  if (body.effectType === 'bonus_practice_tests' && (!body.bonusPracticeTests || body.bonusPracticeTests < 1)) {
    return 'bonusPracticeTests must be at least 1 for bonus_practice_tests'
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
    const promoCode = await getPromoCodeById(id)

    if (!promoCode) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ promoCode })
  } catch (error) {
    console.error('[GET /api/admin/promo-codes/[id]]', error)
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
    const body = (await request.json()) as Partial<PromoCodeInput>
    const validationError = validateInput(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const promoCode = await updatePromoCode(id, body as PromoCodeInput)

    return NextResponse.json({ success: true, promoCode })
  } catch (error) {
    console.error('[PATCH /api/admin/promo-codes/[id]]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'server_error' },
      { status: 500 },
    )
  }
}