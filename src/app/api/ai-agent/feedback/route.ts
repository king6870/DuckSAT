import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAIAgentSchemaNotReady } from '@/lib/aiAgentStorage'

const feedbackSchema = z.object({
  messageId: z.string().trim().min(1).max(120),
  feedbackValue: z.union([z.literal(-1), z.literal(1)]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        },
        { status: 400 }
      )
    }

    const { messageId, feedbackValue } = parsed.data

    const existingMessage = await prisma.aIAgentMessage.findFirst({
      where: {
        id: messageId,
        userId: session.user.id,
        role: 'assistant',
      },
      select: {
        id: true,
      },
    })

    if (!existingMessage) {
      return NextResponse.json({ success: false, error: 'message_not_found' }, { status: 404 })
    }

    await prisma.aIAgentMessage.update({
      where: {
        id: messageId,
      },
      data: {
        feedbackValue,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isAIAgentSchemaNotReady(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ai_agent_schema_not_ready',
          message: 'AI agent tables are not available yet. Run the latest database migration.',
        },
        { status: 503 }
      )
    }

    console.error('[POST /api/ai-agent/feedback] Error:', error)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
