import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { AzureOpenAI } from 'openai'
import { AZURE_OPENAI_CONFIG } from './lib/generation-config'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

type QuestionRow = {
  id: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  moduleType: string
  category: string
  subtopic: string | null
  difficulty: string
  question: string
  passage: string | null
  options: string
  correctAnswer: number
  explanation: string
  source: string | null
  visualType: string | null
  imageUrl: string | null
  chartData: string | null
}

type InputQuestion = {
  id: string
  moduleType: string
  category: string
  subtopic: string | null
  difficulty: string
  question: string
  passage: string | null
  options: string[]
  correctAnswerIndex: number
  correctAnswerText: string
  explanation: string
}

type AiFeedbackItem = {
  id: string
  verdict: 'pass' | 'warning' | 'fail'
  qualityScore: number
  answerCheck: 'correct' | 'likely-incorrect' | 'unclear'
  feedback: string
  issues: string[]
}

type ReviewOutputLine = {
  id: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  moduleType: string
  category: string
  subtopic: string | null
  difficulty: string
  question: string
  passage: string | null
  options: string[]
  correctAnswerIndex: number
  correctAnswerText: string
  explanation: string
  source: string | null
  hasDiagramSignals: boolean
  ai: AiFeedbackItem
}

type Checkpoint = {
  runId: string
  outputJsonlPath: string
  processed: number
  total: number
  startedAt: string
  updatedAt: string
}

const ONLY_ACTIVE = String(process.env.AI_REVIEW_ONLY_ACTIVE || 'false').toLowerCase() === 'true'
const AI_BATCH_SIZE = Math.max(1, Number.parseInt(process.env.AI_REVIEW_BATCH_SIZE || '50', 10) || 50)
const REQUEST_TIMEOUT_MS = Math.max(30000, Number.parseInt(process.env.AI_REVIEW_TIMEOUT_MS || '180000', 10) || 180000)
const MAX_RETRIES = Math.max(0, Number.parseInt(process.env.AI_REVIEW_MAX_RETRIES || '3', 10) || 3)
const RETRY_DELAY_MS = Math.max(0, Number.parseInt(process.env.AI_REVIEW_RETRY_DELAY_MS || '4000', 10) || 4000)
const OUTPUT_DIR = process.env.AI_REVIEW_OUTPUT_DIR || path.join('output', 'ai-reviews')
const RUN_ID = process.env.AI_REVIEW_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : []
  } catch {
    return []
  }
}

