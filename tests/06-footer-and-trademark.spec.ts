/**
 * Footer and trademark tests — every page must have the legal footer
 * with Terms/Privacy/Cookies links, and the SAT® trademark notice.
 */
import { test, expect } from '@playwright/test'

const PAGES_WITH_FOOTER = [
  '/',
  '/terms',
  '/cookies',
  '/privacy',
  '/pricing',
  '/practice-tests',
]

test.describe('Site footer', () => {
  for (const page_path of PAGES_WITH_FOOTER) {
    test(`${page_path} has Terms link`, async ({ page }) => {
      await page.goto(page_path, { waitUntil: 'domcontentloaded' })
      const termsLink = page.locator('a[href="/terms"]').last()
      await expect(termsLink).toBeVisible()
    })

    test(`${page_path} has Privacy link`, async ({ page }) => {
      await page.goto(page_path, { waitUntil: 'domcontentloaded' })
      const privacyLink = page.locator('a[href="/privacy"]').last()
      await expect(privacyLink).toBeVisible()
    })

    test(`${page_path} has Cookies link`, async ({ page }) => {
      await page.goto(page_path, { waitUntil: 'domcontentloaded' })
      const cookiesLink = page.locator('a[href="/cookies"]').last()
      await expect(cookiesLink).toBeVisible()
    })
  }
})

test.describe('SAT® trademark notice', () => {
  test('homepage footer contains SAT trademark notice', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const body = await page.content()
    expect(body).toContain('College Board')
    expect(body).toContain('not affiliated')
  })

  test('/terms has prominent trademark notice at top', async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
    const body = await page.content()
    expect(body).toContain('Trademark Notice')
    expect(body).toContain('College Board')
  })

  test('/cookies footer has trademark notice', async ({ page }) => {
    await page.goto('/cookies', { waitUntil: 'domcontentloaded' })
    const body = await page.content()
    expect(body).toContain('College Board')
  })
})

test.describe('Footer links are navigable', () => {
  test('Terms link navigates to /terms', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const termsLinks = await page.locator('a[href="/terms"]').all()
    expect(termsLinks.length, 'No Terms links found on homepage').toBeGreaterThan(0)
    await termsLinks[termsLinks.length - 1].click()
    await page.waitForURL('**/terms')
    expect(page.url()).toContain('/terms')
  })

  test('Privacy link navigates to /privacy', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const privacyLinks = await page.locator('a[href="/privacy"]').all()
    expect(privacyLinks.length, 'No Privacy links found on homepage').toBeGreaterThan(0)
    await privacyLinks[privacyLinks.length - 1].click()
    await page.waitForURL('**/privacy')
    expect(page.url()).toContain('/privacy')
  })

  test('Cookies link navigates to /cookies', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const cookieLinks = await page.locator('a[href="/cookies"]').all()
    expect(cookieLinks.length, 'No Cookies links found on homepage').toBeGreaterThan(0)
    await cookieLinks[cookieLinks.length - 1].click()
    await page.waitForURL('**/cookies')
    expect(page.url()).toContain('/cookies')
  })
})
