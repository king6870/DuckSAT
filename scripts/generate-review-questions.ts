import fs from 'fs'
import path from 'path'
import { UnifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

type ModuleType = 'math' | 'reading-writing'

type OutputQuestion = {
  moduleType: ModuleType
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  passage?: string
  subtopic: string
  difficulty: 'easy' | 'medium' | 'hard'
  qualityScore: number
}

type GenerationOutput = {
  generatedAt: string
  generator: string
  modelHint: string
  attempts: number
  summary: {
    math: number
    readingWriting: number
    total: number
  }
  questions: {
    math: OutputQuestion[]
    readingWriting: OutputQuestion[]
  }
}

const TARGET_MATH = 5
const TARGET_READING = 5
const MAX_ATTEMPTS = 8

if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT?.includes('/openai/deployments/')) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

function isValidQuestionShape(q: {
  question?: string
  options?: string[]
  correctAnswer?: number
  explanation?: string
  moduleType?: ModuleType
  passage?: string
}): boolean {
  if (!q.question || !q.question.trim()) return false
  if (!Array.isArray(q.options) || q.options.length !== 4) return false
  if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) return false
  if (!q.explanation || !q.explanation.trim()) return false

  if (q.moduleType === 'reading-writing') {
    if (!q.passage || !q.passage.trim()) return false
  }

  return true
}

function failsQualityHeuristic(q: {
  question?: string
  explanation?: string
}): boolean {
  const blob = `${q.question || ''} ${q.explanation || ''}`.toLowerCase()
  const disallowedPhrases = [
    'none of the options',
    'not among options',
    'not among the options',
    'not present in the options',
    'correct response is not present',
    'does not match any given option',
    'if forced',
    'intended correct response is not present',
  ]

  return disallowedPhrases.some((phrase) => blob.includes(phrase))
}

function normalizeQuestion(q: {
  moduleType: ModuleType
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  passage?: string
  subtopic: string
  difficulty: 'easy' | 'medium' | 'hard'
  qualityScore?: number
}): OutputQuestion {
  return {
    moduleType: q.moduleType,
    question: q.question.trim(),
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation.trim(),
    passage: q.passage?.trim() || undefined,
    subtopic: q.subtopic,
    difficulty: q.difficulty,
    qualityScore: q.qualityScore ?? 0,
  }
}

async function main(): Promise<void> {
  const generator = new UnifiedQuestionGenerator()
  const usedQuestions = new Set<string>()

  const math: OutputQuestion[] = []
  const reading: OutputQuestion[] = []

  let attempts = 0

  while ((math.length < TARGET_MATH || reading.length < TARGET_READING) && attempts < MAX_ATTEMPTS) {
    attempts += 1

    const neededMath = Math.max(0, TARGET_MATH - math.length)
    const neededReading = Math.max(0, TARGET_READING - reading.length)

    if (neededMath === 0 && neededReading === 0) {
      break
    }

    console.log(`Attempt ${attempts}: requesting ${neededMath} math + ${neededReading} reading-writing`)

    const result = await generator.generateQuestions({
      mathCount: neededMath,
      readingCount: neededReading,
      moduleType: 'both',
      includeImages: false,
      includePassages: true,
      storeInDatabase: false,
      enableRetry: true,
      enableValidation: false,
      maxTokens: 8000,
      difficulty: 'mixed',
    })

    for (const q of result.questions) {
      if (!q.isAccepted) continue
      if (!isValidQuestionShape(q)) continue
      if (failsQualityHeuristic(q)) continue

      const normalized = normalizeQuestion({
        moduleType: q.moduleType,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        passage: q.passage,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        qualityScore: q.qualityScore,
      })

      const dedupeKey = `${normalized.moduleType}::${normalized.question}`.toLowerCase()
      if (usedQuestions.has(dedupeKey)) continue
      usedQuestions.add(dedupeKey)

      if (normalized.moduleType === 'math' && math.length < TARGET_MATH) {
        math.push(normalized)
      } else if (normalized.moduleType === 'reading-writing' && reading.length < TARGET_READING) {
        reading.push(normalized)
      }
    }

    console.log(`Collected so far: ${math.length}/${TARGET_MATH} math, ${reading.length}/${TARGET_READING} reading-writing`)
  }

  if (math.length < TARGET_MATH || reading.length < TARGET_READING) {
    throw new Error(
      `Could not collect enough accepted questions after ${attempts} attempts. ` +
      `Math=${math.length}/${TARGET_MATH}, Reading=${reading.length}/${TARGET_READING}`
    )
  }

  const output: GenerationOutput = {
    generatedAt: new Date().toISOString(),
    generator: 'UnifiedQuestionGenerator',
    modelHint:
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.DEPLOYMENT_NAME ||
      'gpt-5-nano',
    attempts,
    summary: {
      math: math.length,
      readingWriting: reading.length,
      total: math.length + reading.length,
    },
    questions: {
      math,
      readingWriting: reading,
    },
  }

  const outputDir = path.join(process.cwd(), 'output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, 'review-questions-2026-04-26.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')

  console.log('Generation complete.')
  console.log(`Output: ${outputPath}`)
  console.log(`Summary: ${output.summary.math} math + ${output.summary.readingWriting} reading-writing`)
}

main().catch((error) => {
  console.error('Generation failed:', error)
  process.exit(1)
})
