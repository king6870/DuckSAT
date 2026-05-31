import { PrismaClient } from '@prisma/client'

import { getAllSubtopics } from '../src/data/sat-topics'
import { UnifiedQuestionGenerator } from '../src/services/unifiedQuestionGenerator'
import { PASSAGE_LIMITS } from '../src/services/promptConfig'

if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
}

const prisma = new PrismaClient()
const generator = new UnifiedQuestionGenerator()

const APPLY = String(process.env.READING_PASSAGE_REPAIR_APPLY || 'false').toLowerCase() === 'true'
const LIMIT = Math.max(0, Number.parseInt(process.env.READING_PASSAGE_REPAIR_LIMIT || '0', 10) || 0)
const MAX_GENERATION_ATTEMPTS = Math.max(1, Number.parseInt(process.env.READING_PASSAGE_REPAIR_GENERATION_ATTEMPTS || '3', 10) || 3)
const TARGET = String(process.env.READING_PASSAGE_REPAIR_TARGET || 'all').toLowerCase()

const READING_PASSAGE_OMISSION_MARKER = /\.\.\.|…|\[omitted\]|\(omitted\)|\[excerpt\]|abridged|truncated/i

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

const CATEGORY_TO_TOPIC: Record<string, string[]> = {
  'reading-comprehension': ['Reading Comprehension'],
  'vocabulary': ['Reading Comprehension'],
  'writing-language': ['Writing and Language'],
  'grammar': ['Writing and Language'],
}

const SUBTOPIC_ALIASES: Record<string, string> = {
  detail: 'Supporting Details and Evidence',
  purpose: "Author's Purpose and Point of View",
  'transitional and logical flow': 'Transitions and Logical Flow',
}

const KNOWN_READING_SUBTOPICS = new Set(
  getAllSubtopics()
    .filter((subtopic) => subtopic.moduleType === 'reading-writing')
    .map((subtopic) => normalizeSubtopicKey(subtopic.name))
)

type ReadingQuestionRecord = {
  id: string
  moduleType: string
  difficulty: string
  category: string
  subtopic: string | null
  passage: string | null
  isReserved: boolean
}

type RepairCandidate = ReadingQuestionRecord & {
  issues: string[]
}

function getIssueKinds(issues: string[]): Array<'missing' | 'omission' | 'short'> {
  const kinds = new Set<'missing' | 'omission' | 'short'>()

  for (const issue of issues) {
    if (issue.includes('missing reading passage')) {
      kinds.add('missing')
    }
    if (issue.includes('omission markers')) {
      kinds.add('omission')
    }
    if (issue.includes('too short for a full reading passage')) {
      kinds.add('short')
    }
  }

  return [...kinds]
}

function matchesTarget(issues: string[]): boolean {
  if (TARGET === 'all') {
    return true
  }

  return getIssueKinds(issues).includes(TARGET as 'missing' | 'omission' | 'short')
}

function normalizeSubtopicKey(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function requiresFullLengthReadingPassage(subtopic: string | null | undefined): boolean {
  return FULL_PASSAGE_SUBTOPICS.has(normalizeSubtopicKey(subtopic))
}

function getReadingPassageIssues(question: ReadingQuestionRecord): string[] {
  if (question.moduleType !== 'reading-writing') {
    return []
  }

  const passage = (question.passage || '').trim()
  if (!passage) {
    return ['missing reading passage']
  }

  const issues: string[] = []
  const wordCount = countWords(passage)

  if (READING_PASSAGE_OMISSION_MARKER.test(passage)) {
    issues.push('passage contains omission markers such as "..." or "…"')
  }

  if (requiresFullLengthReadingPassage(question.subtopic) && wordCount < PASSAGE_LIMITS.MIN_WORDS) {
    issues.push(`passage is too short for a full reading passage (${wordCount} words, need at least ${PASSAGE_LIMITS.MIN_WORDS})`)
  }

  return issues
}

function normalizeDifficulty(value: string): 'easy' | 'medium' | 'hard' | 'mixed' {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value
  }

  return 'mixed'
}

function resolveSubtopicName(subtopic: string | null | undefined): string | null {
  if (!subtopic) {
    return null
  }

  const normalized = normalizeSubtopicKey(subtopic)
  const aliased = SUBTOPIC_ALIASES[normalized]
  if (aliased) {
    return aliased
  }

  if (KNOWN_READING_SUBTOPICS.has(normalized)) {
    return subtopic
  }

  return null
}

function getGenerationTargets(question: ReadingQuestionRecord): {
  specificSubtopics?: string[]
  specificTopics?: string[]
} {
  const resolvedSubtopic = resolveSubtopicName(question.subtopic)
  if (resolvedSubtopic) {
    return { specificSubtopics: [resolvedSubtopic] }
  }

  return {
    specificTopics: CATEGORY_TO_TOPIC[question.category] || ['Reading Comprehension']
  }
}

