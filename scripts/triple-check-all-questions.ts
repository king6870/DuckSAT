import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

const BATCH_SIZE = Math.max(1, Number.parseInt(process.env.TRIPLE_CHECK_BATCH_SIZE || '10', 10) || 10)
const ONLY_ACTIVE = String(process.env.TRIPLE_CHECK_ONLY_ACTIVE || 'true').toLowerCase() !== 'false'
const LIMIT = Math.max(0, Number.parseInt(process.env.TRIPLE_CHECK_LIMIT || '0', 10) || 0)
const OUTPUT_DIR = process.env.TRIPLE_CHECK_OUTPUT_DIR || path.join('output', 'question-review')
const RUN_ID = process.env.TRIPLE_CHECK_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')

const OMISSION_MARKER = /\.\.\.|…|\[omitted\]|\(omitted\)|\[excerpt\]|abridged|truncated/i
const PLACEHOLDER_MARKER = /lorem ipsum|placeholder|dummy question|question text here|reading passage text|option 1|option 2|detailed explanation/i

const FULL_PASSAGE_CATEGORIES = new Set(['reading comprehension', 'vocabulary'])
const FULL_PASSAGE_SUBTOPICS = new Set([
  'reading comprehension',
  'main ideas and central claims',
  'supporting details and evidence',
  'inferences and implications',
  'vocabulary in context',
  'text structure and organization',
  'author s purpose and point of view',
  'authors purpose and point of view',
  'comparing texts and viewpoints',
])

type QuestionRow = {
  id: string
  createdAt: Date
  updatedAt: Date
  moduleType: string
  category: string
  subtopic: string | null
  difficulty: string
  question: string
  passage: string | null
  options: string
  correctAnswer: number
  explanation: string | null
  source: string | null
  visualType: string | null
  imageUrl: string | null
  imageData: Buffer | null
  imageMimeType: string | null
  chartData: string | null
  isActive: boolean
}

type IssueSeverity = 'warning' | 'fail'
type Verdict = 'pass' | 'warning' | 'fail'

type ReviewIssue = {
  severity: IssueSeverity
  code: string
  message: string
}

type PassResult = {
  passName: 'structure' | 'content' | 'media'
  verdict: Verdict
  issues: ReviewIssue[]
}

type ReviewLine = {
  id: string
  batchNumber: number
  batchIndex: number
  moduleType: string
  category: string
  subtopic: string | null
  difficulty: string
  createdAt: string
  updatedAt: string
  hasPassage: boolean
  hasDiagramSignal: boolean
  hasStoredDiagramAsset: boolean
  optionCount: number
  correctAnswerIndex: number
  overallVerdict: Verdict
  issueCount: number
  questionWordCount: number
  passageWordCount: number
  explanationWordCount: number
  duplicateQuestionCount: number
  duplicateDiagramCount: number
  passes: PassResult[]
}

