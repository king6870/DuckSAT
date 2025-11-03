import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subtopic = searchParams.get('subtopic');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
        { passage: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { subtopic: { contains: s, mode: 'insensitive' } }
      ];
    }
 
    // Fetch questions with related data
    const questions = await prisma.question.findMany({
      where,
      include: {
        subtopicRef: {
          include: {
            topic: true
          }
        },
        _count: {
          select: {
            questionResults: true
          }
        }
      },
      orderBy: {
        createdAt: sortOrder
      },
      take: limit,
      skip: offset
    });

    // Fetch embedded diagram columns via raw SQL to avoid relying on generated Prisma types
    const ids = questions.map(q => q.id);
    let diagramMap = new Map<string, { base64: string | null; mime: string | null }>();
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<Array<{ id: string; diagram_png_base64: string | null; diagram_mime: string | null }>>`
        SELECT id, diagram_png_base64, diagram_mime FROM questions WHERE id IN (${Prisma.join(ids)})
      `;
      // Filter out Vega JSON specs that were incorrectly stored as images
      diagramMap = new Map(rows.map(r => {
        // Check if this is a Vega spec (starts with {"$schema" or similar JSON)
        if (r.diagram_png_base64 && r.diagram_png_base64.trim().startsWith('{')) {
          console.log(`Skipping Vega spec for question ${r.id.substring(0, 8)} - not a valid image`);
          return [r.id, { base64: null, mime: null }];
        }
        return [r.id, { base64: r.diagram_png_base64, mime: r.diagram_mime }];
      }));
    }

    // Get total count for pagination
    const totalCount = await prisma.question.count({ where });

    // Get unique categories and subtopics for filtering
    const categories = await prisma.question.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category']
    });

    const subtopics = await prisma.question.findMany({
      where: { isActive: true },
      select: { subtopic: true },
      distinct: ['subtopic']
    });

    const sources = await prisma.question.findMany({
      where: { isActive: true },
      select: { source: true },
      distinct: ['source']
    });

    // Normalize result to ensure consistent types and clearer text
    // Preserve line breaks and decode common HTML entities
    const decodeHTMLEntities = (text: string): string => {
      if (typeof text !== 'string') return '';
      return text
        // Decode ampersand first to allow double-encoded sequences like &lt; -> < -> <
        .replace(/&/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        // Numeric entities (decimal and hex)
        .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
    };

    const cleanText = (text: unknown): string => {
      if (typeof text !== 'string') return '';
      const stripped = text.replace(/^\s*["']|["']\s*$/g, '');
      const decoded = decodeHTMLEntities(stripped);
      return decoded
        .split(/\r?\n/)
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .trim();
    };
    
    const cleanOptionalText = (text: unknown): string | undefined => {
      if (text == null) return undefined;
      if (typeof text !== 'string') return String(text);
      return cleanText(text);
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
        const s = typeof o === 'string' ? o : String(o);
        const stripped = s.replace(/^\s*["']|["']\s*$/g, '');
        const decoded = decodeHTMLEntities(stripped);
        return decoded;
      };

      if (Array.isArray(options)) {
        return (options as unknown[]).map(normalizeOne);
      }
      const parsed = parseArrayString(options);
      if (parsed) {
        return parsed.map(normalizeOne);
      }
      return [];
    };

    const normalizedQuestions = questions.map((q) => {
      // Prefer DB-embedded diagram if available
      const d = diagramMap.get(q.id);
      const embeddedImage = d?.base64 ? `data:${d.mime || 'image/png'};base64,${d.base64}` : undefined;

      const result = {
        ...q,
        question: cleanText(q.question),
        explanation: cleanText(q.explanation),
        passage: typeof q.passage === 'string' ? cleanText(q.passage) : q.passage,
        options: normalizeOptions(q.options),
        tags: Array.isArray(q.tags) ? q.tags : [],
        imageUrl: embeddedImage || q.imageUrl,
        imageAlt: cleanOptionalText(q.imageAlt),
        source: cleanOptionalText(q.source)
      };

      // Log diagram info for debugging
      if (q.chartData || q.imageUrl || embeddedImage) {
        console.log(`Question ${q.id.substring(0, 8)}: chartData=${!!q.chartData}, imageUrl=${!!q.imageUrl}, embedded=${!!embeddedImage}`);
      }

      return result;
    });

    return NextResponse.json({
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
    });
    
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
}
}