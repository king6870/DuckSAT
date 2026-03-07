import { PrismaClient } from '@prisma/client'
import { UnifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

interface AuditIssue {
  severity: 'critical' | 'warning'
  message: string
}

interface AuditedQuestion {
  id: string
  moduleType: string
  category: string
  subtopic: string | null
  preview: string
  issues: AuditIssue[]
}

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function auditQuestion(question: {
  id: string
  moduleType: string
  category: string
  subtopic: string | null
  question: string
  passage: string | null
  options: string
  correctAnswer: number
  explanation: string
  source: string | null
  reviewStatus: string | null
}): AuditedQuestion {
  const issues: AuditIssue[] = []
  const options = parseOptions(question.options)

  if (!question.question || question.question.trim().length < 20) {
    issues.push({ severity: 'critical', message: 'Question text too short or empty' })
  }

  if (!question.explanation || question.explanation.trim().length < 30) {
    issues.push({ severity: 'critical', message: 'Explanation missing or too short' })
  }

  if (options.length !== 4) {
    issues.push({ severity: 'critical', message: `Expected 4 options, got ${options.length}` })
  }

  if (question.correctAnswer < 0 || question.correctAnswer >= options.length) {
    issues.push({ severity: 'critical', message: 'Correct answer index is out of range' })
  }

  if (question.moduleType === 'reading-writing' && (!question.passage || question.passage.trim().length < 40)) {
    issues.push({ severity: 'warning', message: 'Reading question has missing/short passage' })
  }

  const textBlob = `${question.question} ${question.explanation} ${question.source ?? ''}`.toLowerCase()
  const suspiciousMarkers = ['auto-generated', 'lorem ipsum', 'placeholder', 'dummy question']
  if (suspiciousMarkers.some(marker => textBlob.includes(marker))) {
    issues.push({ severity: 'critical', message: 'Contains placeholder/auto-generated marker text' })
  }

  if (question.reviewStatus === 'rejected') {
    issues.push({ severity: 'critical', message: 'Question is already marked as rejected' })
  }

  return {
    id: question.id,
    moduleType: question.moduleType,
    category: question.category,
    subtopic: question.subtopic,
    preview: question.question.slice(0, 120).replace(/\s+/g, ' ').trim(),
    issues
  }
}

async function run() {
  const prisma = new PrismaClient()

  if (!process.env.ENDPOINT_URL && process.env.AZURE_OPENAI_ENDPOINT?.includes('/openai/deployments/')) {
    process.env.ENDPOINT_URL = process.env.AZURE_OPENAI_ENDPOINT
  }

  const generator = new UnifiedQuestionGenerator()

  const startedAt = new Date()
  const startedAtWindow = new Date(startedAt.getTime() - 2000)

  console.log('🧪 Specialized generation + DB acceptability audit')
  console.log(`Start time: ${startedAt.toISOString()}`)

  try {
    const generationResult = await generator.generateQuestions({
      mathCount: 1,
      readingCount: 1,
      specializedMode: true,
      moduleType: 'both',
      difficulty: 'mixed',
      includeImages: false,
      includePassages: true,
      storeInDatabase: true,
      enableRetry: false,
      enableValidation: true,
      temperature: 0.7,
      maxTokens: 8000
    })

    console.log('\n📊 Generation summary:')
    console.log(JSON.stringify(generationResult.summary, null, 2))

    const newQuestions = await prisma.question.findMany({
      where: {
        createdAt: { gte: startedAtWindow }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        moduleType: true,
        category: true,
        subtopic: true,
        question: true,
        passage: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        source: true,
        reviewStatus: true,
        createdAt: true
      }
    })

    if (newQuestions.length === 0) {
      console.log('\n❌ No newly created questions were found in DB after generation.')
      process.exitCode = 1
      return
    }

    const audited = newQuestions.map(auditQuestion)
    const withCritical = audited.filter(a => a.issues.some(i => i.severity === 'critical'))
    const withWarningsOnly = audited.filter(a => a.issues.length > 0 && !a.issues.some(i => i.severity === 'critical'))
    const clean = audited.filter(a => a.issues.length === 0)

    console.log(`\n🗄️ New questions audited: ${audited.length}`)
    console.log(`✅ Clean: ${clean.length}`)
    console.log(`⚠️ Warnings only: ${withWarningsOnly.length}`)
    console.log(`❌ Critical issues: ${withCritical.length}`)

    if (withWarningsOnly.length > 0) {
      console.log('\n⚠️ Questions with warnings:')
      for (const question of withWarningsOnly) {
        console.log(`- ${question.id} [${question.moduleType}] ${question.preview}`)
        for (const issue of question.issues) {
          console.log(`  - ${issue.message}`)
        }
      }
    }

    if (withCritical.length > 0) {
      console.log('\n❌ Questions with critical issues:')
      for (const question of withCritical) {
        console.log(`- ${question.id} [${question.moduleType}] ${question.preview}`)
        for (const issue of question.issues.filter(i => i.severity === 'critical')) {
          console.log(`  - ${issue.message}`)
        }
      }
      process.exitCode = 1
      return
    }

    const isAcceptable = clean.length + withWarningsOnly.length === audited.length

    console.log(`\n🎯 Acceptability verdict: ${isAcceptable ? 'ACCEPTABLE' : 'NOT ACCEPTABLE'}`)
    console.log('Criteria: no critical structural/content issues in newly created DB questions.')
  } finally {
    await prisma.$disconnect()
  }
}

run().catch((error) => {
  console.error('💥 Specialized DB acceptability test failed:', error)
  process.exit(1)
})
