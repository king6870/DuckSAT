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
  allowAnswerReveal?: boolean
}

export interface TutorReply {
  reply: string
  tier: 'quality' | 'budget'
  modelUsed: string
  latencyMs: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
  refusalDetected: boolean
  answerBlocked: boolean
  escalationReason?: string | null
}

export interface TutorPolicySnapshot {
  policyName: string
  policyVersion: string
  config: {
    qualityModel: string
    budgetModel: string
    longMessageThreshold: number
    escalationSignals: string[]
  }
}

export interface TutorRoutingPolicyConfig {
  policyName: string
  policyVersion: string
  longMessageThreshold: number
  qualitySignals: string[]
}

export interface GenerateTutorReplyOptions {
  policy?: Partial<TutorRoutingPolicyConfig>
}

interface ProviderTarget {
  endpoint: string
  model: string
  requestModel?: string
  tier: 'quality' | 'budget'
  provider: TutorProvider
}

interface TutorUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
}

type TutorProvider = 'openai' | 'anthropic'

const MAX_MESSAGE_COUNT = 20
const MAX_MESSAGE_LENGTH = 2000
const DEFAULT_LONG_MESSAGE_QUALITY_THRESHOLD = 280
const REASONING_MAX_TOKENS = 900
const TUTOR_MAX_WORDS = 50

const QUALITY_SIGNALS = [
  'step by step',
  'why',
  'prove',
  'derive',
  'detailed',
  'full explanation',
  'strategy',
]

const CONFUSION_SIGNALS = [
  "i don't understand",
  "i dont understand",
  'still confused',
  'this makes no sense',
  'not sure why',
  'can you explain again',
]

function normalizeSignals(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const signal = raw.trim().toLowerCase()
    if (!signal || seen.has(signal)) continue
    seen.add(signal)
    normalized.push(signal)
  }

  return normalized
}

function getDefaultRoutingPolicy(): TutorRoutingPolicyConfig {
  const threshold = parseNumber(process.env.AI_TUTOR_LONG_MESSAGE_THRESHOLD)
  const envSignals = normalizeSignals((process.env.AI_TUTOR_QUALITY_SIGNALS || '').split(','))

  return {
    policyName: process.env.AI_TUTOR_POLICY_NAME || 'default-topic-drill-policy',
    policyVersion: process.env.AI_TUTOR_POLICY_VERSION || '1.0.0',
    longMessageThreshold:
      threshold != null && threshold >= 80 && threshold <= 1200 ? Math.round(threshold) : DEFAULT_LONG_MESSAGE_QUALITY_THRESHOLD,
    qualitySignals: envSignals.length > 0 ? envSignals : QUALITY_SIGNALS,
  }
}

function resolveRoutingPolicy(policyOverride?: Partial<TutorRoutingPolicyConfig>): TutorRoutingPolicyConfig {
  const defaults = getDefaultRoutingPolicy()
  if (!policyOverride) return defaults

  const threshold = parseNumber(policyOverride.longMessageThreshold)
  const overrideSignals = normalizeSignals(policyOverride.qualitySignals)

  return {
    policyName: typeof policyOverride.policyName === 'string' && policyOverride.policyName.trim()
      ? policyOverride.policyName.trim()
      : defaults.policyName,
    policyVersion: typeof policyOverride.policyVersion === 'string' && policyOverride.policyVersion.trim()
      ? policyOverride.policyVersion.trim()
      : defaults.policyVersion,
    longMessageThreshold: threshold != null && threshold >= 80 && threshold <= 1200
      ? Math.round(threshold)
      : defaults.longMessageThreshold,
    qualitySignals: overrideSignals.length > 0 ? overrideSignals : defaults.qualitySignals,
  }
}

