// PATCH /api/admin/topics/[id]/subtopics/[sid] — update a subtopic
// DELETE /api/admin/topics/[id]/subtopics/[sid] — archive a subtopic

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'
import { MIN_TARGET_QUESTIONS, MAX_TARGET_QUESTIONS } from '@/constants/topics'

interface RouteContext {
  params: Promise<{ id: string; sid: string }>
}

function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { sid } = await context.params
    const body = await req.json()
    const { name, description, targetQuestions, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (description !== undefined) data.description = description ? String(description).trim() : null
    if (targetQuestions !== undefined) {
      const t = Number(targetQuestions)
      if (!Number.isInteger(t) || t < MIN_TARGET_QUESTIONS || t > MAX_TARGET_QUESTIONS) {
        return NextResponse.json({ error: `targetQuestions must be between ${MIN_TARGET_QUESTIONS} and ${MAX_TARGET_QUESTIONS}` }, { status: 400 })
      }
      data.targetQuestions = t
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const subtopic = await prisma.subtopic.update({ where: { id: sid }, data })
    return NextResponse.json({ success: true, subtopic })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 })
    }
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A subtopic with that name already exists' }, { status: 409 })
    }
    console.error('Failed to update subtopic:', error)
    return NextResponse.json({ error: 'Failed to update subtopic' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { sid } = await context.params

    // Soft-delete: set isActive = false
    await prisma.subtopic.update({ where: { id: sid }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 })
    }
    console.error('Failed to archive subtopic:', error)
    return NextResponse.json({ error: 'Failed to archive subtopic' }, { status: 500 })
  }
}
