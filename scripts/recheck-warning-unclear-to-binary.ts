import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { AzureOpenAI } from 'openai'
import { AZURE_OPENAI_CONFIG } from './lib/generation-config'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

type Verdict = 'pass' | 'warning' | 'fail'
type AnswerCheck = 'correct' | 'likely-incorrect' | 'unclear'

type ReviewLine = {
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
  ai: {
    id: string
    verdict: Verdict
    qualityScore: number
    answerCheck: AnswerCheck
    feedback: string
    issues: string[]
    recheck?: {
      previousVerdict: Verdict
      previousAnswerCheck: AnswerCheck
      previousQualityScore: number
      previousFeedback: string
      recheckedAt: string
    }
  }
}

type RecheckItemInput = {
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
  previousVerdict: Verdict
  previousAnswerCheck: AnswerCheck
  previousFeedback: string
}

type RecheckItemOutput = {
  id: string
  verdict: 'pass' | 'fail'
  answerCheck: AnswerCheck
  qualityScore: number
  feedback: string
  issues: string[]
}

type Summary = {
  runId: string
  deployment: string
  inputFile: string
  outputFile: string
  totalRows: number
  recheckedRows: number
  finalVerdicts: {
    pass: number
    fail: number
  }
  finalAnswerCheck: {
    correct: number
    likelyIncorrect: number
    unclear: number
  }
  activePassByCategory: Record<string, number>
  activeTotalsByCategory: Record<string, number>
  meetsTargets: {
    minimumTotalPass: number
    minimumPerCategoryPass: number
    totalActivePass: number
    categoriesBelowThreshold: Array<{ category: string; pass: number; required: number }>
    satisfied: boolean
  }
}

const OUTPUT_DIR = process.env.AI_RECHECK_OUTPUT_DIR || path.join('output', 'ai-reviews')
const RUN_ID = process.env.AI_RECHECK_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const RECHECK_BATCH_SIZE = Math.max(1, Number.parseInt(process.env.AI_RECHECK_BATCH_SIZE || '50', 10) || 50)
const REQUEST_TIMEOUT_MS = Math.max(30000, Number.parseInt(process.env.AI_RECHECK_TIMEOUT_MS || '180000', 10) || 180000)
const MAX_RETRIES = Math.max(0, Number.parseInt(process.env.AI_RECHECK_MAX_RETRIES || '3', 10) || 3)
const RETRY_DELAY_MS = Math.max(0, Number.parseInt(process.env.AI_RECHECK_RETRY_DELAY_MS || '3000', 10) || 3000)
const TARGET_TOTAL_PASS = Math.max(1, Number.parseInt(process.env.AI_TARGET_TOTAL_PASS || '700', 10) || 700)
const TARGET_PER_CATEGORY_PASS = Math.max(1, Number.parseInt(process.env.AI_TARGET_PER_CATEGORY_PASS || '150', 10) || 150)

const CANONICAL_CATEGORIES = [
  'reading-comprehension',
  'grammar',
  'vocabulary',
  'writing-language',
  'algebra',
  'advanced-math',
  'geometry',
  'problem-solving-data-analysis',
]

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

function toShort(text: string | null | undefined, maxLen: number): string {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) return normalized
  return `${normalized.slice(0, maxLen)}...`
}

function listJsonlFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return []
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith('.jsonl') && !name.includes('-binary-'))
    .map((name) => path.join(dirPath, name))
}

function pickLatestJsonlFile(): string {
  const configured = process.env.AI_RECHECK_INPUT_JSONL
  if (configured) return configured

  const candidates = listJsonlFiles(OUTPUT_DIR)
  if (candidates.length === 0) {
    throw new Error(`No input JSONL files found in ${OUTPUT_DIR}`)
  }

  const withStats = candidates
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  return withStats[0].filePath
}

function readJsonl(filePath: string): ReviewLine[] {
  const lines = fs
    .readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line) => JSON.parse(line) as ReviewLine)
}

function shouldRecheck(line: ReviewLine): boolean {
  return line.ai.verdict === 'warning' || line.ai.answerCheck === 'unclear'
}

function toRecheckInput(line: ReviewLine): RecheckItemInput {
  return {
    id: line.id,
    moduleType: line.moduleType,
    category: line.category,
    subtopic: line.subtopic,
    difficulty: line.difficulty,
    question: toShort(line.question, 850),
    passage: line.moduleType === 'reading-writing' ? toShort(line.passage, 900) : null,
    options: line.options,
    correctAnswerIndex: line.correctAnswerIndex,
    correctAnswerText: toShort(line.correctAnswerText, 220),
    explanation: toShort(line.explanation, 700),
    previousVerdict: line.ai.verdict,
    previousAnswerCheck: line.ai.answerCheck,
    previousFeedback: toShort(line.ai.feedback, 240),
  }
}

