/**
 * Generate a pilot batch of SAT questions by topic using UnifiedQuestionGenerator.
 *
 * Pilot target: 5 questions per topic in SAT_TOPICS.
 * Full rollout target (documented in report metadata): 50 per topic.
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/generate-topic-pilot.ts
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { SAT_TOPICS, type SATTopic } from '../src/data/sat-topics'
import { UnifiedQuestionGenerator, type GenerationOptions } from '../src/services/unifiedQuestionGenerator'

const prisma = new PrismaClient()

const PILOT_PER_TOPIC = 5
const FULL_TARGET_PER_TOPIC = 50
const MAX_ATTEMPTS_PER_TOPIC = 6
const MAX_PER_GENERATION_CALL = 3
const RETRY_DELAY_MS = 1000

if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

if (!process.env.AZURE_OPENAI_API_KEY) {
  throw new Error('Missing AZURE_OPENAI_API_KEY in environment.')
}

interface QuestionRow {
  id: string
  createdAt: Date
  question: string
  options: string
  correctAnswer: number
  explanation: string
  difficulty: string | null
  category: string
  subtopic: string | null
  chartData: unknown
  imageUrl: string | null
  passage: string | null
  source: string | null
  moduleType: string
}

interface PilotQuestion {
  id: string
  createdAt: string
  moduleType: string
  category: string
  subtopic: string | null
  difficulty: string | null
  hasDiagram: boolean
  imageUrl: string | null
  chartDataPresent: boolean
  explanationLength: number
  passageLength: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface TopicPilotResult {
  topicId: string
  topicName: string
  moduleType: 'reading-writing' | 'math'
  requested: number
  collected: number
  attempts: number
  acceptedDuringGeneration: number
  withDiagramCount: number
  avgExplanationLength: number
  errors: string[]
  questions: PilotQuestion[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : []
  } catch {
    return []
  }
}

function hasChartData(chartData: unknown): boolean {
  if (!chartData) return false
  if (typeof chartData === 'string') {
    const trimmed = chartData.trim()
    return trimmed.length > 0 && trimmed !== '{}' && trimmed !== 'null'
  }
  if (typeof chartData === 'object') {
    return Object.keys(chartData as Record<string, unknown>).length > 0
  }
  return false
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function getTopicMatchKeys(topic: SATTopic): string[] {
  const keys = new Set<string>()
  keys.add(normalizeForMatch(topic.id))
  keys.add(normalizeForMatch(topic.name))

  for (const subtopic of topic.subtopics) {
    keys.add(normalizeForMatch(subtopic.id))
    keys.add(normalizeForMatch(subtopic.name))
  }

  return Array.from(keys).filter(Boolean)
}

function toPilotQuestion(row: QuestionRow): PilotQuestion {
  const options = parseOptions(row.options)
  const chartDataPresent = hasChartData(row.chartData)
  const hasDiagram = Boolean(row.imageUrl) || chartDataPresent

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    moduleType: row.moduleType,
    category: row.category,
    subtopic: row.subtopic,
    difficulty: row.difficulty,
    hasDiagram,
    imageUrl: row.imageUrl,
    chartDataPresent,
    explanationLength: row.explanation?.length || 0,
    passageLength: row.passage?.length || 0,
    question: row.question,
    options,
    correctAnswer: row.correctAnswer,
    explanation: row.explanation,
  }
}

async function fetchGeneratedForTopic(topic: SATTopic, topicStart: Date, topicEnd?: Date): Promise<QuestionRow[]> {
  const matchKeys = getTopicMatchKeys(topic)

  const rows = await prisma.question.findMany({
    where: {
      moduleType: topic.moduleType,
      source: { contains: 'Unified Service' },
      createdAt: {
        gte: topicStart,
        ...(topicEnd ? { lte: topicEnd } : {}),
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      createdAt: true,
      question: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      difficulty: true,
      category: true,
      subtopic: true,
      chartData: true,
      imageUrl: true,
      passage: true,
      source: true,
      moduleType: true,
    },
    take: 200,
  })

  // Keep the topic window strict and deterministic, and filter to this topic/subtopics.
  return rows.filter((row) => {
    const candidates = [row.subtopic, row.category]
      .filter((value): value is string => Boolean(value))
      .map(normalizeForMatch)

    return candidates.some((candidate) =>
      matchKeys.some((key) => candidate.includes(key) || key.includes(candidate))
    )
  })
}

function computeAverageExplanationLength(questions: PilotQuestion[]): number {
  if (questions.length === 0) return 0
  const total = questions.reduce((sum, q) => sum + q.explanationLength, 0)
  return Math.round(total / questions.length)
}

function buildGenerationOptions(topic: SATTopic, count: number): GenerationOptions {
  const safeCount = Math.max(1, Math.min(count, MAX_PER_GENERATION_CALL))

  return {
    specializedMode: true,
    moduleType: topic.moduleType,
    specificTopics: [topic.id],
    mathCount: topic.moduleType === 'math' ? safeCount : 0,
    readingCount: topic.moduleType === 'reading-writing' ? safeCount : 0,
    difficulty: 'mixed',
    includeImages: true,
    includePassages: true,
    storeInDatabase: true,
    enableRetry: false,
    // Validation occurs before image generation in current pipeline,
    // so keep this off to avoid false negatives on math chart questions.
    enableValidation: false,
    // Pilot mode prioritizes coverage by topic over strict filtering.
    skipEvaluation: true,
    temperature: 0.7,
    maxTokens: 16000,
  }
}

function buildMarkdownReport(results: TopicPilotResult[]): string {
  const lines: string[] = []
  lines.push('# Topic Pilot Generation Report')
  lines.push('')
  lines.push(`Generated At: ${new Date().toISOString()}`)
  lines.push(`Pilot Target Per Topic: ${PILOT_PER_TOPIC}`)
  lines.push(`Full Rollout Target Per Topic: ${FULL_TARGET_PER_TOPIC}`)
  lines.push('')

  for (const result of results) {
    lines.push(`## ${result.topicName} (${result.topicId})`)
    lines.push('')
    lines.push(`- Module: ${result.moduleType}`)
    lines.push(`- Requested: ${result.requested}`)
    lines.push(`- Collected: ${result.collected}`)
    lines.push(`- Attempts: ${result.attempts}`)
    lines.push(`- Accepted During Generation: ${result.acceptedDuringGeneration}`)
    lines.push(`- With Diagram: ${result.withDiagramCount}/${result.collected}`)
    lines.push(`- Avg Explanation Length: ${result.avgExplanationLength}`)
    if (result.errors.length > 0) {
      lines.push(`- Errors: ${result.errors.length}`)
      for (const error of result.errors) {
        lines.push(`  - ${error}`)
      }
    }
    lines.push('')

    result.questions.forEach((q, index) => {
      lines.push(`### Q${index + 1}: ${q.subtopic || 'General'}`)
      lines.push('')
      lines.push(`- Difficulty: ${q.difficulty || 'unknown'}`)
      lines.push(`- Category: ${q.category}`)
      lines.push(`- Diagram: ${q.hasDiagram ? 'yes' : 'no'}`)
      lines.push(`- Explanation Length: ${q.explanationLength}`)
      lines.push(`- Passage Length: ${q.passageLength}`)
      lines.push(`- Correct Answer Index: ${q.correctAnswer}`)
      lines.push('')
      lines.push(`Question: ${q.question}`)
      lines.push('')
      lines.push('Options:')
      q.options.forEach((option, optionIndex) => {
        lines.push(`${optionIndex}. ${option}`)
      })
      lines.push('')
      lines.push(`Explanation: ${q.explanation}`)
      lines.push('')
    })
  }

  return lines.join('\n')
}

async function writeReports(results: TopicPilotResult[]): Promise<{ jsonPath: string; markdownPath: string }> {
  const outputDir = join(process.cwd(), 'output')
  await mkdir(outputDir, { recursive: true })

  const jsonPath = join(outputDir, 'topic-pilot-questions.json')
  const markdownPath = join(outputDir, 'topic-pilot-questions.md')

  const payload = {
    generatedAt: new Date().toISOString(),
    pilotPerTopic: PILOT_PER_TOPIC,
    fullTargetPerTopic: FULL_TARGET_PER_TOPIC,
    totalTopics: SAT_TOPICS.length,
    results,
  }

  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8')
  await writeFile(markdownPath, buildMarkdownReport(results), 'utf8')

  return { jsonPath, markdownPath }
}

async function main(): Promise<void> {
  const generator = new UnifiedQuestionGenerator()
  const allResults: TopicPilotResult[] = []

  console.log('=== Topic Pilot Generation Start ===')
  console.log(`Topics: ${SAT_TOPICS.length}`)
  console.log(`Pilot per topic: ${PILOT_PER_TOPIC}`)
  console.log(`Full rollout target per topic: ${FULL_TARGET_PER_TOPIC}`)

  for (const topic of SAT_TOPICS) {
    const topicStart = new Date()
    let attempts = 0
    let acceptedDuringGeneration = 0
    let collectedQuestions: PilotQuestion[] = []
    const topicErrors: string[] = []

    console.log(`\n--- Topic: ${topic.name} (${topic.id}) ---`)

    while (collectedQuestions.length < PILOT_PER_TOPIC && attempts < MAX_ATTEMPTS_PER_TOPIC) {
      attempts += 1
      const remaining = PILOT_PER_TOPIC - collectedQuestions.length

      console.log(`Attempt ${attempts}/${MAX_ATTEMPTS_PER_TOPIC}: generating ${remaining} question(s)...`)

      const generationOptions = buildGenerationOptions(topic, remaining)
      try {
        const generationResult = await generator.generateQuestions(generationOptions)
        acceptedDuringGeneration += generationResult.summary.accepted
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const compactError = `Attempt ${attempts}: ${message}`
        topicErrors.push(compactError)
        console.warn(`⚠️  ${topic.id} ${compactError}`)
      }

      await sleep(RETRY_DELAY_MS)

      const rows = await fetchGeneratedForTopic(topic, topicStart)
      collectedQuestions = rows.map(toPilotQuestion).slice(-PILOT_PER_TOPIC)

      console.log(
        `Collected ${collectedQuestions.length}/${PILOT_PER_TOPIC} so far ` +
        `(attempt ${attempts}/${MAX_ATTEMPTS_PER_TOPIC})`
      )
    }

    const topicEnd = new Date()
    const finalRows = await fetchGeneratedForTopic(topic, topicStart, topicEnd)
    const finalQuestions = finalRows.map(toPilotQuestion).slice(-PILOT_PER_TOPIC)

    const withDiagramCount = finalQuestions.filter((q) => q.hasDiagram).length
    const avgExplanationLength = computeAverageExplanationLength(finalQuestions)

    allResults.push({
      topicId: topic.id,
      topicName: topic.name,
      moduleType: topic.moduleType,
      requested: PILOT_PER_TOPIC,
      collected: finalQuestions.length,
      attempts,
      acceptedDuringGeneration,
      withDiagramCount,
      avgExplanationLength,
      errors: topicErrors,
      questions: finalQuestions,
    })

    // Write checkpoint reports after each topic.
    await writeReports(allResults)

    console.log(
      `Topic complete: ${finalQuestions.length}/${PILOT_PER_TOPIC}, ` +
      `diagrams ${withDiagramCount}/${finalQuestions.length}, ` +
      `avg explanation ${avgExplanationLength}`
    )
  }

  const { jsonPath, markdownPath } = await writeReports(allResults)

  console.log('\n=== Topic Pilot Generation Complete ===')
  console.log(`JSON report: ${jsonPath}`)
  console.log(`Markdown report: ${markdownPath}`)

  for (const result of allResults) {
    console.log(
      `${result.topicId}: ${result.collected}/${result.requested} ` +
      `(diagrams ${result.withDiagramCount}/${result.collected}, avg explanation ${result.avgExplanationLength})`
    )
  }
}

main()
  .catch((error) => {
    console.error('Pilot generation failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
