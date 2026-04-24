import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { generateTutorReply, type TutorMessage, type TutorQuestionContext } from '@/lib/aiTutor'

interface RequestBody {
  messages?: Array<{ role?: string; content?: string }>
  context?: TutorQuestionContext
}

function isTutorRole(value: string): value is TutorMessage['role'] {
  return value === 'user' || value === 'assistant'
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody

    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const messages: TutorMessage[] = rawMessages
      .map((message) => {
        const role = typeof message.role === 'string' ? message.role : ''
        const content = typeof message.content === 'string' ? message.content.trim() : ''
        return isTutorRole(role) && content
          ? { role, content }
          : null
      })
      .filter((message): message is TutorMessage => message !== null)

    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages_required' }, { status: 400 })
    }

    const context: TutorQuestionContext = {
      moduleType: body.context?.moduleType ?? null,
      category: body.context?.category ?? null,
      difficulty: body.context?.difficulty ?? null,
      subtopic: body.context?.subtopic ?? null,
      question: body.context?.question ?? null,
      passage: body.context?.passage ?? null,
      options: Array.isArray(body.context?.options)
        ? body.context?.options.filter((option): option is string => typeof option === 'string')
        : [],
      selectedAnswer: typeof body.context?.selectedAnswer === 'number' ? body.context.selectedAnswer : null,
      correctAnswer: typeof body.context?.correctAnswer === 'number' ? body.context.correctAnswer : null,
      isRevealed: !!body.context?.isRevealed,
    }

    const reply = await generateTutorReply(context, messages)

    return NextResponse.json({ success: true, ...reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('ai_tutor_not_configured')) {
      return NextResponse.json(
        {
          error: 'ai_tutor_not_configured',
          message: 'AI tutor is not configured yet. Add tutor provider keys in environment variables.',
        },
        { status: 503 }
      )
    }

    console.error('[POST /api/ai-tutor/chat] Error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
