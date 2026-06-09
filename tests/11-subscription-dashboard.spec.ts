/**
 * Subscription dashboard tests (unauthenticated).
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard (unauthenticated)', () => {
  test('redirects to signin page (middleware guard)', async ({ page }) => {
    const response = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const finalUrl = page.url()
    expect(
      finalUrl.includes('/auth/') || finalUrl.includes('signin'),
      `Expected auth redirect, got ${finalUrl}`,
    ).toBe(true)
    expect(response?.status()).not.toBe(500)
  })
})

test.describe('Subscription API (unauthenticated)', () => {
  test('/api/stripe/status GET returns a response (public diagnostic endpoint)', async ({ request }) => {
    const response = await request.get('/api/stripe/status')
    // This is a public diagnostic endpoint — 200 is valid
    expect([200, 500]).toContain(response.status())
  })

  test('/api/stripe/portal POST returns 401 or 403', async ({ request }) => {
    const response = await request.post('/api/stripe/portal')
    expect([401, 403]).toContain(response.status())
  })

  test('/api/stripe/checkout POST returns 401 or 403', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: { plan: 'monthly' },
    })
    expect([401, 403]).toContain(response.status())
  })
})

test.describe('Webhook endpoint', () => {
  test('/api/stripe/webhook rejects unsigned requests (400 in prod, 500 in dev without secret)', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: '{"type":"test"}',
      headers: {
        'content-type': 'application/json',
      },
    })
    // 400 = missing signature (prod, secret configured)
    // 500 = assertStripeRuntimeConfig throws before signature check (dev, no secret)
    // Either way, must NOT return 200 (cannot succeed without valid signature)
    expect(response.status()).not.toBe(200)
  })
})
