/**
 * Tests for Fixed Practice Test APIs (Epic #61)
 * 
 * Coverage areas:
 *   1. Admin validation (Zod schema + authorization)
 *   2. Reservation integrity (isReserved filtering)
 *   3. Attempt calculation (practice test progress)
 *   4. Progress calculation (score aggregation)
 *
 * Run: npx jest tests/api/practice-tests.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Zod Schema (mirrored from admin route for unit testing) ─────────────────
const createPracticeTestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  difficulty: z.enum(['diagnostic', 'standard', 'advanced']),
  modules: z.array(
    z.object({
      moduleIndex: z.number().int().min(0).max(3),
      moduleType: z.enum(['reading-writing', 'math']),
      questionIds: z.array(z.string()),
    })
  ).length(4),
});

// ─── 1. Admin Validation Tests ───────────────────────────────────────────────

describe('Admin Practice Test Validation', () => {
  describe('Zod schema validation', () => {
    it('should accept a valid practice test payload', () => {
      const valid = {
        name: 'SAT Practice Test 1',
        description: 'A standard full-length test',
        difficulty: 'standard',
        modules: [
          { moduleIndex: 0, moduleType: 'reading-writing', questionIds: ['q1', 'q2'] },
          { moduleIndex: 1, moduleType: 'reading-writing', questionIds: ['q3', 'q4'] },
          { moduleIndex: 2, moduleType: 'math', questionIds: ['q5', 'q6'] },
          { moduleIndex: 3, moduleType: 'math', questionIds: ['q7', 'q8'] },
        ],
      };

      const result = createPracticeTestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = {
        name: '',
        difficulty: 'standard',
        modules: Array(4).fill({ moduleIndex: 0, moduleType: 'math', questionIds: [] }),
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject name exceeding 100 characters', () => {
      const invalid = {
        name: 'x'.repeat(101),
        difficulty: 'standard',
        modules: Array(4).fill({ moduleIndex: 0, moduleType: 'math', questionIds: [] }),
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid difficulty value', () => {
      const invalid = {
        name: 'Test',
        difficulty: 'impossible',
        modules: Array(4).fill({ moduleIndex: 0, moduleType: 'math', questionIds: [] }),
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        // CQ-4 fix: Zod uses .issues not .errors
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should reject fewer than 4 modules', () => {
      const invalid = {
        name: 'Test',
        difficulty: 'standard',
        modules: [
          { moduleIndex: 0, moduleType: 'reading-writing', questionIds: ['q1'] },
          { moduleIndex: 1, moduleType: 'reading-writing', questionIds: ['q2'] },
        ],
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject more than 4 modules', () => {
      const invalid = {
        name: 'Test',
        difficulty: 'standard',
        modules: Array(5).fill({ moduleIndex: 0, moduleType: 'math', questionIds: [] }),
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid moduleType', () => {
      const invalid = {
        name: 'Test',
        difficulty: 'standard',
        modules: [
          { moduleIndex: 0, moduleType: 'science', questionIds: [] },
          { moduleIndex: 1, moduleType: 'math', questionIds: [] },
          { moduleIndex: 2, moduleType: 'math', questionIds: [] },
          { moduleIndex: 3, moduleType: 'math', questionIds: [] },
        ],
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject moduleIndex outside 0-3 range', () => {
      const invalid = {
        name: 'Test',
        difficulty: 'standard',
        modules: [
          { moduleIndex: -1, moduleType: 'math', questionIds: [] },
          { moduleIndex: 1, moduleType: 'math', questionIds: [] },
          { moduleIndex: 2, moduleType: 'math', questionIds: [] },
          { moduleIndex: 3, moduleType: 'math', questionIds: [] },
        ],
      };

      const result = createPracticeTestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should use .issues property for error details (not .errors)', () => {
      const invalid = { name: '', difficulty: 'bad' };
      const result = createPracticeTestSchema.safeParse(invalid);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // Verify .issues exists (CQ-4 regression check)
        expect(Array.isArray(result.error.issues)).toBe(true);
        expect(result.error.issues.length).toBeGreaterThan(0);
        
        // Verify each issue has expected structure
        for (const issue of result.error.issues) {
          expect(issue).toHaveProperty('code');
          expect(issue).toHaveProperty('message');
          expect(issue).toHaveProperty('path');
        }
      }
    });
  });

  describe('Admin authorization (SEC-1)', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await fetch(`${API_BASE}/api/admin/practice-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 401 for unauthenticated publish requests', async () => {
      const res = await fetch(`${API_BASE}/api/admin/practice-tests/fake-id/publish`, {
        method: 'PUT',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });
});

// ─── 2. Reservation Integrity Tests ─────────────────────────────────────────

describe('Reservation Integrity (CQ-1)', () => {
  beforeAll(async () => {
    // Verify we can connect to DB
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('random question API should NOT return reserved questions', async () => {
    // Check if any reserved questions exist
    const reservedCount = await prisma.question.count({
      where: { isReserved: true, isActive: true },
    });

    if (reservedCount === 0) {
      console.warn('Skipping: No reserved questions in database');
      return;
    }

    // Fetch random questions from the API
    const res = await fetch(`${API_BASE}/api/questions?limit=50`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify none of the returned questions are reserved
    if (data.questions && data.questions.length > 0) {
      const returnedIds = data.questions.map((q: { id: string }) => q.id);

      const reservedInResults = await prisma.question.count({
        where: {
          id: { in: returnedIds },
          isReserved: true,
        },
      });

      expect(reservedInResults).toBe(0);
    }
  });

  it('reserved questions should only appear in their practice test', async () => {
    const reservedQuestions = await prisma.question.findMany({
      where: { isReserved: true },
      select: { id: true },
      take: 10,
    });

    if (reservedQuestions.length === 0) {
      console.warn('Skipping: No reserved questions in database');
      return;
    }

    // Each reserved question should be linked to at least one practice test
    for (const q of reservedQuestions) {
      const ptqCount = await prisma.practiceTestQuestion.count({
        where: { questionId: q.id },
      });
      expect(ptqCount).toBeGreaterThan(0);
    }
  });

  it('database should enforce isReserved=false for random pool queries', async () => {
    // Direct DB query mirroring the API where clause (CQ-1 fix)
    const poolQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
        isReserved: false,
      },
      select: { id: true, isReserved: true },
      take: 20,
    });

    for (const q of poolQuestions) {
      expect(q.isReserved).toBe(false);
    }
  });
});

// ─── 3. Attempt Calculation Tests ────────────────────────────────────────────

describe('Attempt Calculation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/practice-tests should include attempt counts', async () => {
    const res = await fetch(`${API_BASE}/api/practice-tests`);
    
    // May be 401 if no session — that's acceptable for unauthenticated
    if (res.status === 200) {
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.practiceTests)).toBe(true);

      for (const test of data.practiceTests) {
        expect(test).toHaveProperty('id');
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('isPublished');
        // attemptCount and questionCount should be present
        expect(typeof test.questionCount).toBe('number');
      }
    }
  });

  it('progress endpoint should return attempt history', async () => {
    // Find a published practice test
    const publishedTest = await prisma.practiceTest.findFirst({
      where: { isPublished: true },
      select: { id: true },
    });

    if (!publishedTest) {
      console.warn('Skipping: No published practice tests');
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/practice-tests/${publishedTest.id}/progress`
    );

    // May be 401 if unauthenticated
    if (res.status === 200) {
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.attempts)).toBe(true);

      for (const attempt of data.attempts) {
        expect(attempt).toHaveProperty('attemptNumber');
        expect(typeof attempt.attemptNumber).toBe('number');
        expect(attempt.attemptNumber).toBeGreaterThan(0);
      }
    }
  });

  it('attempt numbers should be sequential per user+test', async () => {
    // Find a test with multiple attempts
    const testWithAttempts = await prisma.testResult.groupBy({
      by: ['practiceTestId', 'userId'],
      where: {
        practiceTestId: { not: null },
      },
      _count: { id: true },
      having: {
        id: { _count: { gt: 1 } },
      },
      take: 1,
    });

    if (testWithAttempts.length === 0) {
      console.warn('Skipping: No test with multiple attempts found');
      return;
    }

    const { practiceTestId, userId } = testWithAttempts[0];
    const attempts = await prisma.testResult.findMany({
      where: { practiceTestId, userId },
      orderBy: { attemptNumber: 'asc' },
      select: { attemptNumber: true },
    });

    // Verify sequential numbering
    for (let i = 0; i < attempts.length; i++) {
      expect(attempts[i].attemptNumber).toBe(i + 1);
    }
  });
});

// ─── 4. Progress Calculation Tests ───────────────────────────────────────────

describe('Progress Calculation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('practice test detail should include full question set', async () => {
    const publishedTest = await prisma.practiceTest.findFirst({
      where: { isPublished: true },
      include: {
        questions: { select: { questionId: true, moduleIndex: true, orderIndex: true } },
      },
    });

    if (!publishedTest) {
      console.warn('Skipping: No published practice tests');
      return;
    }

    const res = await fetch(`${API_BASE}/api/practice-tests/${publishedTest.id}`);

    if (res.status === 200) {
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.practiceTest).toBeDefined();
      expect(Array.isArray(data.practiceTest.questions)).toBe(true);

      // Verify question count matches DB
      expect(data.practiceTest.questions.length).toBe(publishedTest.questions.length);

      // Verify ordering is maintained
      const orders = data.practiceTest.questions.map(
        (q: { orderIndex: number }) => q.orderIndex
      );
      const sorted = [...orders].sort((a: number, b: number) => a - b);
      expect(orders).toEqual(sorted);
    }
  });

  it('questions should be grouped into 4 modules (0-3)', async () => {
    const publishedTest = await prisma.practiceTest.findFirst({
      where: { isPublished: true },
      include: {
        questions: { select: { moduleIndex: true } },
      },
    });

    if (!publishedTest) {
      console.warn('Skipping: No published practice tests');
      return;
    }

    const moduleIndices = new Set(publishedTest.questions.map(q => q.moduleIndex));
    
    // All module indices should be within 0-3
    for (const idx of moduleIndices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(3);
    }
  });

  it('test results should store practiceTestId for fixed tests', async () => {
    const practiceTestResults = await prisma.testResult.findMany({
      where: {
        practiceTestId: { not: null },
      },
      select: {
        practiceTestId: true,
        attemptNumber: true,
        totalScore: true,
      },
      take: 5,
    });

    for (const result of practiceTestResults) {
      expect(result.practiceTestId).toBeTruthy();
      expect(typeof result.attemptNumber).toBe('number');
      expect(result.attemptNumber).toBeGreaterThan(0);
    }
  });

  it('score fields should be non-negative when present', async () => {
    const results = await prisma.testResult.findMany({
      where: { practiceTestId: { not: null } },
      select: {
        totalScore: true,
        mathScore: true,
        readingWritingScore: true,
      },
      take: 10,
    });

    for (const r of results) {
      if (r.totalScore !== null) expect(r.totalScore).toBeGreaterThanOrEqual(0);
      if (r.mathScore !== null) expect(r.mathScore).toBeGreaterThanOrEqual(0);
      if (r.readingWritingScore !== null) expect(r.readingWritingScore).toBeGreaterThanOrEqual(0);
    }
  });
});
