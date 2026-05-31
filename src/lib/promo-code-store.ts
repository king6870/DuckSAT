import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  DEFAULT_PROMO_CODE_DEFINITIONS,
  normalizePromoCode,
  type PromoCodeDefinition,
  type PromoCodeEffectType,
} from '@/lib/promo-codes'

export interface PromoCodeInput {
  code: string
  label: string
  description: string
  effectType: PromoCodeEffectType
  bonusPracticeTests?: number
  successMessage: string
  emailSelectable?: boolean
  isActive?: boolean
}

export interface PromoCodeRecord extends PromoCodeDefinition {
  id: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

let ensureDefaultsPromise: Promise<void> | null = null

function toRecord(promoCode: {
  id: string
  code: string
  label: string
  description: string
  effectType: string
  bonusPracticeTests: number | null
  successMessage: string
  emailSelectable: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): PromoCodeRecord {
  return {
    id: promoCode.id,
    code: promoCode.code,
    label: promoCode.label,
    description: promoCode.description,
    effectType: promoCode.effectType as PromoCodeEffectType,
    bonusPracticeTests: promoCode.bonusPracticeTests ?? undefined,
    successMessage: promoCode.successMessage,
    emailSelectable: promoCode.emailSelectable,
    isActive: promoCode.isActive,
    createdAt: promoCode.createdAt,
    updatedAt: promoCode.updatedAt,
  }
}

function buildPromoCodeData(input: PromoCodeInput) {
  return {
    code: normalizePromoCode(input.code),
    label: input.label.trim(),
    description: input.description.trim(),
    effectType: input.effectType,
    bonusPracticeTests:
      input.effectType === 'bonus_practice_tests'
        ? Math.max(1, Number(input.bonusPracticeTests || 1))
        : null,
    successMessage: input.successMessage.trim(),
    emailSelectable: input.emailSelectable ?? input.effectType === 'bonus_practice_tests',
    isActive: input.isActive ?? true,
  }
}

async function ensureDefaultPromoCodesInternal() {
  const existingPromoCodes = await prisma.promoCode.findMany({
    where: {
      code: {
        in: DEFAULT_PROMO_CODE_DEFINITIONS.map((definition) => definition.code),
      },
    },
    select: {
      code: true,
    },
  })

  const existingCodes = new Set(existingPromoCodes.map((promoCode) => promoCode.code))

  for (const definition of DEFAULT_PROMO_CODE_DEFINITIONS) {
    if (existingCodes.has(definition.code)) {
      continue
    }

    await prisma.promoCode.create({
      data: {
        code: definition.code,
        label: definition.label,
        description: definition.description,
        effectType: definition.effectType,
        bonusPracticeTests: definition.bonusPracticeTests ?? null,
        successMessage: definition.successMessage,
        emailSelectable: definition.emailSelectable,
        isActive: true,
      },
    })
  }
}

export async function ensureDefaultPromoCodes(): Promise<void> {
  if (!ensureDefaultsPromise) {
    ensureDefaultsPromise = ensureDefaultPromoCodesInternal().finally(() => {
      ensureDefaultsPromise = null
    })
  }

  await ensureDefaultsPromise
}

export async function listPromoCodes(options?: {
  emailSelectableOnly?: boolean
  includeInactive?: boolean
}): Promise<PromoCodeRecord[]> {
  await ensureDefaultPromoCodes()

  const promoCodes = await prisma.promoCode.findMany({
    where: {
      ...(options?.includeInactive ? {} : { isActive: true }),
      ...(options?.emailSelectableOnly ? { emailSelectable: true } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  })

  return promoCodes.map(toRecord)
}

export async function getPromoCodeDefinition(code: string | null | undefined): Promise<PromoCodeRecord | null> {
  const normalizedCode = normalizePromoCode(code)
  if (!normalizedCode) {
    return null
  }

  await ensureDefaultPromoCodes()

  const promoCode = await prisma.promoCode.findUnique({
    where: { code: normalizedCode },
  })

  if (!promoCode || !promoCode.isActive) {
    return null
  }

  return toRecord(promoCode)
}

export async function getPromoCodeById(id: string): Promise<PromoCodeRecord | null> {
  await ensureDefaultPromoCodes()

  const promoCode = await prisma.promoCode.findUnique({
    where: { id },
  })

  return promoCode ? toRecord(promoCode) : null
}

export async function createPromoCode(input: PromoCodeInput): Promise<PromoCodeRecord> {
  await ensureDefaultPromoCodes()

  const promoCode = await prisma.promoCode.create({
    data: buildPromoCodeData(input),
  })

  return toRecord(promoCode)
}

export async function updatePromoCode(id: string, input: PromoCodeInput): Promise<PromoCodeRecord> {
  await ensureDefaultPromoCodes()

  const promoCode = await prisma.promoCode.update({
    where: { id },
    data: buildPromoCodeData(input),
  })

  return toRecord(promoCode)
}