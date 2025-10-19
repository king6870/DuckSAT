import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subtopic = searchParams.get('subtopic');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
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

    // Fetch questions with related data
    const questions = await prisma.question.findMany({
      where,
      include: {
        subtopicRef: {
          include: {
            topic: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

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

    return NextResponse.json({
      questions,
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
  } finally {
    await prisma.$disconnect();
  }
}