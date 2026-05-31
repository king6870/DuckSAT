export interface GenerateEmailDraftInput {
  prompt: string
  triggerType?: string
  triggerSummary?: string
  allowedTokens?: string[]
  defaultPrimaryButtonUrl?: string
}

export interface GeneratedEmailDraft {
  subject: string
  previewText: string
  eyebrow: string
  headline: string
  body: string
  primaryButtonLabel: string
  primaryButtonUrl: string
  secondaryButtonLabel: string
  secondaryButtonUrl: string
  footer: string
  model: string
}

export const BASE_EMAIL_TOKENS = [
  '{{firstName}}',
  '{{name}}',
  '{{email}}',
  '{{username}}',
  '{{plan}}',
  '{{promoCode}}',
  '{{promoBenefit}}',
  '{{promoRedeemUrl}}',
] as const

export const LIFECYCLE_EMAIL_TOKENS = [
  '{{targetScore}}',
  '{{currentScore}}',
  '{{scoreGap}}',
  '{{testDate}}',
  '{{satTestDate}}',
  '{{daysUntilTest}}',
  '{{scaledScore}}',
  '{{mathScore}}',
  '{{readingWritingScore}}',
  '{{practiceTestName}}',
  '{{studyStreakDays}}',
  '{{currentStudyStreakDays}}',
  '{{streakMilestone}}',
  '{{previousScore}}',
  '{{improvementAmount}}',
  '{{weakArea}}',
  '{{weakTopic}}',
  '{{weakAreaAccuracyRate}}',
  '{{weeklySummaryPeriod}}',
  '{{weeklyQuestionsAnswered}}',
  '{{weeklyQuestionsCorrect}}',
  '{{weeklyDrillsCompleted}}',
  '{{weeklyTestsCompleted}}',
  '{{weeklyStudyTimeHours}}',
  '{{weeklyAccuracyRate}}',
  '{{weeklyMiniGoal}}',
  '{{daysInactive}}',
  '{{lastActiveDate}}',
  '{{billingPlan}}',
  '{{subscriptionPlan}}',
  '{{subscriptionStatus}}',
  '{{currentPeriodEnd}}',
  '{{accessEndsOn}}',
] as const

function buildAzureChatEndpoint(base: string, deployment: string, apiVersion: string): string {
  if (/\/openai\/deployments\//i.test(base)) {
    return base
  }

  return `${base.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
}

function getGeneratorConfig() {
  const apiKey = process.env.EMAIL_AI_API_KEY || process.env.AZURE_OPENAI_API_KEY || ''
  const apiVersion =
    process.env.EMAIL_AI_API_VERSION ||
    process.env.AZURE_OPENAI_API_VERSION ||
    process.env.API_VERSION ||
    '2025-01-01-preview'
  const baseEndpoint = process.env.EMAIL_AI_ENDPOINT || process.env.ENDPOINT_URL || process.env.AZURE_OPENAI_ENDPOINT || ''
  const deployment =
    process.env.EMAIL_AI_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    process.env.DEPLOYMENT_NAME ||
    'gpt-5'

  if (!apiKey || !baseEndpoint) {
    throw new Error('Missing Azure OpenAI config: set AZURE_OPENAI_API_KEY and ENDPOINT_URL or AZURE_OPENAI_ENDPOINT')
  }

  return {
    apiKey,
    endpoint: buildAzureChatEndpoint(baseEndpoint, deployment, apiVersion),
    deployment,
  }
}

function extractTextContent(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return ''
  }

  const firstChoice = (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]
  const content = firstChoice?.message?.content

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .join('')
  }

  return ''
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  return JSON.parse(cleaned) as Record<string, unknown>
}

function buildSystemPrompt(allowedTokens: string[]): string {
  return [
    'You write lifecycle and product emails for DuckSAT.',
    'Return valid JSON only with the keys subject, previewText, eyebrow, headline, body, primaryButtonLabel, primaryButtonUrl, secondaryButtonLabel, secondaryButtonUrl, footer.',
    'The body should use short paragraphs, sound specific and confident, and stay concise.',
    `Only use merge tokens when they are directly helpful. Allowed tokens: ${allowedTokens.join(', ')}.`,
    'Do not mention unsubscribe because DuckSAT adds that automatically.',
    'Do not invent product features or flows that are not described in the prompt.',
  ].join(' ')
}

export async function generateEmailDraft(input: GenerateEmailDraftInput): Promise<GeneratedEmailDraft> {
  const prompt = input.prompt.trim()
  if (!prompt) {
    throw new Error('prompt is required')
  }

  const config = getGeneratorConfig()
  const allowedTokens = Array.from(new Set([
    ...BASE_EMAIL_TOKENS,
    ...LIFECYCLE_EMAIL_TOKENS,
    ...(input.allowedTokens || []),
  ]))
  const defaultPrimaryButtonUrl = input.defaultPrimaryButtonUrl?.trim() || 'https://www.ducksat.com'

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(allowedTokens),
        },
        {
          role: 'user',
          content: [
            input.triggerType ? `Trigger type: ${input.triggerType}` : '',
            input.triggerSummary ? `Trigger context: ${input.triggerSummary}` : '',
            `Prompt: ${prompt}`,
            `Default primaryButtonUrl should be ${defaultPrimaryButtonUrl} unless the prompt clearly asks for another destination.`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      temperature: 0.8,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Email generation failed'
    throw new Error(message)
  }

  const generated = parseJsonResponse(extractTextContent(payload))

  return {
    subject: typeof generated.subject === 'string' ? generated.subject : '',
    previewText: typeof generated.previewText === 'string' ? generated.previewText : '',
    eyebrow: typeof generated.eyebrow === 'string' ? generated.eyebrow : '',
    headline: typeof generated.headline === 'string' ? generated.headline : '',
    body: typeof generated.body === 'string' ? generated.body : '',
    primaryButtonLabel: typeof generated.primaryButtonLabel === 'string' ? generated.primaryButtonLabel : '',
    primaryButtonUrl:
      typeof generated.primaryButtonUrl === 'string' && generated.primaryButtonUrl.trim()
        ? generated.primaryButtonUrl
        : defaultPrimaryButtonUrl,
    secondaryButtonLabel: typeof generated.secondaryButtonLabel === 'string' ? generated.secondaryButtonLabel : '',
    secondaryButtonUrl: typeof generated.secondaryButtonUrl === 'string' ? generated.secondaryButtonUrl : '',
    footer:
      typeof generated.footer === 'string' && generated.footer.trim()
        ? generated.footer
        : 'You are receiving this email from DuckSAT.',
    model: config.deployment,
  }
}