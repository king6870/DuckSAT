import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { UnifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

type ModuleType = 'math' | 'reading-writing'

type CandidateResult = {
  name: string
  requested: number
  generated: number
  structuralValid: number
  readingPassageValid: number
  avgQuality: number | null
  durationMs: number
  score: number
  details: string[]
  samples: Array<{
    moduleType: ModuleType
    question: string
    subtopic: string
    qualityScore?: number
  }>
}

type BatchQuestion = {
  question?: string
  options?: string[]
  correctAnswer?: number
  explanation?: string
  moduleType?: ModuleType
  passage?: string | null
  subtopic?: string
  qualityScore?: number
}

type BenchmarkReport = {
  timestamp: string
  modelHint: string
  candidates: CandidateResult[]
  winner: string
  tieBreakRule: string
}

const ROOT = process.cwd()
const BATCH_DIR = path.join(ROOT, 'generated-batches')
const ENV_FILE = fs.existsSync(path.join(ROOT, '.env')) ? '.env' : '.env.local'

// Some environments store a full chat-completions URL in AZURE_OPENAI_ENDPOINT.
// UnifiedQuestionGenerator prefers ENDPOINT_URL for full URLs, while QG800 can
// extract the base endpoint from ENDPOINT_URL automatically.
if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT?.includes('/openai/deployments/')) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validateQuestion(question: BatchQuestion): {
  structuralOk: boolean
  passageOk: boolean
  issues: string[]
} {
  const issues: string[] = []

  const text = safeText(question.question)
  if (!text) issues.push('missing question text')

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    issues.push('options must contain exactly 4 entries')
  }

  if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer > 3) {
    issues.push('correctAnswer must be index 0-3')
  }

  const explanation = safeText(question.explanation)
  if (!explanation) issues.push('missing explanation')

  if (question.moduleType !== 'math' && question.moduleType !== 'reading-writing') {
    issues.push('invalid moduleType')
  }

  const passage = safeText(question.passage)
  const passageOk = question.moduleType !== 'reading-writing' || passage.length > 0
  if (!passageOk && question.moduleType === 'reading-writing') {
    issues.push('reading question missing passage')
  }

  return {
    structuralOk: issues.length === 0,
    passageOk,
    issues,
  }
}

function calculateScore(input: {
  requested: number
  generated: number
  structuralValid: number
  readingPassageValid: number
  avgQuality: number | null
  durationMs: number
}): number {
  const reliability = input.requested > 0 ? Math.min(1, input.generated / input.requested) : 0
  const validity = input.generated > 0 ? input.structuralValid / input.generated : 0
  const passage = input.generated > 0 ? input.readingPassageValid / input.generated : 0

  // If generator does not provide quality score, use conservative proxy.
  const quality = input.avgQuality ?? Math.min(1, 0.75 * validity + 0.25 * passage)

  // 180 seconds maps to speed score 0.0, faster runs score higher.
  const speed = Math.max(0, Math.min(1, 1 - input.durationMs / 180000))

  const weighted =
    0.40 * reliability +
    0.25 * validity +
    0.15 * passage +
    0.15 * quality +
    0.05 * speed

  return Number(weighted.toFixed(4))
}

function runCommand(args: string[]): { ok: boolean; output: string; durationMs: number } {
  const start = Date.now()
  const result = spawnSync('npx', args, {
    cwd: ROOT,
    encoding: 'utf-8',
    shell: true,
  })

  const durationMs = Date.now() - start
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim()
  const ok = result.status === 0

  return { ok, output, durationMs }
}

function getBatchJsonSet(): Set<string> {
  ensureDir(BATCH_DIR)
  const files = fs
    .readdirSync(BATCH_DIR)
    .filter((file) => file.startsWith('batch-') && file.endsWith('.json'))
  return new Set(files)
}

function runQG800Topic(topic: string, count: number): { filePath: string; durationMs: number } {
  const before = getBatchJsonSet()
  const command = ['dotenv', '-e', ENV_FILE, '--', 'tsx', 'scripts/generate-sat-questions.ts', 'generate', '--topic', topic, '--count', String(count)]
  const result = runCommand(command)

  if (!result.ok) {
    throw new Error(`QG800 command failed for topic=${topic}\n${result.output}`)
  }

  const after = getBatchJsonSet()
  const newFiles = [...after].filter((file) => !before.has(file))
  const topicFile = newFiles.find((file) => file.includes(`-${topic}.json`))

  if (!topicFile) {
    throw new Error(`Could not locate generated batch JSON for topic=${topic}`)
  }

  return {
    filePath: path.join(BATCH_DIR, topicFile),
    durationMs: result.durationMs,
  }
}

function parseQG800Batch(filePath: string): BatchQuestion[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { questions?: BatchQuestion[] }
  return Array.isArray(raw.questions) ? raw.questions : []
}

