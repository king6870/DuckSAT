import { PrismaClient } from '@prisma/client'

interface AuditIssue {
  severity: 'critical' | 'warning'
  message: string
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
  question: string
  passage: string | null
  options: string
  correctAnswer: number
  explanation: string
  source: string | null
  reviewStatus: string | null
}) {
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

  return issues
}

async function run() {
  const prisma = new PrismaClient()

  try {
    const latestQuestions = await prisma.question.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        moduleType: true,
        category: true,
        subtopic: true,
        question: true,
        passage: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        source: true,
        reviewStatus: true
      }
    })

    if (latestQuestions.length === 0) {
      console.log('No questions found in database.')
      return
    }

    console.log(`Auditing latest ${latestQuestions.length} questions (most recent first)\n`)

    let criticalCount = 0
    let warningCount = 0

    for (const question of latestQuestions) {
      const issues = auditQuestion(question)
      const critical = issues.filter(i => i.severity === 'critical')
      const warnings = issues.filter(i => i.severity === 'warning')

      criticalCount += critical.length > 0 ? 1 : 0
      warningCount += critical.length === 0 && warnings.length > 0 ? 1 : 0

      const verdict = critical.length > 0 ? 'NOT ACCEPTABLE' : warnings.length > 0 ? 'ACCEPTABLE (with warnings)' : 'ACCEPTABLE'

      console.log(`- ${question.id} | ${question.createdAt.toISOString()} | ${question.moduleType} | ${verdict}`)
      console.log(`  ${question.question.slice(0, 120).replace(/\s+/g, ' ').trim()}${question.question.length > 120 ? '...' : ''}`)

      for (const issue of [...critical, ...warnings]) {
        console.log(`  • ${issue.severity.toUpperCase()}: ${issue.message}`)
      }
    }

    const acceptableCount = latestQuestions.length - criticalCount
    console.log('\nSummary:')
    console.log(`- Acceptable: ${acceptableCount}/${latestQuestions.length}`)
    console.log(`- Not acceptable: ${criticalCount}/${latestQuestions.length}`)
    console.log(`- Acceptable with warnings: ${warningCount}/${latestQuestions.length}`)

    if (criticalCount > 0) {
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

run().catch((error) => {
  console.error('Audit failed:', error)
  process.exit(1)
})
