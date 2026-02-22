/**
 * Integration tests for Practice Test API
 * Tests: /api/questions/practice (GET and POST)
 * 
 * Epic: #34 - Diverse Question Types & Practice Test Integration
 * Story: #43 - Create Practice Test API Endpoints
 * 
 * Run: npm test tests/api/questions-practice.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('GET /api/questions/practice', () => {
  beforeAll(async () => {
    // Ensure test data exists
    const questionCount = await prisma.question.count({
      where: { isActive: true, moduleType: 'math' }
    });
    
    if (questionCount === 0) {
      console.warn('Warning: No test data found. Run seed script first.');
    }
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  it('should return 400 if moduleType is missing', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice`);
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid query parameters');
  });
  
  it('should return 400 if moduleType is invalid', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=invalid`);
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid query parameters');
  });
  
  it('should return questions for valid moduleType', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=5`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    expect(data.data.questions).toBeInstanceOf(Array);
    expect(data.data.questions.length).toBeLessThanOrEqual(5);
    expect(data.data.count).toBe(data.data.questions.length);
    expect(data.data.totalAvailable).toBeGreaterThanOrEqual(data.data.count);
  });
  
  it('should filter by visualType', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&visualType=geometry&count=3`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      data.data.questions.forEach((q: any) => {
        expect(q.visualType).toBe('geometry');
      });
    }
  });
  
  it('should filter by difficulty', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&difficulty=easy&count=3`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      data.data.questions.forEach((q: any) => {
        expect(q.difficulty).toBe('easy');
      });
    }
  });
  
  it('should filter by numeric difficulty range', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&difficultyMin=25&difficultyMax=50&count=5`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      data.data.questions.forEach((q: any) => {
        if (q.difficultyScore !== null) {
          expect(q.difficultyScore).toBeGreaterThanOrEqual(25);
          expect(q.difficultyScore).toBeLessThanOrEqual(50);
        }
      });
    }
  });
  
  it('should filter by category', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&category=algebra&count=3`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      data.data.questions.forEach((q: any) => {
        expect(q.category).toBe('algebra');
      });
    }
  });
  
  it('should filter by subtopic', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&subtopic=linear-equations&count=3`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      data.data.questions.forEach((q: any) => {
        expect(q.subtopic).toBe('linear-equations');
      });
    }
  });
  
  it('should exclude specified question IDs', async () => {
    // First fetch some questions
    const res1 = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=2`);
    const data1 = await res1.json();
    
    if (data1.data.questions.length === 0) {
      console.warn('Skipping test: no questions available');
      return;
    }
    
    const excludeIds = data1.data.questions.map((q: any) => q.id).join(',');
    
    // Fetch again, excluding those IDs
    const res2 = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=2&excludeIds=${excludeIds}`);
    const data2 = await res2.json();
    
    expect(res2.status).toBe(200);
    expect(data2.success).toBe(true);
    
    const excludedIdArray = excludeIds.split(',');
    data2.data.questions.forEach((q: any) => {
      expect(excludedIdArray).not.toContain(q.id);
    });
  });
  
  it('should return with explanations when requested', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=1&includeExplanations=true`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      const question = data.data.questions[0];
      expect(question).toHaveProperty('explanation');
      // Explanation should be a boolean true (since select returns boolean for explanation field)
      // or string if the select is modified
    }
  });
  
  it('should respect count limit (max 50)', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=100`);
    
    expect(res.status).toBe(400); // Should fail validation (max 50)
    const data = await res.json();
    expect(data.error).toBe('Invalid query parameters');
  });
  
  it('should return metadata with duration and timestamp', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=1`);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.meta).toBeDefined();
    expect(data.meta.duration).toMatch(/\d+ms/);
    expect(data.meta.timestamp).toBeDefined();
  });
});

describe('POST /api/questions/practice', () => {
  it('should return 400 if body is invalid', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' })
    });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid request body');
  });
  
  it('should generate practice test with default distribution', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 10
      })
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    expect(data.data.questions).toBeInstanceOf(Array);
    expect(data.data.questions.length).toBeLessThanOrEqual(10);
    expect(data.data.distribution).toBeDefined();
    expect(data.data.distribution.easy).toBeDefined();
    expect(data.data.distribution.medium).toBeDefined();
    expect(data.data.distribution.hard).toBeDefined();
  });
  
  it('should generate practice test with custom distribution', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 9,
        distribution: {
          easy: 50,   // 50% easy (4-5 questions)
          medium: 30, // 30% medium (2-3 questions)
          hard: 20    // 20% hard (1-2 questions)
        }
      })
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(9);
    
    // Check distribution is approximately correct
    const dist = data.data.distribution;
    expect(dist.easy + dist.medium + dist.hard).toBe(9);
  });
  
  it('should filter by visualTypes', async () => {
    const res = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 5,
        visualTypes: ['geometry', 'bar-chart']
      })
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.success).toBe(true);
    if (data.data.questions.length > 0) {
      data.data.questions.forEach((q: any) => {
        expect(['geometry', 'bar-chart']).toContain(q.visualType);
      });
    }
  });
  
  it('should exclude specified question IDs', async () => {
    // First generate a practice test
    const res1 = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 5
      })
    });
    const data1 = await res1.json();
    
    if (data1.data.questions.length === 0) {
      console.warn('Skipping test: no questions available');
      return;
    }
    
    const excludeIds = data1.data.questions.map((q: any) => q.id);
    
    // Generate another, excluding those IDs
    const res2 = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 5,
        excludeIds
      })
    });
    
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    
    data2.data.questions.forEach((q: any) => {
      expect(excludeIds).not.toContain(q.id);
    });
  });
  
  it('should randomize questions when requested', async () => {
    const res1 = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 10,
        randomize: true
      })
    });
    
    const res2 = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 10,
        randomize: true
      })
    });
    
    const data1 = await res1.json();
    const data2 = await res2.json();
    
    // With randomization, order should likely be different (not guaranteed, but likely)
    if (data1.data.questions.length >= 5 && data2.data.questions.length >= 5) {
      const ids1 = data1.data.questions.slice(0, 5).map((q: any) => q.id);
      const ids2 = data2.data.questions.slice(0, 5).map((q: any) => q.id);
      
      // Unlikely that first 5 questions are in same order if randomized
      const sameOrder = ids1.every((id: string, i: number) => id === ids2[i]);
      expect(sameOrder).toBe(false);
    }
  });
});

describe('Practice API Performance', () => {
  it('should respond within 500ms for simple queries', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/api/questions/practice?moduleType=math&count=10`);
    const duration = Date.now() - start;
    
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });
  
  it('should respond within 1000ms for complex POST queries', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/api/questions/practice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType: 'math',
        count: 30,
        distribution: { easy: 40, medium: 40, hard: 20 },
        visualTypes: ['geometry', 'bar-chart', 'scatter-plot']
      })
    });
    const duration = Date.now() - start;
    
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(1000);
  });
});
