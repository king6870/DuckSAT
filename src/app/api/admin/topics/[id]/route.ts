// PATCH /api/admin/topics/[id] — update topic fields
// DELETE /api/admin/topics/[id] — archive (soft-delete) a topic

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
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

    const { id } = await context.params
    const body = await req.json()
    const { name, moduleType, description, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = String(name).trim()
    if (moduleType !== undefined) {
      if (!['reading-writing', 'math'].includes(moduleType)) {
        return NextResponse.json({ error: 'Invalid moduleType' }, { status: 400 })
      }
      data.moduleType = moduleType
    }
    if (description !== undefined) data.description = description ? String(description).trim() : null
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const topic = await prisma.topic.update({ where: { id }, data })
    return NextResponse.json({ success: true, topic })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A topic with that name already exists' }, { status: 409 })
    }
    console.error('Failed to update topic:', error)
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await context.params

    // Soft-delete: set isActive = false
    await prisma.topic.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }
    console.error('Failed to archive topic:', error)
    return NextResponse.json({ error: 'Failed to archive topic' }, { status: 500 })
  }
}
