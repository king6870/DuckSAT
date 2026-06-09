import { Page, expect } from '@playwright/test'

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

/** Routes that must return 200 for unauthenticated users */
export const PUBLIC_ROUTES = [
  '/',
  '/terms',
  '/cookies',
  '/privacy',
  '/pricing',
  '/how-it-works',
  '/our-goal',
  '/practice-tests',
] as const

/** Routes that must redirect to /auth/signin when unauthenticated (server-side guard) */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/practice',
  '/progress',
  '/referrals',
  '/admin',
  '/admin/feedback',
  '/admin/questions',
  '/admin/data',
] as const

/** API routes that must return 200 without auth */
export const PUBLIC_APIS = [
  '/api/health',
  '/api/auth/session',
  '/api/auth/providers',
] as const

/** API routes that must return 401 or 403 (never 500) without auth */
export const PROTECTED_APIS = [
  '/api/admin/feedback',
  '/api/admin/email-activity',
  '/api/stripe/portal',
  '/api/stripe/checkout',
] as const

export async function assertPageContent(page: Page, path: string, checks: string[]) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const body = await page.content()
  for (const check of checks) {
    expect(body, `Expected "${check}" on ${path}`).toContain(check)
  }
}

export async function assertApiStatus(
  page: Page,
  path: string,
  allowedStatuses: number[],
) {
  const resp = await page.request.get(path)
  expect(
    allowedStatuses,
    `${path} returned ${resp.status()}, expected one of ${allowedStatuses}`,
  ).toContain(resp.status())
  return resp
}
