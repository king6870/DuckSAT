// API endpoint to fetch topics and subtopics for admin question generation
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Fetch all topics with their subtopics
    const topics = await prisma.topic.findMany({
      where: { isActive: true },
      include: {
        subtopics: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      topics: topics.map(topic => ({
        id: topic.id,
        name: topic.name,
        moduleType: topic.moduleType,
        description: topic.description,
        subtopics: topic.subtopics.map(subtopic => ({
          id: subtopic.id,
          name: subtopic.name,
          description: subtopic.description,
          targetQuestions: subtopic.targetQuestions,
          currentCount: subtopic.currentCount
        }))
      }))
    })
  } catch (error) {
    console.error('Failed to fetch topics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