async function benchmarkUnified(): Promise<CandidateResult> {
  const requested = 4
  const generator = new UnifiedQuestionGenerator()

  const start = Date.now()
  const result = await generator.generateQuestions({
    mathCount: 2,
    readingCount: 2,
    moduleType: 'both',
    includeImages: false,
    includePassages: true,
    storeInDatabase: false,
    enableRetry: true,
    enableValidation: true,
    maxTokens: 8000,
    difficulty: 'mixed',
  })
  const durationMs = Date.now() - start

  const evaluated = result.questions.map((q) => ({
    moduleType: q.moduleType,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    passage: q.passage,
    subtopic: q.subtopic,
    qualityScore: q.qualityScore,
  }))

  let structuralValid = 0
  let readingPassageValid = 0
  const details: string[] = []

  for (const [index, q] of evaluated.entries()) {
    const validation = validateQuestion(q)
    if (validation.structuralOk) {
      structuralValid += 1
    } else {
      details.push(`Q${index + 1} invalid: ${validation.issues.join('; ')}`)
    }

    if (validation.passageOk) {
      readingPassageValid += 1
    }
  }

  const score = calculateScore({
    requested,
    generated: evaluated.length,
    structuralValid,
    readingPassageValid,
    avgQuality: result.summary.avgQuality,
    durationMs,
  })

  return {
    name: 'UnifiedQuestionGenerator',
    requested,
    generated: evaluated.length,
    structuralValid,
    readingPassageValid,
    avgQuality: result.summary.avgQuality,
    durationMs,
    score,
    details,
    samples: evaluated.slice(0, 4).map((q) => ({
      moduleType: q.moduleType,
      question: safeText(q.question).slice(0, 140),
      subtopic: safeText(q.subtopic),
      qualityScore: q.qualityScore,
    })),
  }
}

async function benchmarkQG800(): Promise<CandidateResult> {
  const requested = 4

  const math = runQG800Topic('algebra', 2)
  const reading = runQG800Topic('reading-comp', 2)

  const mathQuestions = parseQG800Batch(math.filePath)
  const readingQuestions = parseQG800Batch(reading.filePath)
  const combined = [...mathQuestions, ...readingQuestions]

  let structuralValid = 0
  let readingPassageValid = 0
  const details: string[] = []

  for (const [index, q] of combined.entries()) {
    const validation = validateQuestion(q)
    if (validation.structuralOk) {
      structuralValid += 1
    } else {
      details.push(`Q${index + 1} invalid: ${validation.issues.join('; ')}`)
    }

    if (validation.passageOk) {
      readingPassageValid += 1
    }
  }

  const durationMs = math.durationMs + reading.durationMs

  const score = calculateScore({
    requested,
    generated: combined.length,
    structuralValid,
    readingPassageValid,
    avgQuality: null,
    durationMs,
  })

  return {
    name: 'QG800BatchGenerator',
    requested,
    generated: combined.length,
    structuralValid,
    readingPassageValid,
    avgQuality: null,
    durationMs,
    score,
    details,
    samples: combined.slice(0, 4).map((q) => ({
      moduleType: (q.moduleType === 'math' ? 'math' : 'reading-writing') as ModuleType,
      question: safeText(q.question).slice(0, 140),
      subtopic: safeText(q.subtopic),
    })),
  }
}

async function main(): Promise<void> {
  ensureDir(path.join(ROOT, 'output'))

  const modelHint =
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    process.env.DEPLOYMENT_NAME ||
    'gpt-5-nano'

  console.log('Starting generator benchmark...')
  console.log(`Model hint: ${modelHint}`)
  console.log(`Env file: ${ENV_FILE}`)

  const unified = await benchmarkUnified()
  const qg800 = await benchmarkQG800()

  const candidates = [unified, qg800]
  const sorted = [...candidates].sort((a, b) => b.score - a.score)

  const top = sorted[0]
  const second = sorted[1]
  const tie = Math.abs(top.score - second.score) < 0.0001

  const winner = tie ? 'UnifiedQuestionGenerator' : top.name

  const report: BenchmarkReport = {
    timestamp: new Date().toISOString(),
    modelHint,
    candidates,
    winner,
    tieBreakRule: 'If scores tie, choose UnifiedQuestionGenerator because it is the active production pipeline.',
  }

  const outPath = path.join(ROOT, 'output', 'generator-benchmark-2026-04-26.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')

  console.log('\nBenchmark complete.')
  console.log(`Winner: ${winner}`)
  console.log(`Report: ${outPath}`)

  for (const candidate of candidates) {
    console.log(`\n${candidate.name}`)
    console.log(`  requested: ${candidate.requested}`)
    console.log(`  generated: ${candidate.generated}`)
    console.log(`  structuralValid: ${candidate.structuralValid}`)
    console.log(`  readingPassageValid: ${candidate.readingPassageValid}`)
    console.log(`  avgQuality: ${candidate.avgQuality ?? 'n/a'}`)
    console.log(`  durationMs: ${candidate.durationMs}`)
    console.log(`  score: ${candidate.score}`)
  }
}

main().catch((error) => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})
