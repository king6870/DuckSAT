/**
 * Legal page content tests — verifies every required section, disclaimer,
 * and trademark notice is present on /terms, /privacy, /cookies.
 */
import { test, expect } from '@playwright/test'

test.describe('Terms of Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
  })

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Terms of Service/i)
  })

  test('SAT trademark notice is prominent', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('College Board')
    expect(body, 'SAT® trademark must appear').toContain('SAT')
    // Trademark notice block must mention "not affiliated"
    expect(body).toContain('not affiliated')
  })

  test('has all required legal sections', async ({ page }) => {
    const body = await page.content()
    const requiredSections = [
      'Acceptance',
      'Account',
      'Subscription',
      'Cancellation',
      'Intellectual Property',
      'Disclaimer',
      'Limitation of Liability',
      'Privacy',
      'Governing Law',
    ]
    for (const section of requiredSections) {
      expect(body, `Missing section: "${section}"`).toContain(section)
    }
  })

  test('contact email is present', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('support@ducksat.com')
  })

  test('effective date is present', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('2026')
  })
})

test.describe('Privacy Policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
  })

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Privacy/i)
  })

  test('discloses all third-party services', async ({ page }) => {
    const body = await page.content()
    const requiredThirdParties = ['Stripe', 'Google', 'Resend', 'Microsoft Azure']
    for (const party of requiredThirdParties) {
      expect(body, `Missing third-party disclosure: "${party}"`).toContain(party)
    }
  })

  test('covers data retention policy', async ({ page }) => {
    const body = await page.content()
    // Accept any case: "Retention", "retention", "Data Retention"
    expect(body.toLowerCase()).toContain('retention')
  })

  test('mentions user rights', async ({ page }) => {
    const body = await page.content()
    // Access, correction, deletion
    expect(body).toContain('access')
    expect(body).toContain('delet')
  })

  test('has childrens privacy section (13+)', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('13')
  })

  test('contact info is present', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('support@ducksat.com')
  })
})

test.describe('Cookie Policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies', { waitUntil: 'domcontentloaded' })
  })

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Cookie/i)
  })

  test('has all three cookie categories', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('Strictly Necessary')
    expect(body).toContain('Analytics')
    // Preferences or functional category
    const hasPrefs = body.includes('Preferences') || body.includes('Functional')
    expect(hasPrefs, 'Missing Preferences/Functional cookie category').toBe(true)
  })

  test('documents session cookie', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('next-auth')
  })

  test('documents Meta Pixel cookies', async ({ page }) => {
    const body = await page.content()
    // _fbp or Meta Pixel
    const hasMeta = body.includes('_fbp') || body.includes('Meta Pixel') || body.includes('Facebook')
    expect(hasMeta, 'Meta Pixel cookie must be documented').toBe(true)
  })

  test('documents cookie consent storage key', async ({ page }) => {
    const body = await page.content()
    expect(body).toContain('ducksat-cookie-consent')
  })
})
