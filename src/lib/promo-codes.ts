export type PromoCodeEffectType = 'tester_access' | 'bonus_practice_tests'

export interface PromoCodeDefinition {
  code: string
  label: string
  description: string
  effectType: PromoCodeEffectType
  successMessage: string
  emailSelectable: boolean
  bonusPracticeTests?: number
}

const BONUS_TEST_PROMO_CODES = [
  'DUCK20',
  'DUCK21',
  'DUCK22',
  'DUCK23',
  'DUCK24',
  'DUCK25',
  'DUCK26',
  'DUCK27',
  'DUCK28',
  'DUCK29',
] as const

export const DEFAULT_PROMO_CODE_DEFINITIONS: PromoCodeDefinition[] = [
  {
    code: 'DUCK19',
    label: 'Tester Lifetime Access',
    description: 'Activates long-term tester access on the yearly plan.',
    effectType: 'tester_access',
    successMessage: 'Tester access activated! Enjoy unlimited access.',
    emailSelectable: false,
  },
  ...BONUS_TEST_PROMO_CODES.map<PromoCodeDefinition>((code) => ({
    code,
    label: '1 Extra SAT Practice Test',
    description: 'Redeem on DuckSAT pricing to unlock 1 extra SAT practice test this month.',
    effectType: 'bonus_practice_tests',
    bonusPracticeTests: 1,
    successMessage: 'Promo code applied! You now have 1 extra SAT practice test available this month.',
    emailSelectable: true,
  })),
]

export function normalizePromoCode(code: string | null | undefined): string {
  return code?.trim().toUpperCase() || ''
}

export function getDefaultPromoCodeDefinition(code: string | null | undefined): PromoCodeDefinition | null {
  const normalizedCode = normalizePromoCode(code)
  if (!normalizedCode) {
    return null
  }

  return DEFAULT_PROMO_CODE_DEFINITIONS.find((definition) => definition.code === normalizedCode) || null
}

export function buildPromoRedemptionUrl(code: string, baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  return `${normalizedBaseUrl}/pricing?promo=${encodeURIComponent(normalizePromoCode(code))}`
}