export type TutorRole = 'user' | 'assistant'

export interface TutorMessage {
  role: TutorRole
  content: string
}

export interface TutorQuestionContext {
  moduleType?: string | null
  category?: string | null
  difficulty?: string | null
  subtopic?: string | null
  question?: string | null
  passage?: string | null
  options?: string[]
  selectedAnswer?: number | null
  correctAnswer?: number | null
  isRevealed?: boolean
}

export interface TutorReply {
  reply: string
  tier: 'quality' | 'budget'
  modelUsed: string
}

interface ProviderTarget {
  endpoint: string
  model: string
  tier: 'quality' | 'budget'
}

const MAX_MESSAGE_COUNT = 20
const MAX_MESSAGE_LENGTH = 2000

function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, MAX_MESSAGE_LENGTH)
}

function normalizeMessages(messages: TutorMessage[]): TutorMessage[] {
  return messages
    .slice(-MAX_MESSAGE_COUNT)
    .map((message) => ({ role: message.role, content: sanitizeText(message.content) }))
    .filter((message) => message.content.length > 0)
}

function buildAzureChatEndpoint(base: string, deployment: string, apiVersion: string): string {
  if (/\/openai\/deployments\//i.test(base)) {
    return base
  }

  const normalized = base.replace(/\/$/, '')
  return `${normalized}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
}

function getApiKey(): string {
  return (
    process.env.AI_TUTOR_API_KEY ||
    process.env.AZURE_OPENAI_API_KEY ||
    ''
  )
}

function getProviderTargets(): { quality: ProviderTarget; budget: ProviderTarget } {
  const apiVersion = process.env.AI_TUTOR_API_VERSION || process.env.AZURE_OPENAI_API_VERSION || process.env.API_VERSION || '2025-01-01-preview'
  const baseEndpoint = process.env.AI_TUTOR_ENDPOINT || process.env.ENDPOINT_URL || process.env.AZURE_OPENAI_ENDPOINT || ''

  const qualityModel = process.env.AI_TUTOR_QUALITY_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || process.env.DEPLOYMENT_NAME || 'gpt-5'
  const budgetModel = process.env.AI_TUTOR_BUDGET_DEPLOYMENT || 'gpt-4o-mini'

  const qualityEndpoint = buildAzureChatEndpoint(
    process.env.AI_TUTOR_QUALITY_ENDPOINT || baseEndpoint,
    qualityModel,
    apiVersion
  )

  const budgetEndpoint = buildAzureChatEndpoint(
    process.env.AI_TUTOR_BUDGET_ENDPOINT || baseEndpoint,
    budgetModel,
    apiVersion
  )

  return {
    quality: {
      endpoint: qualityEndpoint,
      model: qualityModel,
      tier: 'quality',
    },
    budget: {
      endpoint: budgetEndpoint,
      model: budgetModel,
      tier: 'budget',
    },
  }
}

function shouldUseQualityTier(context: TutorQuestionContext, latestUserMessage: string): boolean {
  const text = latestUserMessage.toLowerCase()

  if (context.isRevealed) return true
  if (text.length > 280) return true

  const qualitySignals = [
    'step by step',
    'why',
    'prove',
    'derive',
    'detailed',
    'full explanation',
    'strategy',
  ]

  return qualitySignals.some((signal) => text.includes(signal))
}

function buildSystemPrompt(context: TutorQuestionContext): string {
  const isPreAnswer = !context.isRevealed

  const guardrail = isPreAnswer
    ? 'Do not reveal the final answer choice directly before the student checks/submits their answer. Give scaffolded hints first.'
    : 'Student has already submitted/checked answer. You may explain correctness clearly and compare choices.'

  return [
    'You are DuckSAT AI Tutor, an expert SAT coach focused on Digital SAT topic drills.',
    'Your goals: improve understanding, confidence, and strategy under time pressure.',
    guardrail,
    'Keep responses concise, actionable, and supportive.',
    'When useful, provide a short numbered plan.',
    'If student asks for direct answer before submission, provide a hint progression instead of the final option letter.',
    'Never fabricate question details that are not in context.',
  ].join(' ')
}

function buildContextMessage(context: TutorQuestionContext): string {
  const options = Array.isArray(context.options)
    ? context.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')
    : ''

  return [
    'Question Context:',
    `Module: ${context.moduleType || 'unknown'}`,
    `Category: ${context.category || 'unknown'}`,
    `Difficulty: ${context.difficulty || 'unknown'}`,
    `Subtopic: ${context.subtopic || 'unknown'}`,
    `Question: ${context.question || 'not provided'}`,
    context.passage ? `Passage: ${context.passage}` : 'Passage: none',
    options ? `Options:\n${options}` : 'Options: not provided',
    context.selectedAnswer != null ? `Student selected index: ${context.selectedAnswer}` : 'Student selected index: none',
    context.correctAnswer != null ? `Correct answer index: ${context.correctAnswer}` : 'Correct answer index: hidden',
    `Is revealed: ${context.isRevealed ? 'yes' : 'no'}`,
  ].join('\n')
}

function extractTextFromModelResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const payload = data as Record<string, unknown>

  const choices = payload.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>
    const message = first.message as Record<string, unknown> | undefined
    const messageContent = message?.content

    if (typeof messageContent === 'string' && messageContent.trim()) {
      return messageContent.trim()
    }

    if (Array.isArray(messageContent)) {
      const combined = messageContent
        .map((item) => {
          if (typeof item === 'string') return item
          if (!item || typeof item !== 'object') return ''
          const objectItem = item as Record<string, unknown>
          if (typeof objectItem.text === 'string') return objectItem.text
          if (typeof objectItem.content === 'string') return objectItem.content
          return ''
        })
        .join('')
        .trim()

      if (combined) return combined
    }
  }

  const outputText = payload.output_text
  if (typeof outputText === 'string' && outputText.trim()) {
    return outputText.trim()
  }

  return null
}

async function callTarget(
  target: ProviderTarget,
  context: TutorQuestionContext,
  messages: TutorMessage[]
): Promise<TutorReply> {
  const apiKey = getApiKey()
  if (!apiKey || !target.endpoint) {
    throw new Error('ai_tutor_not_configured')
  }

  const requestBody: Record<string, unknown> = {
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(context),
      },
      {
        role: 'system',
        content: buildContextMessage(context),
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    max_completion_tokens: 900,
  }

  if (target.model.toLowerCase().includes('gpt-5')) {
    requestBody.reasoning_effort = 'minimal'
  }

  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`ai_tutor_provider_error:${response.status}:${errorBody.slice(0, 300)}`)
  }

  const data = await response.json().catch(() => ({}))
  const reply = extractTextFromModelResponse(data)

  if (!reply) {
    throw new Error('ai_tutor_empty_response')
  }

  return {
    reply,
    tier: target.tier,
    modelUsed: target.model,
  }
}

export async function generateTutorReply(
  context: TutorQuestionContext,
  rawMessages: TutorMessage[]
): Promise<TutorReply> {
  const messages = normalizeMessages(rawMessages)
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || ''

  const targets = getProviderTargets()
  const primary = shouldUseQualityTier(context, latestUserMessage) ? targets.quality : targets.budget
  const fallback = primary.tier === 'quality' ? targets.budget : targets.quality

  try {
    return await callTarget(primary, context, messages)
  } catch (primaryError) {
    if (fallback.endpoint && fallback.endpoint !== primary.endpoint) {
      try {
        return await callTarget(fallback, context, messages)
      } catch {
        throw primaryError
      }
    }
    throw primaryError
  }
}
