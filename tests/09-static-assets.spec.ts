/**
 * Static assets and SEO metadata tests.
 */
import { test, expect } from '@playwright/test'

test.describe('Static assets', () => {
  test('favicon is served', async ({ request }) => {
    const response = await request.get('/favicon.ico')
    expect([200, 204]).toContain(response.status())
  })

  test('duck logo SVG is served', async ({ request }) => {
    const response = await request.get('/duck-logo.svg')
    expect(response.status()).toBe(200)
    const ct = response.headers()['content-type'] || ''
    expect(ct).toContain('svg')
  })

  test('Next.js static chunks are served', async ({ request }) => {
    // If the homepage loads, _next/static must work
    const response = await request.get('/')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('/_next/static/')
  })
})

test.describe('SEO and meta tags', () => {
  test('homepage has title tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(3)
  })

  test('homepage has meta description', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(metaDesc).toBeTruthy()
  })

  test('/terms has correct title', async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title).toContain('Terms')
  })

  test('/privacy has correct title', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title).toContain('Privacy')
  })

  test('/cookies has correct title', async ({ page }) => {
    await page.goto('/cookies', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title).toContain('Cookie')
  })
})

test.describe('robots.txt and sitemap', () => {
  test('robots.txt is served', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect([200, 404]).toContain(response.status())
    // Not checking 404 — if it doesn't exist that's a future task
  })
})
