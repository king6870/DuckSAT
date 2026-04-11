// API endpoint to manage topics and subtopics
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

// GET /api/admin/topics — list all topics with subtopics (include inactive when ?all=true)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const all = new URL(req.url).searchParams.get('all') === 'true'

    const topics = await prisma.topic.findMany({
      where: all ? undefined : { isActive: true },
      include: {
        subtopics: {
          where: all ? undefined : { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      topics: topics.map(topic => ({
        id: topic.id,
        name: topic.name,
        moduleType: topic.moduleType,
        description: topic.description,
        isActive: topic.isActive,
        subtopics: topic.subtopics.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          targetQuestions: s.targetQuestions,
          currentCount: s.currentCount,
          isActive: s.isActive,
        })),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch topics:', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }
}

// POST /api/admin/topics — create a new topic
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { name, moduleType, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!moduleType || !['reading-writing', 'math'].includes(moduleType)) {
      return NextResponse.json({ error: 'moduleType must be reading-writing or math' }, { status: 400 })
    }

    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        moduleType,
        description: description?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, topic }, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A topic with that name already exists' }, { status: 409 })
    }
    console.error('Failed to create topic:', error)
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
  }
}