function buildPrompt(batch: RecheckItemInput[]): string {
  const payload = batch.map((item) => ({
    id: item.id,
    moduleType: item.moduleType,
    category: item.category,
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    question: item.question,
    passage: item.passage,
    options: item.options,
    correctAnswerIndex: item.correctAnswerIndex,
    correctAnswerText: item.correctAnswerText,
    explanation: item.explanation,
    previousVerdict: item.previousVerdict,
    previousAnswerCheck: item.previousAnswerCheck,
    previousFeedback: item.previousFeedback,
  }))

  return [
    'Recheck each SAT item and force binary verdict.',
    'Return ONLY valid JSON object with this shape:',
    '{',
    '  "items": [',
    '    {',
    '      "id": string,',
    '      "verdict": "pass" | "fail",',
    '      "answerCheck": "correct" | "likely-incorrect" | "unclear",',
    '      "qualityScore": number (0-100),',
    '      "feedback": short feedback (<= 45 words),',
    '      "issues": string[]',
    '    }',
    '  ]',
    '}',
    'Never output warning. If uncertain, choose fail.',
    'Input JSON:',
    JSON.stringify(payload),
  ].join('\n')
}

function parseRecheckResponse(content: string): RecheckItemOutput[] {
  let cleaned = content.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  const parsed = JSON.parse(cleaned) as { items?: unknown[] }
  if (!Array.isArray(parsed.items)) {
    throw new Error('Recheck response missing items array')
  }

  return parsed.items.map((row) => {
    const anyRow = row as Record<string, unknown>
    const verdictRaw = String(anyRow.verdict || '').toLowerCase()
    const answerRaw = String(anyRow.answerCheck || '').toLowerCase()
    const qualityRaw = Number(anyRow.qualityScore)

    return {
      id: String(anyRow.id || ''),
      verdict: verdictRaw === 'pass' ? 'pass' : 'fail',
      answerCheck:
        answerRaw === 'correct' || answerRaw === 'likely-incorrect' || answerRaw === 'unclear'
          ? answerRaw
          : 'unclear',
      qualityScore: Number.isFinite(qualityRaw) ? Math.max(0, Math.min(100, qualityRaw)) : 45,
      feedback: String(anyRow.feedback || '').trim(),
      issues: Array.isArray(anyRow.issues) ? anyRow.issues.map((x) => String(x)) : [],
    }
  })
}

async function recheckBatch(
  openai: AzureOpenAI,
  batch: RecheckItemInput[],
  attempt = 0
): Promise<RecheckItemOutput[]> {
  const prompt = buildPrompt(batch)

  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model: AZURE_OPENAI_CONFIG.deployment,
        messages: [
          {
            role: 'system',
            content: 'You are an SAT reviewer. Return compact strict JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
        max_completion_tokens: 4500,
      }),
      REQUEST_TIMEOUT_MS,
      `Recheck request timed out after ${REQUEST_TIMEOUT_MS}ms`
    )

    const content = response.choices?.[0]?.message?.content || ''
    if (!content.trim()) {
      throw new Error('Recheck response was empty')
    }

    const parsed = parseRecheckResponse(content)
    const byId = new Map(parsed.map((item) => [item.id, item]))

    return batch.map((item) =>
      byId.get(item.id) || {
        id: item.id,
        verdict: 'fail',
        answerCheck: 'unclear',
        qualityScore: 40,
        feedback: 'Missing item in AI recheck response. Defaulted to fail.',
        issues: ['missing-item-in-response'],
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (batch.length > 1 && /parse|JSON|empty|timeout|token|length/i.test(message)) {
      const mid = Math.floor(batch.length / 2)
      const [left, right] = await Promise.all([
        recheckBatch(openai, batch.slice(0, mid), attempt),
        recheckBatch(openai, batch.slice(mid), attempt),
      ])
      return [...left, ...right]
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS)
      return recheckBatch(openai, batch, attempt + 1)
    }

    return batch.map((item) => ({
      id: item.id,
      verdict: 'fail',
      answerCheck: 'unclear',
      qualityScore: 35,
      feedback: `Recheck failed after retries: ${message.slice(0, 200)}`,
      issues: ['recheck-failed'],
    }))
  }
}

function writeJsonl(filePath: string, rows: ReviewLine[]): void {
  const content = rows.map((row) => JSON.stringify(row)).join('\n') + '\n'
  fs.writeFileSync(filePath, content, 'utf-8')
}

function countActivePassByCategory(rows: ReviewLine[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows) {
    if (!row.isActive) continue
    if (!result[row.category]) result[row.category] = 0
    if (row.ai.verdict === 'pass') result[row.category] += 1
  }
  return result
}

function countActiveTotalsByCategory(rows: ReviewLine[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows) {
    if (!row.isActive) continue
    if (!result[row.category]) result[row.category] = 0
    result[row.category] += 1
  }
  return result
}

