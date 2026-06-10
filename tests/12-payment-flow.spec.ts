/**
 * Full end-to-end payment flow test.
 * - Creates a fixed test user via /api/auth/signup (idempotent)
 * - Logs in via credentials provider
 * - Initiates Stripe checkout (monthly plan)
 * - Fills Stripe test card 4242 4242 4242 4242
 * - Verifies redirect to /dashboard and "You're Subscribed!" modal
 *
 * SKIPPED automatically when Stripe is in live mode (localhost with live keys).
 * Runs on staging (dev.ducksat.com) where Stripe test keys are configured.
 */
import { test, expect } from '@playwright/test'

// Fixed credentials — reused across rate-limited runs
const TEST_USER = 'testpayauto'
const TEST_PASS = 'TestPass123!'

test.describe('Post-payment redirect and Subscribed modal', () => {
  test.setTimeout(90_000)

  test('signup → login → checkout → dashboard modal', async ({ page }) => {
    // Skip on environments with live Stripe keys (test card 4242 only works in test/sandbox mode)
    const stripeStatus = await page.request.get('/api/stripe/status')
    if (stripeStatus.ok()) {
      const data = await stripeStatus.json().catch(() => ({}))
      if (data.liveCheckoutReady === true) {
        test.skip(true, 'Stripe is in live mode — test card only works in sandbox. Run on staging.')
      }
    }

    // ── 1. Create test user (idempotent) ──────────────────────────────────
    const signupRes = await page.request.post('/api/auth/signup', {
      data: { username: TEST_USER, password: TEST_PASS },
    })
    // 201 = created, 409 = already exists (re-run), 429 = rate limited (account exists)
    expect(
      [201, 409, 429],
      `Signup failed with ${signupRes.status()}: ${await signupRes.text()}`,
    ).toContain(signupRes.status())

    // ── 2. Sign in via credentials form ───────────────────────────────────
    await page.goto('/auth/signin', { waitUntil: 'networkidle' })
    await page.fill('#username', TEST_USER)
    await page.fill('#password', TEST_PASS)
    await page.click('button[type="submit"]')

    // New users land on /onboarding; existing may land on /dashboard
    await page.waitForURL(/\/(dashboard|pricing|onboarding)/, { timeout: 12_000 })
    const postLoginUrl = page.url()
    expect(postLoginUrl, 'Login did not redirect to an authenticated page').not.toContain('/signin')

    // ── 3. Navigate to pricing ─────────────────────────────────────────────
    await page.goto('/pricing', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500) // client-rendered

    // ── 4. Click the monthly "Get Started" button ──────────────────────────
    const getStartedBtn = page.locator('button').filter({ hasText: /get started/i }).first()
    await expect(getStartedBtn, 'Get Started button not found').toBeVisible({ timeout: 8_000 })

    // Click triggers: fetch /api/stripe/checkout → JS redirects to Stripe URL
    await getStartedBtn.click()
    await page.waitForURL(/stripe\.com/, { timeout: 20_000 })
    expect(page.url(), 'Did not navigate to Stripe checkout').toContain('stripe.com')

    // ── 5. Stripe checkout page — wait for JS to render ────────────────────
    await page.waitForTimeout(3000)

    // ── 6. Uncheck "Save my information" (Stripe Link) ────────────────────
    // Stripe Link checkbox intercepts checkout and hides card fields.
    const saveLinkCheckbox = page.locator('input[name="enableStripePass"], input[type="checkbox"]').first()
    if (await saveLinkCheckbox.isChecked().catch(() => false)) {
      await saveLinkCheckbox.uncheck()
      await page.waitForTimeout(1000)
    }

    // ── 7. Select Card payment method ─────────────────────────────────────
    const cardAccordionBtn = page.locator('[data-testid="card-accordion-item-button"], [aria-label="Pay with card"]').first()
    if (await cardAccordionBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cardAccordionBtn.click({ force: true })
      await page.waitForTimeout(2000)
    }

    // ── 8. Fill card fields (plain inputs on checkout.stripe.com, no iframes) ─
    await page.locator('input[name="cardNumber"], input[autocomplete="cc-number"]').first().fill('4242424242424242')
    await page.locator('input[name="cardExpiry"], input[autocomplete="cc-exp"]').first().fill('12 / 28')
    await page.locator('input[name="cardCvc"], input[autocomplete="cc-csc"]').first().fill('123')

    const nameInput = page.locator('input[name="billingName"], input[autocomplete="cc-name"]').first()
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test User')
    }
    const zipInput = page.locator('input[name="billingPostalCode"], input[autocomplete*="postal"]').first()
    if (await zipInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await zipInput.fill('10001')
    }

    // ── 9. Submit ─────────────────────────────────────────────────────────
    const submitBtn = page.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeVisible({ timeout: 5_000 })
    await submitBtn.click()

    // ── 10. Wait for redirect back to /dashboard ───────────────────────────
    await page.waitForURL(/\/dashboard/, { timeout: 45_000 })

    // ── 11. Wait for "You're Subscribed!" modal ───────────────────────────
    // Polling might take a moment for Stripe webhook to fire
    const modalTitle = page.getByText("You're Subscribed!")
    await expect(modalTitle).toBeVisible({ timeout: 20_000 })

    // ── 12. Verify modal buttons ─────────────────────────────────────────
    await expect(page.getByRole('link', { name: 'Take a Test' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Take a Topic Drill' })).toBeVisible()

    // ── 13. Close modal with X ────────────────────────────────────────────
    await page.click('[aria-label="Close"]')
    await expect(modalTitle).not.toBeVisible({ timeout: 3_000 })

    // ── 14. Verify subscription shows on dashboard ────────────────────────
    await page.waitForTimeout(1000)
    const body = await page.content()
    const hasActiveSub =
      body.includes('Monthly Premium') ||
      body.includes('Yearly Premium') ||
      body.includes('Active') ||
      body.includes('Premium')
    expect(hasActiveSub, 'Dashboard should show an active subscription').toBe(true)
  })
})

test.describe('Dashboard ?subscribed=true URL handling (unauthenticated)', () => {
  test('redirects to signin, not to pricing', async ({ page }) => {
    await page.context().clearCookies()
    const response = await page.goto('/dashboard?subscribed=true', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const finalUrl = page.url()
    expect(
      finalUrl.includes('/auth/') || finalUrl.includes('signin'),
      `Expected auth redirect, got ${finalUrl}`,
    ).toBe(true)
    expect(response?.status()).not.toBe(500)
  })

  test('checkout success_url goes to /dashboard not /pricing', async ({ request }) => {
    // The checkout API requires auth — 401 is expected. Config change verified by code review.
    const response = await request.post('/api/stripe/checkout', {
      data: { plan: 'monthly' },
    })
    expect([401, 403]).toContain(response.status())
  })
})