const REFUSAL_PATTERNS = [
  /\bi can(?:not|'t)\b/i,
  /\bi(?: am|'m) unable\b/i,
  /\bi won(?:'|’)t help\b/i,
  /\bcannot assist with\b/i,
]

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
  return process.env.AI_TUTOR_API_KEY || process.env.AZURE_OPENAI_API_KEY || ''
}

function normalizeTutorProvider(value: unknown): TutorProvider | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  if (normalized === 'anthropic' || normalized === 'claude' || normalized === 'anthropic_messages') {
    return 'anthropic'
  }

  if (normalized === 'openai' || normalized === 'azure_openai' || normalized === 'chat_completions') {
    return 'openai'
  }

  return null
}

function detectTutorProvider(endpoint: string): TutorProvider {
  if (/\/anthropic\/v1\/messages/i.test(endpoint)) {
    return 'anthropic'
  }

  return 'openai'
}

function buildProviderEndpoint(base: string, provider: TutorProvider, deploymentOrModel: string, apiVersion: string): string {
  if (provider === 'anthropic') {
    return base.trim()
  }

  return buildAzureChatEndpoint(base, deploymentOrModel, apiVersion)
}

function getProviderTargets(): { quality: ProviderTarget; budget: ProviderTarget } {
  const apiVersion =
    process.env.AI_TUTOR_API_VERSION || process.env.AZURE_OPENAI_API_VERSION || process.env.API_VERSION || '2025-01-01-preview'
  const baseEndpoint = process.env.AI_TUTOR_ENDPOINT || process.env.ENDPOINT_URL || process.env.AZURE_OPENAI_ENDPOINT || ''

  const qualityBaseEndpoint = process.env.AI_TUTOR_QUALITY_ENDPOINT || baseEndpoint
  const budgetBaseEndpoint = process.env.AI_TUTOR_BUDGET_ENDPOINT || baseEndpoint

  const defaultProvider =
    normalizeTutorProvider(process.env.AI_TUTOR_PROVIDER) || detectTutorProvider(baseEndpoint)
  const qualityProvider =
    normalizeTutorProvider(process.env.AI_TUTOR_QUALITY_PROVIDER) || detectTutorProvider(qualityBaseEndpoint) || defaultProvider
  const budgetProvider =
    normalizeTutorProvider(process.env.AI_TUTOR_BUDGET_PROVIDER) || detectTutorProvider(budgetBaseEndpoint) || defaultProvider

  const qualityModel =
    process.env.AI_TUTOR_QUALITY_MODEL ||
    process.env.AI_TUTOR_QUALITY_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    process.env.DEPLOYMENT_NAME ||
    (qualityProvider === 'anthropic' ? 'anthropic-messages-endpoint' : 'gpt-5')
  const budgetModel =
    process.env.AI_TUTOR_BUDGET_MODEL ||
    process.env.AI_TUTOR_BUDGET_DEPLOYMENT ||
    (budgetProvider === 'anthropic' ? qualityModel : 'gpt-4o-mini')

  const qualityRequestModel = process.env.AI_TUTOR_QUALITY_MODEL || process.env.AI_TUTOR_MODEL || undefined
  const budgetRequestModel = process.env.AI_TUTOR_BUDGET_MODEL || process.env.AI_TUTOR_MODEL || qualityRequestModel

  const qualityEndpoint = buildProviderEndpoint(qualityBaseEndpoint, qualityProvider, qualityModel, apiVersion)

  const budgetEndpoint = buildProviderEndpoint(budgetBaseEndpoint, budgetProvider, budgetModel, apiVersion)

  return {
    quality: {
      endpoint: qualityEndpoint,
      model: qualityModel,
      requestModel: qualityProvider === 'anthropic' ? qualityRequestModel : undefined,
      tier: 'quality',
      provider: qualityProvider,
    },
    budget: {
      endpoint: budgetEndpoint,
      model: budgetModel,
      tier: 'budget',
      requestModel: budgetProvider === 'anthropic' ? budgetRequestModel : undefined,
      provider: budgetProvider,
    },
  }
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function getCostRatePer1K(tier: 'quality' | 'budget', direction: 'input' | 'output'): number {
  const specificName =
    tier === 'quality'
      ? direction === 'input'
        ? 'AI_TUTOR_QUALITY_INPUT_COST_PER_1K'
        : 'AI_TUTOR_QUALITY_OUTPUT_COST_PER_1K'
      : direction === 'input'
      ? 'AI_TUTOR_BUDGET_INPUT_COST_PER_1K'
      : 'AI_TUTOR_BUDGET_OUTPUT_COST_PER_1K'

  const genericName = direction === 'input' ? 'AI_TUTOR_INPUT_COST_PER_1K' : 'AI_TUTOR_OUTPUT_COST_PER_1K'

  const specific = parseNumber(process.env[specificName])
  if (specific != null) return specific

  const generic = parseNumber(process.env[genericName])
  if (generic != null) return generic

  return 0
}

function estimateCostUsd(tier: 'quality' | 'budget', promptTokens?: number, completionTokens?: number): number | undefined {
  const inputRate = getCostRatePer1K(tier, 'input')
  const outputRate = getCostRatePer1K(tier, 'output')

  if (!inputRate && !outputRate) return undefined

  const inputCost = ((promptTokens || 0) / 1000) * inputRate
  const outputCost = ((completionTokens || 0) / 1000) * outputRate
  const estimate = inputCost + outputCost

  return Number.isFinite(estimate) ? Number(estimate.toFixed(6)) : undefined
}

function extractUsageFromModelResponse(data: unknown, tier: 'quality' | 'budget'): TutorUsage {
  if (!data || typeof data !== 'object') return {}

  const payload = data as Record<string, unknown>
  const usage = (payload.usage || {}) as Record<string, unknown>

  const promptTokens = parseNumber(usage.prompt_tokens) ?? parseNumber(usage.input_tokens)
  const completionTokens = parseNumber(usage.completion_tokens) ?? parseNumber(usage.output_tokens)

  const totalTokens =
    parseNumber(usage.total_tokens) ??
    (promptTokens != null || completionTokens != null ? (promptTokens || 0) + (completionTokens || 0) : undefined)

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd(tier, promptTokens, completionTokens),
  }
}

function detectRefusal(content: string): boolean {
  const normalized = content.trim()
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

function buildDirectAnswerPatterns(optionCount: number): RegExp[] {
  const safeCount = Math.min(Math.max(optionCount, 1), 8)
  const letters = 'ABCDEFGH'.slice(0, safeCount)
  const letterClass = `[${letters}]`
  const numberClass = safeCount > 1 ? `[1-${safeCount}]` : '1'

  return [
    new RegExp(`\\b(?:correct\\s+answer|answer|option|choice)\\s*(?:is|:)\\s*(?:option\\s*)?(?:${letterClass}|${numberClass})\\b`, 'i'),
    new RegExp(`\\b(?:choose|pick|select)\\s*(?:option\\s*)?(?:${letterClass}|${numberClass})\\b`, 'i'),
    new RegExp(`\\b(?:${letters.split('').join('|')})\\b\\s*(?:is\\s*)?(?:correct|right)\\b`, 'i'),
  ]
}

function shouldBlockAnswerReveal(reply: string, context: TutorQuestionContext): boolean {
  if (context.isRevealed || context.allowAnswerReveal) {
    return false
  }

  const optionCount = Array.isArray(context.options) && context.options.length > 0 ? context.options.length : 4
  const patterns = buildDirectAnswerPatterns(optionCount)

  return patterns.some((pattern) => pattern.test(reply))
}

function buildBlockedAnswerFallback(context: TutorQuestionContext): string {
  const topic = context.subtopic || context.category || 'this question'

  return [
    `I can help with ${topic} without revealing the final choice yet.`,
    'Identify the skill being tested, eliminate one weak option using evidence, then compare the two strongest choices.',
    'Share your reasoning and I will give one targeted hint.',
  ].join(' ')
}

function limitTutorReplyWords(reply: string, maxWords = TUTOR_MAX_WORDS): string {
  const normalized = reply.replace(/\s+/g, ' ').trim()
  if (!normalized) return normalized

  const words = normalized.split(' ')
  if (words.length <= maxWords) {
    return normalized
  }

  return words.slice(0, maxWords).join(' ')
}

function getTierDecision(
  context: TutorQuestionContext,
  latestUserMessage: string,
  messages: TutorMessage[],
  policy: TutorRoutingPolicyConfig
): {
  useQuality: boolean
  escalationReason: string | null
} {
  const text = latestUserMessage.toLowerCase()

  if (context.isRevealed) {
    return { useQuality: true, escalationReason: 'post_submission_explanation' }
  }

  if (text.length > policy.longMessageThreshold) {
    return { useQuality: true, escalationReason: 'long_query' }
  }

  for (const signal of policy.qualitySignals) {
    if (text.includes(signal)) {
      return { useQuality: true, escalationReason: `quality_signal:${signal}` }
    }
  }

  if (messages.length >= 6 && CONFUSION_SIGNALS.some((signal) => text.includes(signal))) {
    return { useQuality: true, escalationReason: 'multi_turn_confusion' }
  }

  return { useQuality: false, escalationReason: null }
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
    'Prefer Socratic hinting with clue progression from broad to precise.',
    'Every reply must be 50 words or fewer.',
    'Keep responses concise, actionable, and supportive.',
    'If useful, give at most two short steps within the 50-word limit.',
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

function buildOpenAIRequestBody(context: TutorQuestionContext, messages: TutorMessage[], target: ProviderTarget): Record<string, unknown> {
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
    max_completion_tokens: REASONING_MAX_TOKENS,
  }

  if (target.model.toLowerCase().includes('gpt-5')) {
    requestBody.reasoning_effort = 'minimal'
  }

  return requestBody
}

function buildAnthropicRequestBody(context: TutorQuestionContext, messages: TutorMessage[], target: ProviderTarget): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {
    system: `${buildSystemPrompt(context)}\n\n${buildContextMessage(context)}`,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    max_tokens: REASONING_MAX_TOKENS,
  }

  if (target.requestModel) {
    requestBody.model = target.requestModel
  }

  return requestBody
}

function buildProviderHeaders(apiKey: string, provider: TutorProvider): Record<string, string> {
  if (provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'x-api-key': apiKey,
      'anthropic-version': process.env.AI_TUTOR_ANTHROPIC_VERSION || '2023-06-01',
    }
  }

  return {
    'Content-Type': 'application/json',
    'api-key': apiKey,
    Authorization: `Bearer ${apiKey}`,
  }
}

function extractTextFromModelResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const payload = data as Record<string, unknown>

  const content = payload.content
  if (Array.isArray(content)) {
    const combined = content
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

async function callTarget(target: ProviderTarget, context: TutorQuestionContext, messages: TutorMessage[]): Promise<TutorReply> {
  const apiKey = getApiKey()
  if (!apiKey || !target.endpoint) {
    throw new Error('ai_tutor_not_configured')
  }

  const requestBody = target.provider === 'anthropic'
    ? buildAnthropicRequestBody(context, messages, target)
    : buildOpenAIRequestBody(context, messages, target)

  const start = Date.now()
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: buildProviderHeaders(apiKey, target.provider),
    body: JSON.stringify(requestBody),
  })
  const latencyMs = Date.now() - start

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`ai_tutor_provider_error:${response.status}:${errorBody.slice(0, 300)}`)
  }

  const data = await response.json().catch(() => ({}))
  const rawReply = extractTextFromModelResponse(data)
  const responsePayload = data as Record<string, unknown>

  if (!rawReply) {
    throw new Error('ai_tutor_empty_response')
  }

  const usage = extractUsageFromModelResponse(data, target.tier)
  const answerBlocked = shouldBlockAnswerReveal(rawReply, context)
  const finalReply = limitTutorReplyWords(answerBlocked ? buildBlockedAnswerFallback(context) : rawReply)

  return {
    reply: finalReply,
    tier: target.tier,
    modelUsed: typeof responsePayload.model === 'string' && responsePayload.model.trim() ? responsePayload.model : target.model,
    latencyMs,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
    refusalDetected: detectRefusal(finalReply),
    answerBlocked,
  }
}