async function findFlaggedQuestions(): Promise<RepairCandidate[]> {
  const rows = await prisma.question.findMany({
    where: {
      moduleType: 'reading-writing',
      isActive: true,
    },
    select: {
      id: true,
      moduleType: true,
      difficulty: true,
      category: true,
      subtopic: true,
      passage: true,
      isReserved: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const flagged = rows
    .map((row) => ({ ...row, issues: getReadingPassageIssues(row) }))
    .filter((row) => row.issues.length > 0 && matchesTarget(row.issues))

  return LIMIT > 0 ? flagged.slice(0, LIMIT) : flagged
}

async function getPracticeTestReferenceMap(questionIds: string[]): Promise<Map<string, Array<{ id: string; practiceTestId: string }>>> {
  if (questionIds.length === 0) {
    return new Map()
  }

  const references = await prisma.practiceTestQuestion.findMany({
    where: {
      questionId: { in: questionIds },
    },
    select: {
      id: true,
      practiceTestId: true,
      questionId: true,
    },
  })

  return references.reduce((map, reference) => {
    const current = map.get(reference.questionId) || []
    current.push({ id: reference.id, practiceTestId: reference.practiceTestId })
    map.set(reference.questionId, current)
    return map
  }, new Map<string, Array<{ id: string; practiceTestId: string }>>())
}

async function generateReplacementQuestion(question: RepairCandidate): Promise<string> {
  const generationTargets = getGenerationTargets(question)
  const replacementSubtopic = generationTargets.specificSubtopics?.[0]

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const attemptStartedAt = new Date()
    const result = await generator.generateQuestions({
      moduleType: 'reading-writing',
      mathCount: 0,
      readingCount: 1,
      difficulty: normalizeDifficulty(question.difficulty),
      includeImages: false,
      includePassages: true,
      storeInDatabase: true,
      skipEvaluation: false,
      enableRetry: true,
      enableValidation: false,
      temperature: 0.7,
      ...generationTargets,
    })

    const acceptedQuestion = result.questions.find((candidate) => candidate.isAccepted)
    if (!acceptedQuestion) {
      console.warn(`  Attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}: no accepted replacement generated for ${question.id}`)
      continue
    }

    const replacement = await prisma.question.findFirst({
      where: {
        moduleType: 'reading-writing',
        source: 'AI Generated (Unified Service)',
        createdAt: { gte: attemptStartedAt },
        ...(replacementSubtopic ? { subtopic: replacementSubtopic } : {}),
        ...(question.category ? { category: question.category } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    })

    if (replacement) {
      return replacement.id
    }

    console.warn(`  Attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}: replacement row not found after generation for ${question.id}`)
  }

  throw new Error(`Failed to generate a valid replacement for question ${question.id}`)
}

async function retireQuestion(question: RepairCandidate, replacementId: string | null, references: Array<{ id: string; practiceTestId: string }>): Promise<void> {
  const reviewComment = `Retired by reading passage repair script. Issues: ${question.issues.join('; ')}${replacementId ? `. Replacement: ${replacementId}` : ''}`

  await prisma.$transaction(async (tx) => {
    if (replacementId && references.length > 0) {
      await tx.question.update({
        where: { id: replacementId },
        data: { isReserved: true },
      })

      await tx.practiceTestQuestion.updateMany({
        where: { questionId: question.id },
        data: { questionId: replacementId },
      })
    }

    await tx.question.update({
      where: { id: question.id },
      data: {
        isActive: false,
        isReserved: false,
        reviewStatus: 'rejected',
        reviewComments: reviewComment,
      },
    })
  })
}

async function run(): Promise<void> {
  const flagged = await findFlaggedQuestions()
  const referenceMap = await getPracticeTestReferenceMap(flagged.map((question) => question.id))

  const summary = {
    applyMode: APPLY,
    target: TARGET,
    limit: LIMIT || null,
    flagged: flagged.length,
    linkedToPracticeTests: flagged.filter((question) => (referenceMap.get(question.id) || []).length > 0).length,
    reservedFlagged: flagged.filter((question) => question.isReserved).length,
    issueBreakdown: flagged.reduce<Record<string, number>>((accumulator, question) => {
      for (const kind of getIssueKinds(question.issues)) {
        accumulator[kind] = (accumulator[kind] || 0) + 1
      }
      return accumulator
    }, {}),
    bySubtopic: Object.entries(flagged.reduce<Record<string, number>>((accumulator, question) => {
      const key = question.subtopic || 'Unknown'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})).sort((left, right) => right[1] - left[1]),
    samples: flagged.slice(0, 10).map((question) => ({
      id: question.id,
      subtopic: question.subtopic,
      category: question.category,
      isReserved: question.isReserved,
      practiceRefs: (referenceMap.get(question.id) || []).length,
      issues: question.issues,
      passagePreview: (question.passage || '').slice(0, 140),
    })),
  }

  console.log(JSON.stringify(summary, null, 2))

  if (!APPLY) {
    console.log('\nDry run only. Re-run with READING_PASSAGE_REPAIR_APPLY=true to repair these questions.')
    return
  }

  let repaired = 0
  let failed = 0

  for (const question of flagged) {
    const references = referenceMap.get(question.id) || []
    console.log(`\n[${repaired + failed + 1}/${flagged.length}] Repairing ${question.id} (${question.subtopic || question.category})`)
    console.log(`  Issues: ${question.issues.join('; ')}`)
    console.log(`  Practice test references: ${references.length}`)

    try {
      const replacementId = await generateReplacementQuestion(question)
      await retireQuestion(question, replacementId, references)
      repaired += 1
      console.log(`  Replacement created: ${replacementId}`)
      console.log('  Original question retired successfully')
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  FAILED: ${message}`)
    }
  }

  console.log('\nRepair summary:')
  console.log(`- Repaired: ${repaired}`)
  console.log(`- Failed: ${failed}`)
}

run()
  .catch((error) => {
    console.error('Repair failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })