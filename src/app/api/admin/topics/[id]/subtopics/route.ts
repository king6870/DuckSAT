// POST /api/admin/topics/[id]/subtopics — create a subtopic under a topic

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TARGET_QUESTIONS, MIN_TARGET_QUESTIONS, MAX_TARGET_QUESTIONS } from '@/constants/topics'

interface RouteContext {
  params: Promise<{ id: string }>
}

function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id: topicId } = await context.params
    const body = await req.json()
    const { name, description, targetQuestions } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const target = targetQuestions !== undefined ? Number(targetQuestions) : DEFAULT_TARGET_QUESTIONS
    if (!Number.isInteger(target) || target < MIN_TARGET_QUESTIONS || target > MAX_TARGET_QUESTIONS) {
      return NextResponse.json({ error: `targetQuestions must be ${MIN_TARGET_QUESTIONS}–${MAX_TARGET_QUESTIONS}` }, { status: 400 })
    }

    const subtopic = await prisma.subtopic.create({
      data: {
        topicId,
        name: name.trim(),
        description: description?.trim() || null,
        targetQuestions: target,
      },
    })

    return NextResponse.json({ success: true, subtopic }, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A subtopic with that name already exists in this topic' }, { status: 409 })
    }
    if ((error as { code?: string }).code === 'P2003') {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }
    console.error('Failed to create subtopic:', error)
    return NextResponse.json({ error: 'Failed to create subtopic' }, { status: 500 })
  }
}