export function getTutorPolicySnapshot(policyOverride?: Partial<TutorRoutingPolicyConfig>): TutorPolicySnapshot {
  const targets = getProviderTargets()
  const policy = resolveRoutingPolicy(policyOverride)

  return {
    policyName: policy.policyName,
    policyVersion: policy.policyVersion,
    config: {
      qualityModel: targets.quality.model,
      budgetModel: targets.budget.model,
      longMessageThreshold: policy.longMessageThreshold,
      escalationSignals: policy.qualitySignals,
    },
  }
}

export async function generateTutorReply(
  context: TutorQuestionContext,
  rawMessages: TutorMessage[],
  options?: GenerateTutorReplyOptions
): Promise<TutorReply> {
  const messages = normalizeMessages(rawMessages)
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || ''
  const policy = resolveRoutingPolicy(options?.policy)

  const targets = getProviderTargets()
  const decision = getTierDecision(context, latestUserMessage, messages, policy)

  const primary = decision.useQuality ? targets.quality : targets.budget
  const fallback = primary.tier === 'quality' ? targets.budget : targets.quality

  try {
    const response = await callTarget(primary, context, messages)
    return {
      ...response,
      escalationReason: decision.escalationReason,
    }
  } catch (primaryError) {
    if (fallback.endpoint && fallback.endpoint !== primary.endpoint) {
      try {
        const fallbackResponse = await callTarget(fallback, context, messages)
        const fallbackEscalationReason = primary.tier === 'budget' && fallback.tier === 'quality'
          ? 'budget_provider_fallback'
          : decision.escalationReason

        return {
          ...fallbackResponse,
          escalationReason: fallbackEscalationReason,
        }
      } catch {
        throw primaryError
      }
    }
    throw primaryError
  }
}
