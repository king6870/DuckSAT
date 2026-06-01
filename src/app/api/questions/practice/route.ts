import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { buildDrillScopeKey, selectNoRepeatDrillQuestions } from '@/lib/drill-question-selection';
import { normalizeDeepText, normalizeQuestionOptions, normalizeQuestionText } from '@/lib/math/textNormalization';

/**
 * GET /api/questions/practice
 * 
 * Practice Test API Endpoint for SAT Question Generator V3
 * 
 * Fetches questions with advanced filtering by visualType, subtopic, difficulty, etc.
 * Supports exclusion of previously seen questions for adaptive practice tests.
 * 
 * Query Parameters:
 * - moduleType: 'math' | 'reading-writing' (required)
 * - visualType: 'bar-chart' | 'scatter-plot' | 'function-graph' | 'geometry' | etc. (optional)
 * - category: 'algebra' | 'geometry' | 'data-analysis' | etc. (optional)
 * - subtopic: 'linear-equations' | 'quadratic-functions' | etc. (optional)
 * - difficulty: 'easy' | 'medium' | 'hard' (optional)
 * - difficultyMin: number 0-100 (optional, numeric difficulty range)
 * - difficultyMax: number 0-100 (optional, numeric difficulty range)
 * - count: number 1-50 (default: 10)
 * - excludeIds: comma-separated question IDs to exclude (optional)
 * - includeExplanations: 'true' | 'false' (default: false, reduces payload size)
 * 
 * Epic: #34 - Diverse Question Types & Practice Test Integration
 * Story: #43 - Create Practice Test API Endpoints
 */

// Zod validation schema
const practiceQuerySchema = z.object({
  moduleType: z.enum(['math', 'reading-writing']).optional(),
  visualType: z.enum([
    'bar-chart', 'line-graph', 'scatter-plot', 'pie-chart', 'table',
    'function-graph', 'geometry', 'system-of-equations', 'none'
  ]).optional(),
  category: z.string().optional(),
  subtopic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  difficultyMin: z.coerce.number().min(0).max(100).optional(),
  difficultyMax: z.coerce.number().min(0).max(100).optional(),
  count: z.coerce.number().min(1).max(50).default(10),
  excludeIds: z.string().optional(), // Comma-separated IDs
  includeExplanations: z.enum(['true', 'false']).default('false'),
  noRepeat: z.enum(['true', 'false']).default('false')
});

type PracticeQuery = z.infer<typeof practiceQuerySchema>;

function isNoRepeatInfrastructureError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021' || error.code === 'P2022') {
      return true
    }
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('drill_scope_states') ||
    message.includes('drill_question_exposures') ||
    message.includes('drillscopestate') ||
    message.includes('drillquestionexposure')
  )
}

const PASSAGE_OMISSION_MARKER = /\.\.\.|…|\[omitted\]|\(omitted\)|\[excerpt\]|abridged|truncated/i;

const FULL_PASSAGE_CATEGORIES = new Set(['reading comprehension', 'vocabulary']);

