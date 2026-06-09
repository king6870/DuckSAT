/**
 * Public page smoke tests — every public route must return 200
 * and render its basic layout without JavaScript errors.
 */
import { test, expect } from '@playwright/test'
import { PUBLIC_ROUTES } from './helpers'

for (const route of PUBLIC_ROUTES) {
  test(`${route} loads with status 200`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 })

    expect(response?.status(), `${route} status`).toBe(200)
    expect(errors, `Console errors on ${route}`).toHaveLength(0)
  })
}

test('homepage has DuckSAT branding', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const body = await page.content()
  expect(body).toContain('DuckSAT')
  expect(body).toContain('SAT')
})

test('homepage has CTA button', async ({ page }) => {
  // Wait for network idle to allow client-side hydration to complete
  await page.goto('/', { waitUntil: 'networkidle' })
  const text = await page.content()
  const hasCTA =
    text.includes('Start Free') ||
    text.includes('Start Practicing') ||
    text.includes('Go Premium') ||
    text.includes('Get Started')
  expect(hasCTA, 'No CTA button found on homepage').toBe(true)
})

test('404 page is handled gracefully', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded' })
  // Next.js returns 404 for unknown routes
  expect(response?.status()).toBe(404)
})
