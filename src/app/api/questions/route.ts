import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Helper function to check if an error is a database connection error.
 * Detects PrismaClientInitializationError and connection-related errors.
 */
function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  // Check for PrismaClientInitializationError
  if ('name' in error && error.name === 'PrismaClientInitializationError') {
    return true;
  }
  
  // Check for common connection error codes
  if ('code' in error) {
    const code = String((error as { code: unknown }).code);
    // Connection errors typically start with P1xxx in Prisma
    if (code.startsWith('P1')) return true;
  }
  
  // Check error message for connection-related keywords
  if ('message' in error) {
    const message = String((error as { message: unknown }).message).toLowerCase();
    return (
      message.includes('connect') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('can\'t reach database')
    );
  }
  
  return false;
}

/**
 * Retry a database operation with exponential backoff.
 * Attempts up to 3 times with delays: 200ms, 500ms, 1000ms.
 */
async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  backoffDelays = [200, 500, 1000]
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry on connection errors
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < maxAttempts - 1) {
        const delay = backoffDelays[attempt] || 1000;
        console.log(`[retryDatabaseOperation] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  throw lastError;
}

/**
 * GET /api/questions
 * 
 * Fetches questions with filtering, pagination, and related data.
 * 
 * Note: This implementation uses Prisma's ORM methods (findMany, count) which are
 * safe and preferred over raw SQL queries. If raw SQL queries are needed in the future,
 * refer to @/lib/prismaQueryUtils for safe parameterized query patterns.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subtopic = searchParams.get('subtopic');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';
    
    // Validate and sanitize pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const parsedLimit = parseInt(limitParam || '50', 10);
    const parsedOffset = parseInt(offsetParam || '0', 10);
    
    if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
      console.error('[/api/questions] Invalid pagination parameters', { limit: limitParam, offset: offsetParam });
      return NextResponse.json({
        error: 'Invalid pagination parameters',
        details: 'Limit and offset must be valid numbers'
      }, { status: 400 });
    }
    
    const limit = Math.min(Math.max(parsedLimit, 1), 100);
    const offset = Math.max(parsedOffset, 0);

    // Build where clause
    const where: Prisma.QuestionWhereInput = {
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (subtopic) {
      where.subtopic = subtopic;
    }

    if (source) {
      where.source = source;
    }

    if (search) {
      const s = search;
      where.OR = [
        { question: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { 
          AND: [
            { passage: { not: null } },
            { passage: { contains: s, mode: 'insensitive' } }
          ]
        },
        { 
          AND: [
            { subtopic: { not: null } },
            { subtopic: { contains: s, mode: 'insensitive' } }
          ]
        }
      ];
    }
 
    console.log('[/api/questions] Fetching questions with filters:', { 
      category, 
      subtopic, 
      source, 
      search: search ? `${search.substring(0, 20)}...` : null,
      sortOrder,
      limit,
      offset
    });
    
    // Fetch questions with related data using retry logic
    // Note: Explicitly selecting only fields that exist in the database
    // imageData and imageMimeType fields are defined in schema but the migration hasn't been applied yet
    let questions;
    try {
      questions = await retryDatabaseOperation(async () => {
        return await prisma.question.findMany({
          where,
          select: {
            id: true,
            subtopicId: true,
            moduleType: true,
            difficulty: true,
            category: true,
            subtopic: true,
            question: true,
            passage: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            wrongAnswerExplanations: true,
            imageUrl: true,
            imageAlt: true,
            chartData: true,
            timeEstimate: true,
            source: true,
            tags: true,
            isActive: true,
            reviewStatus: true,
            reviewComments: true,
            reviewedBy: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true,
            subtopicRef: {
              select: {
                id: true,
                name: true,
                description: true,
                topic: {
                  select: {
                    id: true,
                    name: true,
                    moduleType: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: sortOrder
          },
          take: limit,
          skip: offset
        });
      });
      console.log(`[/api/questions] Found ${questions.length} questions`);
    } catch (dbError) {
      console.error('[/api/questions] Database error fetching questions:', dbError);
      
      // Check if this is a connection error
      if (isDatabaseConnectionError(dbError)) {
        // Log the original error for diagnostics
        if (dbError instanceof Error) {
          console.error('[/api/questions] Connection error details:', {
            name: dbError.name,
            message: dbError.message,
            stack: dbError.stack
          });
        }
        
        return NextResponse.json({
          error: 'database_unavailable',
          message: 'Database is temporarily unavailable. Please try again later.'
        }, { status: 503 });
      }
      
      // Other database errors
      return NextResponse.json({
        error: 'Database error while fetching questions',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    // Get total count for pagination with retry logic
    let totalCount;
    try {
      totalCount = await retryDatabaseOperation(async () => {
        return await prisma.question.count({ where });
      });
      console.log(`[/api/questions] Total count: ${totalCount}`);
    } catch (countError) {
      console.error('[/api/questions] Error counting questions:', countError);
      
      // Check if this is a connection error
      if (isDatabaseConnectionError(countError)) {
        // If we can't count due to connection issues, return 503
        if (countError instanceof Error) {
          console.error('[/api/questions] Connection error during count:', countError.message);
        }
        return NextResponse.json({
          error: 'database_unavailable',
          message: 'Database is temporarily unavailable. Please try again later.'
        }, { status: 503 });
      }
      
      // For other errors, continue with questions but set count to unknown
      totalCount = questions.length;
    }

    // Get unique categories and subtopics for filtering with retry logic
    let categories: Array<{ category: string }> = [];
    let subtopics: Array<{ subtopic: string | null }> = [];
    let sources: Array<{ source: string | null }> = [];
    try {
      [categories, subtopics, sources] = await retryDatabaseOperation(async () => {
        return await Promise.all([
          prisma.question.findMany({
            where: { isActive: true },
            select: { category: true },
            distinct: ['category']
          }),
          prisma.question.findMany({
            where: { isActive: true, subtopic: { not: null } },
            select: { subtopic: true },
            distinct: ['subtopic']
          }),
          prisma.question.findMany({
            where: { isActive: true, source: { not: null } },
            select: { source: true },
            distinct: ['source']
          })
        ]);
      });
      console.log(`[/api/questions] Filters loaded: ${categories.length} categories, ${subtopics.length} subtopics, ${sources.length} sources`);
    } catch (filterError) {
      console.error('[/api/questions] Error fetching filter options:', filterError);
      
      // Connection errors during filter fetch are not critical, use empty arrays
      if (isDatabaseConnectionError(filterError) && filterError instanceof Error) {
        console.error('[/api/questions] Connection error during filter fetch:', filterError.message);
      }
      
      // Return empty arrays as fallback
      categories = [];
      subtopics = [];
      sources = [];
    }

    // Normalize result to ensure consistent types and clearer text
    const decodeHTMLEntities = (text: string): string => {
      if (typeof text !== 'string') return '';
      try {
        return text
          // Decode common HTML entities
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          // Numeric entities (decimal and hex)
          .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
          .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
          // Decode ampersand last to avoid double-decoding
          .replace(/&amp;/g, '&');
      } catch (err) {
        console.error('Error in decodeHTMLEntities:', err, 'Input:', text);
        return text;
      }
    };

    const cleanText = (text: unknown): string => {
      if (typeof text !== 'string') return '';
      try {
        const stripped = text.replace(/^\s*["']|["']\s*$/g, '');
        const decoded = decodeHTMLEntities(stripped);
        return decoded
          .split(/\r?\n/)
          .map((line) => line.replace(/[ \t]+/g, ' ').trim())
          .join('\n')
          .trim();
      } catch (err) {
        console.error('Error in cleanText:', err, 'Input:', text);
        return String(text);
      }
    };
    
    const cleanOptionalText = (text: unknown): string | undefined => {
      if (text == null) return undefined;
      if (typeof text !== 'string') return String(text);
      return cleanText(text);
    };

    const toISOStringOrNull = (date: Date | null | undefined): string | null => {
      return date ? date.toISOString() : null;
    };

    const parseArrayString = (input: unknown): string[] | null => {
      if (typeof input === 'string') {
        try {
          const parsed = JSON.parse(input);
          if (Array.isArray(parsed)) return parsed.map((x) => String(x));
        } catch {}
      }
      return null;
    };

    const normalizeOptions = (options: unknown): string[] => {
      const normalizeOne = (o: unknown) => {
        try {
          const s = typeof o === 'string' ? o : String(o);
          const stripped = s.replace(/^\s*["']|["']\s*$/g, '');
          const decoded = decodeHTMLEntities(stripped);
          return decoded;
        } catch (err) {
          console.error('Error in normalizeOne:', err, 'Input:', o);
          return String(o);
        }
      };

      try {
        if (Array.isArray(options)) {
          return (options as unknown[]).map(normalizeOne);
        }
        const parsed = parseArrayString(options);
        if (parsed) {
          return parsed.map(normalizeOne);
        }
        return [];
      } catch (err) {
        console.error('Error in normalizeOptions:', err, 'Input:', options);
        return [];
      }
    };

    // Helper function to ensure JSON fields are properly serializable
    // Moved outside the map to avoid recreation on every iteration
    const safeJsonParse = (value: unknown): unknown => {
      if (value == null) return null;
      
      try {
        // If it's already an object/array, ensure it's serializable by round-tripping
        // This removes undefined values and ensures no circular references
        if (typeof value === 'object') {
          return JSON.parse(JSON.stringify(value));
        }
        
        // If it's a string, try to parse it
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        
        return value;
      } catch (err) {
        console.error('[/api/questions] Error in safeJsonParse:', err, 'Input:', typeof value);
        return null;
      }
    };

    const normalizedQuestions = questions.map((q) => {
      try {
        // Extract ID prefix once for consistent logging
        const questionIdShort = q.id.substring(0, 8);

        const result = {
          id: q.id,
          question: cleanText(q.question),
          explanation: cleanText(q.explanation),
          passage: typeof q.passage === 'string' ? cleanText(q.passage) : q.passage,
          options: normalizeOptions(q.options),
          correctAnswer: q.correctAnswer,
          tags: Array.isArray(q.tags) ? q.tags : [],
          imageUrl: q.imageUrl,
          imageAlt: cleanOptionalText(q.imageAlt),
          source: cleanOptionalText(q.source),
          difficulty: q.difficulty,
          category: q.category,
          subtopic: q.subtopic,
          moduleType: q.moduleType,
          timeEstimate: q.timeEstimate,
          chartData: safeJsonParse(q.chartData),
          wrongAnswerExplanations: safeJsonParse(q.wrongAnswerExplanations),
          reviewStatus: q.reviewStatus,
          reviewComments: q.reviewComments,
          reviewedBy: q.reviewedBy,
          reviewedAt: toISOStringOrNull(q.reviewedAt),
          createdAt: q.createdAt.toISOString(),
          updatedAt: toISOStringOrNull(q.updatedAt),
          // Explicitly include subtopicRef to ensure proper serialization
          subtopicRef: q.subtopicRef ? {
            id: q.subtopicRef.id,
            name: q.subtopicRef.name,
            description: q.subtopicRef.description || null,
            topic: q.subtopicRef.topic ? {
              id: q.subtopicRef.topic.id,
              name: q.subtopicRef.topic.name,
              moduleType: q.subtopicRef.topic.moduleType
            } : null
          } : null
        };

        // Verify this individual question is JSON-serializable
        try {
          JSON.stringify(result);
        } catch (itemError) {
          console.error(`[/api/questions] Question ${questionIdShort} failed serialization:`, itemError);
          console.error('[/api/questions] Problematic fields:', {
            hasChartData: !!q.chartData,
            hasWrongAnswerExplanations: !!q.wrongAnswerExplanations,
            hasOptions: !!q.options,
            hasSubtopicRef: !!q.subtopicRef
          });
          throw itemError;
        }

        // Log diagram info for debugging
        if (q.chartData || q.imageUrl) {
          console.log(`[/api/questions] Question ${questionIdShort}: chartData=${!!q.chartData}, imageUrl=${!!q.imageUrl}`);
        }

        return result;
      } catch (err) {
        console.error(`[/api/questions] Error normalizing question ${q.id}:`, err);
        throw err;
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[/api/questions] Request completed in ${duration}ms, returning ${normalizedQuestions.length} questions`);

    // Build response object
    const responseData = {
      questions: normalizedQuestions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      filters: {
        categories: categories.map(c => c.category).filter(Boolean),
        subtopics: subtopics.map(s => s.subtopic).filter(Boolean),
        sources: sources.map(s => s.source).filter(Boolean)
      }
    };

    // Final safety check: ensure the response is JSON-serializable
    try {
      JSON.stringify(responseData);
    } catch (serializationError) {
      console.error('[/api/questions] Response serialization failed:', serializationError);
      return NextResponse.json({
        error: 'Failed to serialize response',
        details: serializationError instanceof Error ? serializationError.message : 'Unknown serialization error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json(responseData);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[/api/questions] Error after ${duration}ms:`, error);
    if (error instanceof Error) {
      console.error('[/api/questions] Error name:', error.name);
      console.error('[/api/questions] Error message:', error.message);
      console.error('[/api/questions] Error stack:', error.stack);
    }
    
    // Check if this is a connection error first
    if (isDatabaseConnectionError(error)) {
      console.error('[/api/questions] Database connection error in outer catch:', error instanceof Error ? error.message : String(error));
      return NextResponse.json({
        error: 'database_unavailable',
        message: 'Database is temporarily unavailable. Please try again later.'
      }, { status: 503 });
    }
    
    // Check if it's a Prisma error
    let errorMessage = 'Failed to fetch questions';
    const errorDetails = error instanceof Error ? error.message : String(error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown };
      console.error('[/api/questions] Prisma error code:', prismaError.code);
      
      if (prismaError.code === 'P2002') {
        errorMessage = 'Database constraint violation';
      } else if (prismaError.code === 'P2025') {
        errorMessage = 'Record not found';
      } else if (prismaError.code.startsWith('P')) {
        errorMessage = 'Database error';
      }
    }
    
    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
}
}