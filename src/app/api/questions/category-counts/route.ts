import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const results = await prisma.question.groupBy({
      by: ['category'],
      where: {
        isActive: true,
        isReserved: false,
      },
      _count: { id: true },
    })

    const counts: Record<string, number> = {}
    for (const r of results) {
      counts[r.category] = r._count.id
    }

    return NextResponse.json({ counts })
  } catch (error) {
    console.error('[/api/questions/category-counts] Error:', error)
    return NextResponse.json({ counts: {} }, { status: 500 })
  }
}