const FULL_PASSAGE_SUBTOPICS = new Set([
  'reading comprehension',
  'main ideas and central claims',
  'supporting details and evidence',
  'inferences and implications',
  'vocabulary in context',
  'text structure and organization',
  'author s purpose and point of view',
  'authors purpose and point of view',
  'comparing texts and viewpoints',
]);

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function getCategoryAliases(category: string): string[] {
  const key = normalizeKey(category)

  const aliasesByCanonical: Record<string, string[]> = {
    'reading-comprehension': [
      'reading-comprehension',
      'Reading Comprehension',
      'ReadingComprehension',
      'reading comprehension',
      'reading',
      'reading-writing'
    ],
    'grammar': [
      'grammar',
      'Grammar',
      'Grammar and Usage',
      'grammar and usage',
      'Punctuation and Mechanics',
      'punctuation and mechanics'
    ],
    'vocabulary': [
      'vocabulary',
      'Vocabulary',
      'Vocabulary in Context',
      'vocabulary in context'
    ],
    'writing-language': [
      'writing-language',
      'Writing and Language',
      'writing and language',
      'rhetoric',
      'synthesis'
    ],
    'algebra': ['algebra', 'Algebra', 'math', 'linear-functions'],
    'advanced-math': ['advanced-math', 'Advanced Math', 'advanced math', 'quadratic-equations'],
    'geometry': [
      'geometry',
      'Geometry',
      'geometry-trigonometry',
      'Geometry and Trigonometry',
      'triangles'
    ],
    'problem-solving-data-analysis': [
      'problem-solving-data-analysis',
      'Problem Solving and Data Analysis',
      'problem solving data analysis',
      'statistics',
      'statistics-probability',
      'Statistics and Probability',
      'data-analysis'
    ]
  }

  const canonical = key === 'reading comprehension' || key === 'readingcomprehension'
    ? 'reading-comprehension'
    : key === 'writing language' || key === 'writing and language'
    ? 'writing-language'
    : key

  const aliases = aliasesByCanonical[canonical] || [category]
  return [...new Set(aliases)]
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function requiresFullReadingPassage(category: string | null | undefined, subtopic: string | null | undefined): boolean {
  return FULL_PASSAGE_CATEGORIES.has(normalizeKey(category || ''))
    || FULL_PASSAGE_SUBTOPICS.has(normalizeKey(subtopic || ''))
}

function hasValidPracticePassage(question: {
  moduleType: string
  category: string | null
  subtopic: string | null
  passage: string | null
}): boolean {
  if (question.moduleType !== 'reading-writing') {
    return true
  }

  const passage = (question.passage || '').trim()
  const requiresFullPassage = requiresFullReadingPassage(question.category, question.subtopic)

  if (!passage) {
    return !requiresFullPassage
  }

  if (PASSAGE_OMISSION_MARKER.test(passage)) {
    return false
  }

  if (requiresFullPassage && countWords(passage) < 150) {
    return false
  }

  return true
}

function filterInvalidPracticeQuestions<T extends {
  moduleType: string
  category: string | null
  subtopic: string | null
  passage: string | null
}>(questions: T[], desiredCount?: number): T[] {
  const filtered = questions.filter(hasValidPracticePassage)
  return typeof desiredCount === 'number' ? filtered.slice(0, desiredCount) : filtered
}

function getPracticeFetchTake(count: number, moduleType?: string): number {
  if (moduleType !== 'reading-writing') {
    return count
  }

  return Math.min(Math.max(count * 10, count), 200)
}

function getFallbackOrderForDifficulty(
  difficulty: PracticeQuery['difficulty']
): Prisma.QuestionOrderByWithRelationInput[] {
  if (difficulty === 'easy') {
    return [{ difficultyScore: 'asc' }, { createdAt: 'desc' }]
  }

  if (difficulty === 'hard') {
    return [{ difficultyScore: 'desc' }, { createdAt: 'desc' }]
  }

  return [{ createdAt: 'desc' }]
}

/**
 * Retry helper for database connection errors (copied from route.ts)
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delays = [200, 500, 1000]
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      const isRetryable = error instanceof Error && (
        error.message.includes('connection') ||
        error.message.includes('timeout')
      );
      
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }
      
      const delay = delays[attempt - 1] || delays[delays.length - 1];
      console.log(`[/api/questions/practice] Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    // Use ?? undefined to convert null to undefined (zod .optional() rejects null)
    const rawQuery = {
      moduleType: searchParams.get('moduleType') ?? undefined,
      visualType: searchParams.get('visualType') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      subtopic: searchParams.get('subtopic') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      difficultyMin: searchParams.get('difficultyMin') ?? undefined,
      difficultyMax: searchParams.get('difficultyMax') ?? undefined,
      count: searchParams.get('count') || '10',
      excludeIds: searchParams.get('excludeIds') ?? undefined,
      includeExplanations: searchParams.get('includeExplanations') || 'false',
      noRepeat: searchParams.get('noRepeat') || 'false'
    };
    
    const validationResult = practiceQuerySchema.safeParse(rawQuery);
    
    if (!validationResult.success) {
      console.error('[/api/questions/practice] Validation error:', validationResult.error.errors);
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const query: PracticeQuery = validationResult.data;
    const fetchTake = getPracticeFetchTake(query.count, query.moduleType);
    const session = query.noRepeat === 'true'
      ? await getServerSession(authOptions)
      : null;
    const noRepeatUserId = session?.user?.id || null;
    let shouldUseNoRepeat = query.noRepeat === 'true' && !!noRepeatUserId;
    
    // Build Prisma where clause
    const where: Prisma.QuestionWhereInput = {
      isActive: true,
      isReserved: false, // Epic #61: Exclude questions reserved for fixed practice tests
    };

    // Module type filter (optional for mixed mode)
    if (query.moduleType) {
      where.moduleType = query.moduleType;
    }
    
    // Visual type filter (V3 feature)
    if (query.visualType) {
      where.visualType = query.visualType;
    }
    
    // Category filter
    if (query.category) {
      where.category = { in: getCategoryAliases(query.category) };
    }
    
    // Subtopic filter
    if (query.subtopic) {
      where.subtopic = query.subtopic;
    }
    
    // Difficulty filters (string or numeric range)
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    } else if (query.difficultyMin !== undefined || query.difficultyMax !== undefined) {
      // Numeric difficulty range (V3 feature: difficultyScore)
      where.difficultyScore = {};
      if (query.difficultyMin !== undefined) {
        where.difficultyScore.gte = query.difficultyMin;
      }
      if (query.difficultyMax !== undefined) {
        where.difficultyScore.lte = query.difficultyMax;
      }
    }
    
    // Exclude IDs (for adaptive practice - don't repeat questions)
    if (query.excludeIds) {
      const excludedIds = query.excludeIds.split(',').map(id => id.trim()).filter(Boolean);
      if (excludedIds.length > 0) {
        where.id = { notIn: excludedIds };
      }
    }
    
    // Execute query with retry logic
    const baseSelect = {
      id: true,
      moduleType: true,
      difficulty: true,
      difficultyScore: true,
      category: true,
      subtopic: true,
      visualType: true,
      question: true,
      passage: true,
      options: true,
      correctAnswer: true,
      explanation: query.includeExplanations === 'true',
      wrongAnswerExplanations: query.includeExplanations === 'true',
      imageUrl: true,
      imageData: true,
      imageMimeType: true,
      imageAlt: true,
      chartData: true,
      timeEstimate: true,
      source: true,
      tags: true,
      createdAt: true
    } as const;

    let noRepeatMeta: { scopeKey: string; cycleNumber: number; rolledCycle: boolean; degraded?: boolean; reason?: string } | null = null;

    const questions = await retryWithBackoff(async () => {
      if (!shouldUseNoRepeat || !noRepeatUserId) {
        return await prisma.question.findMany({
          where,
          take: fetchTake,
          orderBy: {
            createdAt: 'desc' // Recent questions first
          },
          select: baseSelect
        });
      }

      try {
        const scopeKey = buildDrillScopeKey({
          moduleType: query.moduleType || 'mixed',
          category: query.category || 'mixed',
          difficulty: query.difficulty || 'mixed',
        });

        const selection = await selectNoRepeatDrillQuestions({
          userId: noRepeatUserId,
          scopeKey,
          where,
          count: query.count,
          orderBy: { createdAt: 'desc' },
        });

        noRepeatMeta = {
          scopeKey: selection.scopeKey,
          cycleNumber: selection.cycleNumber,
          rolledCycle: selection.rolledCycle,
        };

        if (selection.questionIds.length === 0) {
          return [];
        }

        const selectedQuestions = await prisma.question.findMany({
          where: {
            id: { in: selection.questionIds },
          },
          select: baseSelect,
        });

        const byId = new Map(selectedQuestions.map((question) => [question.id, question]));
        return selection.questionIds
          .map((id) => byId.get(id))
          .filter((question): question is NonNullable<typeof question> => !!question);
      } catch (error) {
        if (!isNoRepeatInfrastructureError(error)) {
          throw error
        }

        shouldUseNoRepeat = false
        noRepeatMeta = {
          scopeKey: buildDrillScopeKey({
            moduleType: query.moduleType || 'mixed',
            category: query.category || 'mixed',
            difficulty: query.difficulty || 'mixed',
          }),
          cycleNumber: 0,
          rolledCycle: false,
          degraded: true,
          reason: 'norepeat_infrastructure_unavailable',
        }

        console.warn('[/api/questions/practice] No-repeat unavailable, falling back to standard selection', {
          userId: noRepeatUserId,
          moduleType: query.moduleType || 'mixed',
          category: query.category || 'mixed',
          difficulty: query.difficulty || 'mixed',
          reason: noRepeatMeta.reason,
          error: error instanceof Error ? error.message : String(error),
        })

        return await prisma.question.findMany({
          where,
          take: fetchTake,
          orderBy: {
            createdAt: 'desc'
          },
          select: baseSelect
        })
      }
    });
    let filteredQuestions = filterInvalidPracticeQuestions(questions, query.count);

    if (query.difficulty && filteredQuestions.length < query.count && !shouldUseNoRepeat) {
      const fallbackWhere: Prisma.QuestionWhereInput = { ...where }
      const excludedIds = [
        ...(query.excludeIds?.split(',').map(id => id.trim()).filter(Boolean) || []),
        ...questions.map(question => question.id),
      ]

      delete fallbackWhere.difficulty
      delete fallbackWhere.id

      if (excludedIds.length > 0) {
        fallbackWhere.id = { notIn: [...new Set(excludedIds)] }
      }

      const fallbackQuestions = await retryWithBackoff(async () => {
        return await prisma.question.findMany({
          where: fallbackWhere,
          take: getPracticeFetchTake(query.count - filteredQuestions.length, query.moduleType),
          orderBy: getFallbackOrderForDifficulty(query.difficulty),
          select: baseSelect
        });
      });

      const supplementalQuestions = filterInvalidPracticeQuestions(fallbackQuestions)
        .filter(question => !filteredQuestions.some(existing => existing.id === question.id))
        .slice(0, query.count - filteredQuestions.length)

      filteredQuestions = [...filteredQuestions, ...supplementalQuestions]
    }
    
    // Count total matching questions (for pagination info)
    const totalCount = await retryWithBackoff(async () => {
      return await prisma.question.count({ where });
    });
    
    // Transform response (parse JSON strings)
    const transformedQuestions = filteredQuestions.map(q => ({
      ...q,
      question: normalizeQuestionText(q.question),
      passage: q.passage ? normalizeQuestionText(q.passage) : null,
      options: normalizeQuestionOptions(q.options),
      explanation: q.explanation ? normalizeQuestionText(q.explanation) : q.explanation,
      tags: JSON.parse(q.tags),
      chartData: q.chartData ? JSON.parse(q.chartData) : null,
      wrongAnswerExplanations: q.wrongAnswerExplanations
        ? normalizeDeepText(JSON.parse(q.wrongAnswerExplanations))
        : null,
      imageAlt: q.imageAlt ? normalizeQuestionText(q.imageAlt) : null,
      // Convert imageData (Bytes) to base64 string if present
      imageData: q.imageData ? Buffer.from(q.imageData).toString('base64') : null
    }));
    
    const duration = Date.now() - startTime;
    
    console.log(`[/api/questions/practice] Success: ${transformedQuestions.length} questions returned in ${duration}ms`, {
      filters: {
        moduleType: query.moduleType,
        visualType: query.visualType,
        category: query.category,
        subtopic: query.subtopic,
        difficulty: query.difficulty,
        difficultyRange: query.difficultyMin || query.difficultyMax ? 
          `${query.difficultyMin || 0}-${query.difficultyMax || 100}` : null
      },
      noRepeat: shouldUseNoRepeat
        ? {
            enabled: true,
            userId: noRepeatUserId,
            scope: noRepeatMeta,
          }
        : { enabled: false },
      excludedCount: query.excludeIds ? query.excludeIds.split(',').length : 0,
      totalAvailable: totalCount,
      filteredOut: questions.length - filteredQuestions.length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        questions: transformedQuestions,
        count: transformedQuestions.length,
        totalAvailable: totalCount,
        hasMore: totalCount > transformedQuestions.length,
        filters: {
          moduleType: query.moduleType,
          visualType: query.visualType || null,
          category: query.category || null,
          subtopic: query.subtopic || null,
          difficulty: query.difficulty || null,
          noRepeat: shouldUseNoRepeat,
          difficultyRange: query.difficultyMin || query.difficultyMax ? 
            { min: query.difficultyMin, max: query.difficultyMax } : null
        }
      },
      noRepeat: noRepeatMeta,
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[/api/questions/practice] Error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/questions/practice
 * 
 * Advanced practice test generation with weighted sampling
 * 
 * Body:
 * {
 *   moduleType: 'math' | 'reading-writing',
 *   count: number,
 *   distribution?: {
 *     easy: number,    // Percentage 0-100
 *     medium: number,  // Percentage 0-100
 *     hard: number     // Percentage 0-100
 *   },
 *   visualTypes?: string[],  // Specific visual types to include
 *   excludeIds?: string[],   // Previously seen questions
 *   randomize?: boolean      // Shuffle results (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Validation schema for POST
    const postSchema = z.object({
      moduleType: z.enum(['math', 'reading-writing']),
      count: z.number().min(1).max(50),
      distribution: z.object({
        easy: z.number().min(0).max(100),
        medium: z.number().min(0).max(100),
        hard: z.number().min(0).max(100)
      }).optional(),
      visualTypes: z.array(z.string()).optional(),
      excludeIds: z.array(z.string()).optional(),
      randomize: z.boolean().default(true)
    });
    
    const validationResult = postSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validationResult.error.errors
      }, { status: 400 });
    }
    
    const data = validationResult.data;
    
    // Calculate distribution counts
    const distribution = data.distribution || { easy: 33, medium: 34, hard: 33 };
    const easyCount = Math.round((distribution.easy / 100) * data.count);
    const mediumCount = Math.round((distribution.medium / 100) * data.count);
    const hardCount = data.count - easyCount - mediumCount; // Ensure exact count
    
    // Fetch questions by difficulty
    const fetchByDifficulty = async (difficulty: string, count: number) => {
      const where: Prisma.QuestionWhereInput = {
        isActive: true,
        isReserved: false, // Epic #61: Exclude questions reserved for fixed practice tests
        moduleType: data.moduleType,
        difficulty
      };
      
      if (data.visualTypes && data.visualTypes.length > 0) {
        where.visualType = { in: data.visualTypes };
      }
      
      if (data.excludeIds && data.excludeIds.length > 0) {
        where.id = { notIn: data.excludeIds };
      }
      
      return await prisma.question.findMany({
        where,
        take: getPracticeFetchTake(count, data.moduleType),
        orderBy: data.randomize ? { createdAt: 'desc' } : undefined,
        select: {
          id: true,
          moduleType: true,
          difficulty: true,
          difficultyScore: true,
          category: true,
          subtopic: true,
          visualType: true,
          question: true,
          passage: true,
          options: true,
          correctAnswer: true,
          imageUrl: true,
          imageData: true,
          imageMimeType: true,
          imageAlt: true,
          chartData: true,
          timeEstimate: true
        }
      });
    };
    
    // Fetch questions in parallel
    const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
      retryWithBackoff(() => fetchByDifficulty('easy', easyCount)),
      retryWithBackoff(() => fetchByDifficulty('medium', mediumCount)),
      retryWithBackoff(() => fetchByDifficulty('hard', hardCount))
    ]);
    
    const allQuestions = [
      ...filterInvalidPracticeQuestions(easyQuestions, easyCount),
      ...filterInvalidPracticeQuestions(mediumQuestions, mediumCount),
      ...filterInvalidPracticeQuestions(hardQuestions, hardCount),
    ];
    
    // Randomize if requested
    if (data.randomize) {
      allQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Transform response
    const transformedQuestions = allQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      chartData: q.chartData ? JSON.parse(q.chartData) : null,
      imageData: q.imageData ? Buffer.from(q.imageData).toString('base64') : null
    }));
    
    const duration = Date.now() - startTime;
    
    console.log(`[/api/questions/practice POST] Success: ${allQuestions.length} questions generated in ${duration}ms`, {
      distribution: { easy: easyQuestions.length, medium: mediumQuestions.length, hard: hardQuestions.length }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        questions: transformedQuestions,
        count: allQuestions.length,
        distribution: {
          easy: easyQuestions.length,
          medium: mediumQuestions.length,
          hard: hardQuestions.length
        }
      },
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[/api/questions/practice POST] Error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