function buildSummary(
  runId: string,
  inputFile: string,
  outputFile: string,
  totalRows: number,
  recheckedRows: number,
  rows: ReviewLine[]
): Summary {
  let pass = 0
  let fail = 0
  let correct = 0
  let likelyIncorrect = 0
  let unclear = 0

  for (const row of rows) {
    if (row.ai.verdict === 'pass') pass += 1
    else fail += 1

    if (row.ai.answerCheck === 'correct') correct += 1
    if (row.ai.answerCheck === 'likely-incorrect') likelyIncorrect += 1
    if (row.ai.answerCheck === 'unclear') unclear += 1
  }

  const activePassByCategory = countActivePassByCategory(rows)
  const activeTotalsByCategory = countActiveTotalsByCategory(rows)
  const totalActivePass = rows.filter((row) => row.isActive && row.ai.verdict === 'pass').length

  const categoriesBelowThreshold = CANONICAL_CATEGORIES
    .map((category) => ({
      category,
      pass: activePassByCategory[category] || 0,
      required: TARGET_PER_CATEGORY_PASS,
    }))
    .filter((row) => row.pass < row.required)

  return {
    runId,
    deployment: AZURE_OPENAI_CONFIG.deployment,
    inputFile,
    outputFile,
    totalRows,
    recheckedRows,
    finalVerdicts: {
      pass,
      fail,
    },
    finalAnswerCheck: {
      correct,
      likelyIncorrect,
      unclear,
    },
    activePassByCategory,
    activeTotalsByCategory,
    meetsTargets: {
      minimumTotalPass: TARGET_TOTAL_PASS,
      minimumPerCategoryPass: TARGET_PER_CATEGORY_PASS,
      totalActivePass,
      categoriesBelowThreshold,
      satisfied: totalActivePass >= TARGET_TOTAL_PASS && categoriesBelowThreshold.length === 0,
    },
  }
}

async function main(): Promise<void> {
  ensureDir(OUTPUT_DIR)
  const inputFile = pickLatestJsonlFile()

  const inputBase = path.basename(inputFile, '.jsonl')
  const outputFile = path.join(OUTPUT_DIR, `${inputBase}-binary-${RUN_ID}.jsonl`)
  const summaryFile = path.join(OUTPUT_DIR, `${inputBase}-binary-${RUN_ID}-summary.json`)

  const rows = readJsonl(inputFile)
  const toRecheck = rows.filter(shouldRecheck)

  console.log('=== Recheck Warning/Unclear Started ===')
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Input file: ${inputFile}`)
  console.log(`Total rows: ${rows.length}`)
  console.log(`Rows to recheck: ${toRecheck.length}`)
  console.log(`Using deployment: ${AZURE_OPENAI_CONFIG.deployment}`)
  console.log(`Batch size: ${RECHECK_BATCH_SIZE}`)

  const openai = new AzureOpenAI({
    apiKey: AZURE_OPENAI_CONFIG.apiKey,
    endpoint: AZURE_OPENAI_CONFIG.endpoint,
    apiVersion: AZURE_OPENAI_CONFIG.apiVersion,
    deployment: AZURE_OPENAI_CONFIG.deployment,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  })

  const byId = new Map(rows.map((row) => [row.id, row]))

  for (let i = 0; i < toRecheck.length; i += RECHECK_BATCH_SIZE) {
    const chunk = toRecheck.slice(i, Math.min(i + RECHECK_BATCH_SIZE, toRecheck.length))
    const chunkInput = chunk.map(toRecheckInput)
    const rechecked = await recheckBatch(openai, chunkInput)

    for (const result of rechecked) {
      const original = byId.get(result.id)
      if (!original) continue

      original.ai = {
        ...original.ai,
        verdict: result.verdict,
        answerCheck: result.answerCheck,
        qualityScore: result.qualityScore,
        feedback: result.feedback || original.ai.feedback,
        issues: result.issues,
        recheck: {
          previousVerdict: original.ai.verdict,
          previousAnswerCheck: original.ai.answerCheck,
          previousQualityScore: original.ai.qualityScore,
          previousFeedback: original.ai.feedback,
          recheckedAt: new Date().toISOString(),
        },
      }
    }

    const done = Math.min(i + RECHECK_BATCH_SIZE, toRecheck.length)
    const pct = toRecheck.length === 0 ? 100 : ((done / toRecheck.length) * 100).toFixed(1)
    console.log(`Rechecked ${done}/${toRecheck.length} (${pct}%)`)
  }

  const updatedRows = Array.from(byId.values())
  writeJsonl(outputFile, updatedRows)

  const summary = buildSummary(RUN_ID, inputFile, outputFile, rows.length, toRecheck.length, updatedRows)
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8')

  console.log('\n=== Recheck Warning/Unclear Complete ===')
  console.log(`Output file: ${outputFile}`)
  console.log(`Summary file: ${summaryFile}`)
  console.log(`Final pass/fail: ${summary.finalVerdicts.pass}/${summary.finalVerdicts.fail}`)
  console.log(`Active total pass: ${summary.meetsTargets.totalActivePass}`)
  console.log(`Target satisfied: ${summary.meetsTargets.satisfied}`)

  if (!summary.meetsTargets.satisfied) {
    console.log('Categories below threshold:')
    console.table(summary.meetsTargets.categoriesBelowThreshold)
  }
}

main().catch((error) => {
  console.error('Recheck script failed:', error)
  process.exit(1)
})
