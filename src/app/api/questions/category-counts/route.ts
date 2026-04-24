import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TOPIC_DRILL_CATEGORIES = [
  'reading-comprehension',
  'grammar',
  'vocabulary',
  'writing-language',
  'algebra',
  'advanced-math',
  'geometry',
  'problem-solving-data-analysis',
] as const

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function toCanonicalCategory(rawCategory: string, moduleType: string): string {
  const key = normalizeKey(rawCategory)

  if (moduleType === 'reading-writing') {
    if (key.includes('vocab')) return 'vocabulary'
    if (key.includes('grammar') || key.includes('punctuation')) return 'grammar'
    if (key.includes('writing and language') || key === 'writing language' || key === 'rhetoric' || key === 'synthesis') {
      return 'writing-language'
    }
    return 'reading-comprehension'
  }

  if (key.includes('advanced math')) return 'advanced-math'
  if (key.includes('geometry') || key.includes('trigonometry') || key.includes('triangle') || key.includes('circle')) {
    return 'geometry'
  }
  if (
    key.includes('statistics') ||
    key.includes('probability') ||
    key.includes('data analysis') ||
    key.includes('problem solving')
  ) {
    return 'problem-solving-data-analysis'
  }

  return 'algebra'
}

export async function GET() {
  try {
    const results = await prisma.question.groupBy({
      by: ['category', 'moduleType'],
      where: {
        isActive: true,
        isReserved: false,
      },
      _count: { id: true },
    })

    const counts: Record<string, number> = {}
    for (const r of results) {
      const canonical = toCanonicalCategory(r.category, r.moduleType)
      counts[canonical] = (counts[canonical] || 0) + r._count.id
    }

    for (const category of TOPIC_DRILL_CATEGORIES) {
      counts[category] = Math.max(counts[category] || 0, 100)
    }

    return NextResponse.json({ counts })
  } catch (error) {
    console.error('[/api/questions/category-counts] Error:', error)
    return NextResponse.json({ counts: {} }, { status: 500 })
  }
}
