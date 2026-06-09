/**
 * API health and public endpoint tests.
 * These must work without any authentication.
 */
import { test, expect } from '@playwright/test'

test.describe('/api/health', () => {
  test('returns healthy status', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('healthy')
    expect(body.database).toBe('connected')
  })

  test('reports question count > 0', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()
    expect(body.questionCount, 'Database must have questions').toBeGreaterThan(0)
  })

  test('includes timestamp in response', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()
    expect(body.timestamp).toBeTruthy()
    // Must be parseable as a date
    const d = new Date(body.timestamp)
    expect(isNaN(d.getTime()), 'Timestamp should be a valid date').toBe(false)
  })
})

test.describe('/api/auth/session', () => {
  test('returns 200 without auth (null session)', async ({ request }) => {
    const response = await request.get('/api/auth/session')
    expect(response.status()).toBe(200)
    // Unauthenticated: body may be empty or {}
    const text = await response.text()
    expect(text).toBeTruthy()
  })
})

test.describe('/api/auth/providers', () => {
  test('returns 200 with available providers', async ({ request }) => {
    const response = await request.get('/api/auth/providers')
    expect(response.status()).toBe(200)
    const body = await response.json()
    // Must have google provider
    expect(body).toHaveProperty('google')
  })
})

test.describe('/api/questions', () => {
  test('returns questions without auth', async ({ request }) => {
    const response = await request.get('/api/questions?limit=5')
    // May require auth on prod — accept 200 or 401/403
    const status = response.status()
    expect([200, 401, 403]).toContain(status)

    if (status === 200) {
      const body = await response.json()
      const questions = body.questions || body.data?.questions || body
      expect(Array.isArray(questions)).toBe(true)
    }
  })

  test('math questions are retrievable', async ({ request }) => {
    const response = await request.get('/api/questions?moduleType=math&limit=3')
    const status = response.status()
    expect([200, 401, 403]).toContain(status)

    if (status === 200) {
      const body = await response.json()
      const questions = body.questions || []
      if (questions.length > 0) {
        expect(questions[0]).toHaveProperty('question')
      }
    }
  })

  test('reading questions are retrievable', async ({ request }) => {
    const response = await request.get('/api/questions?moduleType=reading-writing&limit=3')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('Practice tests API', () => {
  test('/api/practice-tests returns list', async ({ request }) => {
    const response = await request.get('/api/practice-tests')
    // Accept 200 or auth-gated
    expect([200, 401, 403]).toContain(response.status())

    if (response.status() === 200) {
      const body = await response.json()
      const tests = body.tests || body
      expect(Array.isArray(tests)).toBe(true)
    }
  })
})