function normalizeForPrompt(text: string | null | undefined, maxLen: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen)}...`
}

function toInputQuestion(row: QuestionRow): InputQuestion {
  const options = parseOptions(row.options)
  const index = Number.isInteger(row.correctAnswer) ? row.correctAnswer : -1
  const answerText = index >= 0 && index < options.length ? options[index] : ''

  return {
    id: row.id,
    moduleType: row.moduleType,
    category: row.category,
    subtopic: row.subtopic,
    difficulty: row.difficulty,
    question: normalizeForPrompt(row.question, 900),
    passage: row.moduleType === 'reading-writing' ? normalizeForPrompt(row.passage, 900) : null,
    options,
    correctAnswerIndex: row.correctAnswer,
    correctAnswerText: normalizeForPrompt(answerText, 260),
    explanation: normalizeForPrompt(row.explanation, 700),
  }
}

function parseJsonResponse(content: string): AiFeedbackItem[] {
  let cleaned = content.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  const parsed = JSON.parse(cleaned)
  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { items?: unknown[] }).items)
      ? (parsed as { items: unknown[] }).items
      : null

  if (!items) {
    throw new Error('AI review response does not contain an items array')
  }

  return items.map((item) => {
    const verdict = String(item?.verdict || 'warning').toLowerCase()
    const answerCheck = String(item?.answerCheck || 'unclear').toLowerCase()
    const qualityRaw = Number(item?.qualityScore)
    const qualityScore = Number.isFinite(qualityRaw) ? Math.max(0, Math.min(100, qualityRaw)) : 50

    return {
      id: String(item?.id || ''),
      verdict: verdict === 'pass' || verdict === 'warning' || verdict === 'fail' ? verdict : 'warning',
      qualityScore,
      answerCheck:
        answerCheck === 'correct' || answerCheck === 'likely-incorrect' || answerCheck === 'unclear'
          ? answerCheck
          : 'unclear',
      feedback: String(item?.feedback || '').trim(),
      issues: Array.isArray(item?.issues) ? item.issues.map((x: unknown) => String(x)) : [],
    }
  })
}

function buildPrompt(batch: InputQuestion[]): string {
  const payload = batch.map((q) => ({
    id: q.id,
    moduleType: q.moduleType,
    category: q.category,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    question: q.question,
    passage: q.passage,
    options: q.options,
    correctAnswerIndex: q.correctAnswerIndex,
    correctAnswerText: q.correctAnswerText,
    explanation: q.explanation,
  }))

  return [
    'Review each SAT question and return ONLY valid JSON object.',
    'Return exactly this shape:',
    '{',
    '  "items": [',
    '    {',
    '      "id": string,',
    '      "verdict": "pass" | "warning" | "fail",',
    '      "qualityScore": number (0-100),',
    '      "answerCheck": "correct" | "likely-incorrect" | "unclear",',
    '      "feedback": short feedback (max 40 words),',
    '      "issues": string[]',
    '    }',
    '  ]',
    '}',
    'No markdown, no prose before/after JSON.',
    'Prioritize answer correctness and explanation quality.',
    'Input JSON:',
    JSON.stringify(payload),
  ].join('\n')
}

function toHasDiagramSignals(row: QuestionRow): boolean {
  return Boolean(
    row.imageUrl ||
      row.chartData ||
      (row.visualType && row.visualType !== 'none')
  )
}

function buildLine(row: QuestionRow, ai: AiFeedbackItem): ReviewOutputLine {
  const input = toInputQuestion(row)

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isActive: row.isActive,
    moduleType: row.moduleType,
    category: row.category,
    subtopic: row.subtopic,
    difficulty: row.difficulty,
    question: row.question,
    passage: row.passage,
    options: input.options,
    correctAnswerIndex: row.correctAnswer,
    correctAnswerText: input.correctAnswerText,
    explanation: row.explanation,
    source: row.source,
    hasDiagramSignals: toHasDiagramSignals(row),
    ai,
  }
}

async function reviewBatchWithRetry(
  openai: AzureOpenAI,
  deployment: string,
  batch: InputQuestion[],
  attempt = 0
): Promise<AiFeedbackItem[]> {
  const prompt = buildPrompt(batch)

  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: deployment,
        messages: [
          {
            role: 'system',
            content: 'You are an SAT quality reviewer. Return compact valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
        max_completion_tokens: 5000,
      }),
      REQUEST_TIMEOUT_MS,
      `AI review request timed out after ${REQUEST_TIMEOUT_MS}ms`
    )

    const content = response.choices?.[0]?.message?.content || ''
    if (!content.trim()) {
      throw new Error('AI review returned empty content')
    }

    const parsed = parseJsonResponse(content)

    const parsedById = new Map(parsed.map((item) => [item.id, item]))
    return batch.map((q) => parsedById.get(q.id) || {
      id: q.id,
      verdict: 'warning',
      qualityScore: 50,
      answerCheck: 'unclear',
      feedback: 'Missing feedback item in AI response.',
      issues: ['missing-feedback-item'],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (batch.length > 1 && /parse|JSON|empty content|timed out|length|token/i.test(message)) {
      const middle = Math.floor(batch.length / 2)
      const left = batch.slice(0, middle)
      const right = batch.slice(middle)
      const [leftResult, rightResult] = await Promise.all([
        reviewBatchWithRetry(openai, deployment, left, attempt),
        reviewBatchWithRetry(openai, deployment, right, attempt),
      ])
      return [...leftResult, ...rightResult]
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS)
      return reviewBatchWithRetry(openai, deployment, batch, attempt + 1)
    }

    return batch.map((q) => ({
      id: q.id,
      verdict: 'warning',
      qualityScore: 45,
      answerCheck: 'unclear',
      feedback: `AI review failed after retries: ${message.slice(0, 220)}`,
      issues: ['ai-review-failed'],
    }))
  }
}

function writeCheckpoint(filePath: string, checkpoint: Checkpoint): void {
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8')
}

function readCheckpoint(filePath: string): Checkpoint | null {
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as Checkpoint
  } catch {
    return null
  }
}

async function run(): Promise<void> {
  ensureDir(OUTPUT_DIR)

  const outputJsonlPath = path.join(OUTPUT_DIR, `all-questions-ai-review-${RUN_ID}.jsonl`)
  const summaryPath = path.join(OUTPUT_DIR, `all-questions-ai-review-${RUN_ID}-summary.json`)
  const checkpointPath = path.join(OUTPUT_DIR, `all-questions-ai-review-${RUN_ID}.checkpoint.json`)

  const openai = new AzureOpenAI({
    apiKey: AZURE_OPENAI_CONFIG.apiKey,
    endpoint: AZURE_OPENAI_CONFIG.endpoint,
    apiVersion: AZURE_OPENAI_CONFIG.apiVersion,
    deployment: AZURE_OPENAI_CONFIG.deployment,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  })

  const whereClause = ONLY_ACTIVE ? { isActive: true } : undefined

  const total = await prisma.question.count({ where: whereClause })
  if (total === 0) {
    console.log('No questions found to review.')
    return
  }

  let processed = 0
  let passCount = 0
  let warningCount = 0
  let failCount = 0
  let correctCount = 0
  let likelyIncorrectCount = 0
  let unclearCount = 0

  const existing = readCheckpoint(checkpointPath)
  if (existing && existing.outputJsonlPath === outputJsonlPath) {
    processed = existing.processed
  }

  if (processed === 0 && fs.existsSync(outputJsonlPath)) {
    fs.unlinkSync(outputJsonlPath)
  }

  const rows = await prisma.question.findMany({
    where: whereClause,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
      moduleType: true,
      category: true,
      subtopic: true,
      difficulty: true,
      question: true,
      passage: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      source: true,
      visualType: true,
      imageUrl: true,
      chartData: true,
    },
  }) as QuestionRow[]

  const effectiveTotal = rows.length
  if (processed > effectiveTotal) {
    processed = 0
    if (fs.existsSync(outputJsonlPath)) {
      fs.unlinkSync(outputJsonlPath)
    }
  }

  console.log('=== Full Question AI Review Started ===')
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Using deployment: ${AZURE_OPENAI_CONFIG.deployment}`)
  console.log(`Questions to review: ${effectiveTotal}`)
  console.log(`AI batch size: ${AI_BATCH_SIZE}`)
  console.log(`Only active: ${ONLY_ACTIVE}`)
  console.log(`Output JSONL: ${outputJsonlPath}`)

  const startedAt = new Date().toISOString()
  writeCheckpoint(checkpointPath, {
    runId: RUN_ID,
    outputJsonlPath,
    processed,
    total: effectiveTotal,
    startedAt,
    updatedAt: new Date().toISOString(),
  })

  for (let index = processed; index < effectiveTotal; index += AI_BATCH_SIZE) {
    const chunk = rows.slice(index, Math.min(index + AI_BATCH_SIZE, effectiveTotal))
    const input = chunk.map(toInputQuestion)
    const aiFeedback = await reviewBatchWithRetry(openai, AZURE_OPENAI_CONFIG.deployment, input)

    const lines: string[] = []
    for (let i = 0; i < chunk.length; i += 1) {
      const line = buildLine(chunk[i], aiFeedback[i])
      lines.push(JSON.stringify(line))

      if (line.ai.verdict === 'pass') passCount += 1
      if (line.ai.verdict === 'warning') warningCount += 1
      if (line.ai.verdict === 'fail') failCount += 1

      if (line.ai.answerCheck === 'correct') correctCount += 1
      if (line.ai.answerCheck === 'likely-incorrect') likelyIncorrectCount += 1
      if (line.ai.answerCheck === 'unclear') unclearCount += 1
    }

    fs.appendFileSync(outputJsonlPath, `${lines.join('\n')}\n`, 'utf-8')
    processed += chunk.length

    writeCheckpoint(checkpointPath, {
      runId: RUN_ID,
      outputJsonlPath,
      processed,
      total: effectiveTotal,
      startedAt,
      updatedAt: new Date().toISOString(),
    })

    const pct = ((processed / effectiveTotal) * 100).toFixed(1)
    console.log(`Reviewed ${processed}/${effectiveTotal} (${pct}%)`)
  }

  const summary = {
    runId: RUN_ID,
    deployment: AZURE_OPENAI_CONFIG.deployment,
    onlyActive: ONLY_ACTIVE,
    totalReviewed: effectiveTotal,
    verdicts: {
      pass: passCount,
      warning: warningCount,
      fail: failCount,
    },
    answerCheck: {
      correct: correctCount,
      likelyIncorrect: likelyIncorrectCount,
      unclear: unclearCount,
    },
    outputJsonlPath,
    checkpointPath,
    completedAt: new Date().toISOString(),
  }

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')

  console.log('\n=== Full Question AI Review Complete ===')
  console.log(`Summary: ${summaryPath}`)
  console.log(`Detailed results: ${outputJsonlPath}`)
  console.log(`Pass/Warning/Fail: ${passCount}/${warningCount}/${failCount}`)
  console.log(`Answer check (correct/likely-incorrect/unclear): ${correctCount}/${likelyIncorrectCount}/${unclearCount}`)
}

run()
  .catch((error) => {
    console.error('AI review run failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
