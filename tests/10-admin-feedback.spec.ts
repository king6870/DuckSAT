/**
 * Admin feedback panel tests.
 * Without auth: must redirect (not 500).
 * The API route must return 403 not 500 for unauthenticated requests.
 */
import { test, expect } from '@playwright/test'

test.describe('Admin feedback page (unauthenticated)', () => {
  test('redirects to signin', async ({ page }) => {
    await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' })
    const finalUrl = page.url()
    expect(
      finalUrl.includes('/auth/') || finalUrl.includes('signin'),
      `Expected auth redirect, got ${finalUrl}`,
    ).toBe(true)
  })
})

test.describe('Admin feedback API (unauthenticated)', () => {
  test('GET /api/admin/feedback returns 403', async ({ request }) => {
    const response = await request.get('/api/admin/feedback')
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  test('GET /api/admin/feedback response is valid JSON', async ({ request }) => {
    const response = await request.get('/api/admin/feedback')
    const body = await response.json()
    expect(typeof body).toBe('object')
  })

  test('DELETE /api/admin/feedback returns 403 without auth', async ({ request }) => {
    const response = await request.delete('/api/admin/feedback', {
      data: { id: 'test-id' },
    })
    expect([400, 401, 403]).toContain(response.status())
  })

  test('pagination params are accepted', async ({ request }) => {
    const response = await request.get('/api/admin/feedback?page=1&limit=10')
    // Should still be 403 without auth (not 400 bad params)
    expect(response.status()).toBe(403)
  })
})

test.describe('Admin main page (unauthenticated)', () => {
  test('redirects to signin', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    const finalUrl = page.url()
    expect(
      finalUrl.includes('/auth/') || finalUrl.includes('signin'),
      `Expected auth redirect, got ${finalUrl}`,
    ).toBe(true)
  })
})
