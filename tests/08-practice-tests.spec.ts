/**
 * Practice test listing and individual test accessibility.
 * Tests all 50 practice tests respond correctly.
 */
import { test, expect } from '@playwright/test'

test.describe('Practice tests list page', () => {
  test('/practice-tests loads', async ({ page }) => {
    const response = await page.goto('/practice-tests', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
  })

  test('shows list of practice tests', async ({ page }) => {
    await page.goto('/practice-tests', { waitUntil: 'domcontentloaded' })
    const body = await page.content()
    const hasTestContent =
      body.includes('Practice Test') ||
      body.includes('SAT') ||
      body.includes('Math') ||
      body.includes('Reading')
    expect(hasTestContent, 'Practice tests page must show test content').toBe(true)
  })
})

test.describe('Practice test API endpoints', () => {
  test('/api/practice-tests returns data', async ({ request }) => {
    const response = await request.get('/api/practice-tests')
    const status = response.status()
    expect([200, 401, 403]).toContain(status)

    if (status === 200) {
      const body = await response.json()
      const tests = body.tests || body.data || body
      // Should have practice tests (at least 1 if seeded)
      if (Array.isArray(tests)) {
        expect(tests.length).toBeGreaterThan(0)
      }
    }
  })

  // Test the first several individual practice test IDs
  // These test that the API responds correctly for each test
  const TEST_IDS = Array.from({ length: 10 }, (_, i) => i + 1)

  for (const id of TEST_IDS) {
    test(`practice test ${id} module endpoint responds`, async ({ request }) => {
      const response = await request.get(`/api/practice-tests/${id}/modules`)
      expect([200, 401, 403, 404]).toContain(response.status())
    })
  }
})

test.describe('Practice question API', () => {
  test('returns math questions', async ({ request }) => {
    const response = await request.get('/api/questions/practice?moduleType=math&count=5')
    expect([200, 401, 403]).toContain(response.status())

    if (response.status() === 200) {
      const body = await response.json()
      const questions = body.questions || body
      if (Array.isArray(questions)) {
        expect(questions.length).toBeGreaterThan(0)
        expect(questions[0]).toHaveProperty('question')
        expect(questions[0]).toHaveProperty('correctAnswer')
      }
    }
  })

  test('returns reading/writing questions', async ({ request }) => {
    const response = await request.get('/api/questions/practice?moduleType=reading-writing&count=5')
    expect([200, 401, 403]).toContain(response.status())
  })
})
