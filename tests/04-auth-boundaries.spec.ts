/**
 * Auth boundary tests — protected routes and APIs must NEVER return 500.
 * They must redirect to /auth/signin (pages) or return 401/403 (APIs).
 */
import { test, expect } from '@playwright/test'
import { PROTECTED_ROUTES, PROTECTED_APIS } from './helpers'

test.describe('Protected pages redirect unauthenticated users', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /auth/signin`, async ({ page }) => {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
      })

      // Should either redirect (3xx) or the final URL is the signin page
      const finalUrl = page.url()
      const isRedirectedToAuth =
        finalUrl.includes('/auth/signin') ||
        finalUrl.includes('/auth/') ||
        finalUrl.includes('signin')

      const statusOk =
        (response?.status() ?? 0) >= 300 && (response?.status() ?? 0) < 400

      expect(
        isRedirectedToAuth || statusOk,
        `${route} should redirect to signin but ended at ${finalUrl} (status ${response?.status()})`,
      ).toBe(true)

      // Must NEVER be a server error
      expect(
        response?.status() ?? 0,
        `${route} must not 500`,
      ).not.toBe(500)
    })
  }
})

test.describe('Protected APIs return 401 or 403, never 500', () => {
  for (const api of PROTECTED_APIS) {
    test(`${api} returns 401 or 403`, async ({ request }) => {
      const response = await request.get(api)
      const status = response.status()

      expect(
        [401, 403, 405],
        `${api} returned ${status} — expected 401, 403, or 405 (method not allowed)`,
      ).toContain(status)
    })
  }

  test('POST to /api/stripe/checkout returns 401 or 403 without auth', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: { plan: 'monthly' },
    })
    expect([401, 403]).toContain(response.status())
  })

  test('POST to /api/stripe/portal returns 401 or 403 without auth', async ({ request }) => {
    const response = await request.post('/api/stripe/portal')
    expect([401, 403]).toContain(response.status())
  })

  test('DELETE to /api/admin/feedback returns 401 or 403 without auth', async ({ request }) => {
    const response = await request.delete('/api/admin/feedback', {
      data: { id: 'fake-id' },
    })
    expect([401, 403]).toContain(response.status())
  })
})

test.describe('Admin routes are fully protected', () => {
  const adminRoutes = [
    '/admin',
    '/admin/feedback',
    '/admin/questions',
    '/admin/data',
    '/admin/test',
    '/admin/practice-tests',
    '/admin/validate-questions',
    '/admin/question-generation',
    '/admin/reviews',
    '/admin/topics',
    '/admin/email',
    '/admin/email-automations',
    '/admin/inbound-emails',
  ]

  for (const route of adminRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const finalUrl = page.url()
      const isRedirected = finalUrl.includes('/auth/') || finalUrl.includes('signin')
      expect(isRedirected, `${route} did not redirect to auth (ended at ${finalUrl})`).toBe(true)
    })
  }
})