type BatchSummary = {
  batchNumber: number
  startIndex: number
  endIndex: number
  size: number
  pass: number
  warning: number
  fail: number
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function normalizeKey(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeTextFingerprint(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(value: string | null | undefined): number {
  return (value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function hasStoredDiagramAsset(row: QuestionRow): boolean {
  return Boolean(row.imageData || row.imageUrl || row.chartData)
}

function hasDiagramSignal(row: QuestionRow): boolean {
  return hasStoredDiagramAsset(row) || Boolean(row.visualType && row.visualType !== 'none')
}

function requiresFullPassage(row: QuestionRow): boolean {
  return FULL_PASSAGE_CATEGORIES.has(normalizeKey(row.category))
    || FULL_PASSAGE_SUBTOPICS.has(normalizeKey(row.subtopic))
}

function diagramHash(row: QuestionRow): string | null {
  if (row.imageData) {
    return row.imageData.slice(0, 100).toString('hex')
  }

  if (row.imageUrl) {
    return `url:${row.imageUrl}`
  }

  if (row.chartData) {
    return `chart:${row.chartData}`
  }

  return null
}

function toVerdict(issues: ReviewIssue[]): Verdict {
  if (issues.some((issue) => issue.severity === 'fail')) {
    return 'fail'
  }

  if (issues.length > 0) {
    return 'warning'
  }

  return 'pass'
}

function worstVerdict(verdicts: Verdict[]): Verdict {
  if (verdicts.includes('fail')) return 'fail'
  if (verdicts.includes('warning')) return 'warning'
  return 'pass'
}

function buildStructurePass(row: QuestionRow, options: string[]): PassResult {
  const issues: ReviewIssue[] = []

  if (!row.question || row.question.trim().length < 20) {
    issues.push({ severity: 'fail', code: 'question-too-short', message: 'Question text is missing or too short.' })
  }

  if (options.length !== 4) {
    issues.push({ severity: 'fail', code: 'invalid-option-count', message: `Expected 4 answer choices, found ${options.length}.` })
  }

  if (!Number.isInteger(row.correctAnswer) || row.correctAnswer < 0 || row.correctAnswer >= options.length) {
    issues.push({ severity: 'fail', code: 'invalid-correct-answer', message: 'Correct answer index is outside the available options.' })
  }

  if (!row.explanation || row.explanation.trim().length < 20) {
    issues.push({ severity: 'fail', code: 'missing-explanation', message: 'Explanation is missing or too short.' })
  }

  if (requiresFullPassage(row) && !(row.passage || '').trim()) {
    issues.push({ severity: 'fail', code: 'missing-required-passage', message: 'A full reading passage is required for this question type but is missing.' })
  }

  return {
    passName: 'structure',
    verdict: toVerdict(issues),
    issues,
  }
}

function buildContentPass(row: QuestionRow, options: string[], duplicateQuestionCount: number): PassResult {
  const issues: ReviewIssue[] = []
  const answerText = options[row.correctAnswer] || ''
  const explanation = row.explanation || ''
  const passage = row.passage || ''
  const uniqueOptions = new Set(options.map((option) => normalizeTextFingerprint(option))).size

  if (PLACEHOLDER_MARKER.test(`${row.question} ${passage} ${explanation}`)) {
    issues.push({ severity: 'fail', code: 'placeholder-content', message: 'Question contains placeholder or dummy text.' })
  }

  if (uniqueOptions !== options.length) {
    issues.push({ severity: 'warning', code: 'duplicate-options', message: 'Two or more answer choices are duplicates after normalization.' })
  }

  if (!answerText.trim()) {
    issues.push({ severity: 'fail', code: 'empty-answer-text', message: 'Correct answer points to an empty option.' })
  }

  if (explanation.trim().length < 40) {
    issues.push({ severity: 'warning', code: 'short-explanation', message: 'Explanation is unusually short.' })
  }

  if (requiresFullPassage(row)) {
    const passageWords = countWords(passage)

    if (OMISSION_MARKER.test(passage)) {
      issues.push({ severity: 'fail', code: 'abbreviated-passage', message: 'Passage contains omission markers such as ellipses.' })
    }

    if (passageWords > 0 && passageWords < 150) {
      issues.push({ severity: 'fail', code: 'short-full-passage', message: `Full reading passage is too short (${passageWords} words).` })
    }
  }

  if (duplicateQuestionCount > 1) {
    issues.push({ severity: 'warning', code: 'duplicate-question-text', message: `Question text appears ${duplicateQuestionCount} times in the active pool.` })
  }

  return {
    passName: 'content',
    verdict: toVerdict(issues),
    issues,
  }
}

function buildMediaPass(row: QuestionRow, duplicateDiagramCount: number): PassResult {
  const issues: ReviewIssue[] = []
  const hasSignal = hasDiagramSignal(row)
  const hasAsset = hasStoredDiagramAsset(row)

  if (hasSignal && !hasAsset) {
    issues.push({ severity: 'warning', code: 'diagram-signal-without-asset', message: 'Question is marked as visual but no stored diagram/chart asset exists.' })
  }

  if (duplicateDiagramCount > 1) {
    issues.push({ severity: 'warning', code: 'duplicate-diagram-asset', message: `Diagram/chart asset fingerprint appears ${duplicateDiagramCount} times.` })
  }

  if (row.chartData) {
    try {
      JSON.parse(row.chartData)
    } catch {
      issues.push({ severity: 'fail', code: 'invalid-chart-data-json', message: 'chartData is present but is not valid JSON.' })
    }
  }

  return {
    passName: 'media',
    verdict: toVerdict(issues),
    issues,
  }
}

async function run(): Promise<void> {
  ensureDir(OUTPUT_DIR)

  const whereClause = ONLY_ACTIVE ? { isActive: true } : undefined
  const jsonlPath = path.join(OUTPUT_DIR, `triple-check-${RUN_ID}.jsonl`)
  const summaryPath = path.join(OUTPUT_DIR, `triple-check-${RUN_ID}-summary.json`)

  const rows = await prisma.question.findMany({
    where: whereClause,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
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
      imageData: true,
      imageMimeType: true,
      chartData: true,
      isActive: true,
    },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  }) as QuestionRow[]

  if (rows.length === 0) {
    console.log('No questions found to review.')
    return
  }

  const questionFingerprintCounts = new Map<string, number>()
  const diagramFingerprintCounts = new Map<string, number>()

  for (const row of rows) {
    const questionFingerprint = normalizeTextFingerprint(row.question)
    questionFingerprintCounts.set(questionFingerprint, (questionFingerprintCounts.get(questionFingerprint) || 0) + 1)

    const fingerprint = diagramHash(row)
    if (fingerprint) {
      diagramFingerprintCounts.set(fingerprint, (diagramFingerprintCounts.get(fingerprint) || 0) + 1)
    }
  }

  const totalBatches = Math.ceil(rows.length / BATCH_SIZE)
  const batchSummaries: BatchSummary[] = []
  const overallCounts: Record<Verdict, number> = { pass: 0, warning: 0, fail: 0 }

  if (fs.existsSync(jsonlPath)) {
    fs.unlinkSync(jsonlPath)
  }

  console.log('=== Triple Check Review Started ===')
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Questions: ${rows.length}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Total batches: ${totalBatches}`)
  console.log(`Output JSONL: ${jsonlPath}`)

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE)
    const batchNumber = Math.floor(start / BATCH_SIZE) + 1
    const lines: string[] = []
    const batchCounts: Record<Verdict, number> = { pass: 0, warning: 0, fail: 0 }

    for (let index = 0; index < batch.length; index += 1) {
      const row = batch[index]
      const options = parseOptions(row.options)
      const questionFingerprint = normalizeTextFingerprint(row.question)
      const rowDiagramHash = diagramHash(row)

      const passes: PassResult[] = [
        buildStructurePass(row, options),
        buildContentPass(row, options, questionFingerprintCounts.get(questionFingerprint) || 1),
        buildMediaPass(row, rowDiagramHash ? (diagramFingerprintCounts.get(rowDiagramHash) || 1) : 0),
      ]

      const overallVerdict = worstVerdict(passes.map((pass) => pass.verdict))
      const issueCount = passes.reduce((sum, pass) => sum + pass.issues.length, 0)

      batchCounts[overallVerdict] += 1
      overallCounts[overallVerdict] += 1

      const line: ReviewLine = {
        id: row.id,
        batchNumber,
        batchIndex: start + index + 1,
        moduleType: row.moduleType,
        category: row.category,
        subtopic: row.subtopic,
        difficulty: row.difficulty,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        hasPassage: Boolean((row.passage || '').trim()),
        hasDiagramSignal: hasDiagramSignal(row),
        hasStoredDiagramAsset: hasStoredDiagramAsset(row),
        optionCount: options.length,
        correctAnswerIndex: row.correctAnswer,
        overallVerdict,
        issueCount,
        questionWordCount: countWords(row.question),
        passageWordCount: countWords(row.passage),
        explanationWordCount: countWords(row.explanation),
        duplicateQuestionCount: questionFingerprintCounts.get(questionFingerprint) || 1,
        duplicateDiagramCount: rowDiagramHash ? (diagramFingerprintCounts.get(rowDiagramHash) || 1) : 0,
        passes,
      }

      lines.push(JSON.stringify(line))
    }

    fs.appendFileSync(jsonlPath, `${lines.join('\n')}\n`, 'utf-8')

    batchSummaries.push({
      batchNumber,
      startIndex: start + 1,
      endIndex: start + batch.length,
      size: batch.length,
      pass: batchCounts.pass,
      warning: batchCounts.warning,
      fail: batchCounts.fail,
    })

    console.log(`Batch ${String(batchNumber).padStart(4, '0')}/${String(totalBatches).padStart(4, '0')} reviewed: pass=${batchCounts.pass} warning=${batchCounts.warning} fail=${batchCounts.fail}`)
  }

  const summary = {
    runId: RUN_ID,
    reviewedAt: new Date().toISOString(),
    onlyActive: ONLY_ACTIVE,
    totalQuestions: rows.length,
    batchSize: BATCH_SIZE,
    totalBatches,
    verdicts: overallCounts,
    outputJsonlPath: jsonlPath,
    batches: batchSummaries,
  }

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')

  console.log('\n=== Triple Check Review Complete ===')
  console.log(`Summary: ${summaryPath}`)
  console.log(`Detailed results: ${jsonlPath}`)
  console.log(`Pass/Warning/Fail: ${overallCounts.pass}/${overallCounts.warning}/${overallCounts.fail}`)
}

run()
  .catch((error) => {
    console.error('Triple check run failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })