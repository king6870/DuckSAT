import { test, expect } from '@playwright/test'

/**
 * Meta Pixel verification.
 *
 * Strategy:
 *  - Inject a synchronous fbq spy via addInitScript (runs before inline pixel script).
 *  - Spy calls page.exposeFunction'd __recordFbqCall → stores in Node-side array.
 *  - Works across client-side navigations because data lives outside the browser window.
 */

interface FbqCall { type: string; event: string; params: unknown }

async function setupPixelSpy(page: import('@playwright/test').Page) {
  const calls: FbqCall[] = []

  // Expose a Node-side recorder the browser spy will call
  await page.exposeFunction('__recordFbqCall', (type: string, event: string, params: unknown) => {
    calls.push({ type, event, params })
  })

  // Accept cookies AND install fbq spy before any page script runs
  await page.addInitScript(() => {
    localStorage.setItem('ducksat-cookie-consent', 'accepted')

    const spy = function (...args: unknown[]) {
      const [type, event, params] = args as [string, string, unknown]
      // Fire-and-forget back to Node
      try {
        ;(window as unknown as Record<string, (...a: unknown[]) => void>)['__recordFbqCall'](type, event, params ?? {})
      } catch { /* noop if not yet connected */ }
    }
    Object.assign(spy, { callMethod: null, queue: [], loaded: true, version: '2.0', push: spy })
    ;(window as unknown as Record<string, unknown>)['fbq'] = spy
    ;(window as unknown as Record<string, unknown>)['_fbq'] = spy
  })

  return calls
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Meta Pixel standard events', () => {

  test('init + PageView fires on landing page load when consent accepted', async ({ page }) => {
    const calls = await setupPixelSpy(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    console.log('Calls on /:', JSON.stringify(calls, null, 2))
    expect(calls.find(c => c.type === 'init')).toBeTruthy()
    expect(calls.find(c => c.event === 'PageView')).toBeTruthy()
  })

  test('ViewContent fires on /pricing with correct standard params', async ({ page }) => {
    const calls = await setupPixelSpy(page)
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    console.log('Calls on /pricing:', JSON.stringify(calls, null, 2))

    const vc = calls.find(c => c.event === 'ViewContent')
    expect(vc).toBeTruthy()
    const p = vc!.params as Record<string, unknown>
    expect(p.content_name).toBe('DuckSAT Pricing')
    expect(p.content_category).toBe('Subscription')
    expect(p.content_type).toBe('product')
    const ids = p.content_ids as string[]
    expect(ids).toContain('monthly')
    expect(ids).toContain('yearly')
  })

  test('Lead fires when hero "Start Free" CTA is clicked', async ({ page }) => {
    const calls = await setupPixelSpy(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Stub out the navigation destination so the page stays up
    await page.route('**/*', async route => {
      const url = route.request().url()
      // Let the current page assets through; abort navigations away
      if (url.includes('/auth/signin') && route.request().resourceType() === 'document') {
        await route.abort()
      } else {
        await route.continue()
      }
    })

    const btn = page.locator('button').filter({ hasText: /Start Free|Start Practicing/i }).first()
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click().catch(() => { /* navigation abort is expected */ })
    await page.waitForTimeout(1500)

    console.log('Calls after hero CTA click:', JSON.stringify(calls, null, 2))
    const lead = calls.find(c => c.event === 'Lead')
    expect(lead).toBeTruthy()
    expect((lead!.params as Record<string, unknown>).location).toBe('landing_home')
  })

  test('Lead fires when "Go Premium" hero link is clicked', async ({ page }) => {
    const calls = await setupPixelSpy(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    await page.route('**/signup**', async route => {
      if (route.request().resourceType() === 'document') await route.abort()
      else await route.continue()
    })

    const link = page.locator('a').filter({ hasText: /Go Premium/i }).first()
    if (!(await link.isVisible())) {
      test.skip(true, '"Go Premium" not visible — authenticated user sees different UI')
      return
    }
    await link.click().catch(() => {})
    await page.waitForTimeout(1500)

    console.log('Calls after Go Premium click:', JSON.stringify(calls, null, 2))
    const lead = calls.find(c => c.event === 'Lead' && (c.params as Record<string, unknown>).location === 'hero_go_premium')
    expect(lead).toBeTruthy()
  })

  test('InitiateCheckout fires with correct params when "Get Started" clicked', async ({ page }) => {
    const calls = await setupPixelSpy(page)

    // Block Stripe redirect; return empty url so window.location.href = '' does nothing harmful
    await page.route('**/api/stripe/checkout', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '' }) })
    )
    // Unauthenticated users get sent to /signup — abort that navigation
    await page.route('**/signup**', async route => {
      if (route.request().resourceType() === 'document') await route.abort()
      else await route.continue()
    })

    await page.goto('/pricing', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    const btn = page.locator('button').filter({ hasText: /Get Started/i }).first()
    await expect(btn).toBeVisible({ timeout: 5000 })
    await btn.click().catch(() => {})

    // InitiateCheckout fires synchronously before window.location.href triggers navigation.
    // Poll on the Node-side array so we don't depend on the page staying alive.
    const deadline = Date.now() + 5000
    while (!calls.find(c => c.event === 'InitiateCheckout') && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100))
    }

    console.log('Calls after checkout click:', JSON.stringify(calls, null, 2))

    const ic = calls.find(c => c.event === 'InitiateCheckout')
    expect(ic).toBeTruthy()
    const p = ic!.params as Record<string, unknown>
    expect(Number(p.value)).toBeGreaterThan(0)
    expect(p.currency).toBe('USD')
    expect(p.content_type).toBe('product')
    expect(Number(p.num_items)).toBe(1)
    expect((p.content_ids as string[])).toContain('monthly')
  })
})
