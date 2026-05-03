import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

type Severity = 'P0' | 'P1' | 'P2'

type CommandCheck = {
  name: string
  enabled: boolean
  ok: boolean
  exitCode: number | null
  durationMs: number
  stdoutTail: string
  stderrTail: string
}

type QuestionAudit = {
  total: number
  diagramMarkedAny: number
  invalidQuestionText: number
  invalidOptionsJson: number
  invalidOptionCount: number
  invalidCorrectAnswerIndex: number
  invalidExplanation: number
  readingMissingPassageWarning: number
  exactDuplicateQuestionTexts: number
  exactDuplicateQuestionIdsSample: string[]
  invalidQuestionIdsSample: string[]
  categoryCounts: Record<string, number>
  subtopicCounts: Record<string, number>
}

type HttpCheckResult = {
  name: string
  path: string
  url: string
  ok: boolean
  status: number | null
  durationMs: number
  error?: string
}

type GateResult = {
  id: string
  title: string
  severity: Severity
  ok: boolean
  details: string
}

type ReadinessReport = {
  generatedAt: string
  baseUrl: string
  strictMode: boolean
  commandChecks: CommandCheck[]
  healthCheck: HttpCheckResult
  questionAudit: QuestionAudit
  apiChecks: {
    total: number
    passed: number
    failed: number
    skipped: number
    serverErrorCount: number
    results: HttpCheckResult[]
  }
  routeChecks: {
    total: number
    passed: number
    failed: number
    serverErrorCount: number
    results: HttpCheckResult[]
  }
  gates: GateResult[]
  launchReady: boolean
}

const prisma = new PrismaClient()

const ROOT = process.cwd()
const BASE_URL = process.env.GO_LIVE_BASE_URL || 'http://localhost:3000'
const STRICT_MODE = String(process.env.GO_LIVE_STRICT || 'false').toLowerCase() === 'true'
const RUN_LINT =
  String(process.env.GO_LIVE_RUN_LINT ?? String(STRICT_MODE)).toLowerCase() === 'true'
const RUN_TYPECHECK =
  String(process.env.GO_LIVE_RUN_TYPECHECK ?? String(STRICT_MODE)).toLowerCase() === 'true'
const RUN_BUILD =
  String(process.env.GO_LIVE_RUN_BUILD ?? String(STRICT_MODE)).toLowerCase() === 'true'
const HTTP_TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.GO_LIVE_HTTP_TIMEOUT_MS || '12000', 10) || 12000,
)

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function tail(value: string, maxChars = 1200): string {
  if (value.length <= maxChars) return value
  return value.slice(value.length - maxChars)
}

function runCommandCheck(name: string, command: string, enabled: boolean): CommandCheck {
  if (!enabled) {
    return {
      name,
      enabled,
      ok: true,
      exitCode: null,
      durationMs: 0,
      stdoutTail: '',
      stderrTail: '',
    }
  }

  const started = Date.now()
  const result = spawnSync(command, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf-8',
  })
  const durationMs = Date.now() - started

  return {
    name,
    enabled,
    ok: result.status === 0,
    exitCode: result.status,
    durationMs,
    stdoutTail: tail(result.stdout || ''),
    stderrTail: tail(result.stderr || ''),
  }
}

async function httpCheck(name: string, endpointPath: string): Promise<HttpCheckResult> {
  const url = `${BASE_URL}${endpointPath}`
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'application/json,text/html,*/*',
      },
    })

    clearTimeout(timer)
    const durationMs = Date.now() - started
    const ok = res.status < 500

    return {
      name,
      path: endpointPath,
      url,
      ok,
      status: res.status,
      durationMs,
    }
  } catch (error) {
    clearTimeout(timer)
    const durationMs = Date.now() - started

    return {
      name,
      path: endpointPath,
      url,
      ok: false,
      status: null,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function walkFiles(rootPath: string, out: string[] = []): string[] {
  if (!fs.existsSync(rootPath)) return out

  const entries = fs.readdirSync(rootPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name)

    if (entry.isDirectory()) {
      walkFiles(fullPath, out)
      continue
    }

    out.push(fullPath)
  }

  return out
}

function discoverAppRoutes(): string[] {
  const appRoot = path.join(ROOT, 'src', 'app')
  const files = walkFiles(appRoot)
    .filter((filePath) => filePath.endsWith(`${path.sep}page.tsx`))

  const routes = new Set<string>()

  for (const filePath of files) {
    const rel = path.relative(appRoot, filePath).replace(/\\/g, '/')
    if (rel.startsWith('api/')) continue
    if (rel.includes('[') || rel.includes(']')) continue

    const routePart = rel.replace(/\/page\.tsx$/, '')
    const route = routePart === '' ? '/' : `/${routePart}`
    routes.add(route)
  }

  return Array.from(routes).sort()
}

function discoverApiRouteTemplates(): string[] {
  const apiRoot = path.join(ROOT, 'src', 'app', 'api')
  const files = walkFiles(apiRoot)
    .filter((filePath) => filePath.endsWith(`${path.sep}route.ts`))

  const routes = new Set<string>()

  for (const filePath of files) {
    const rel = path.relative(apiRoot, filePath).replace(/\\/g, '/')
    const routePart = rel.replace(/\/route\.ts$/, '')
    const route = routePart === '' ? '/api' : `/api/${routePart}`
    routes.add(route)
  }

  return Array.from(routes).sort()
}

function pickDynamicIdForRoute(
  route: string,
  sample: {
    questionId: string
    practiceTestId: string
    userId: string
    topicId: string
    subtopicId: string
    groupSessionId: string
  },
): string {
  if (route.includes('/questions/')) return sample.questionId
  if (route.includes('/practice-tests/')) return sample.practiceTestId
  if (route.includes('/users/')) return sample.userId
  if (route.includes('/topics/')) return sample.topicId
  if (route.includes('/subtopics/')) return sample.subtopicId
  if (route.includes('/group-study/sessions/')) return sample.groupSessionId
  return sample.questionId
}

function materializeApiRoute(
  template: string,
  sample: {
    questionId: string
    practiceTestId: string
    userId: string
    topicId: string
    subtopicId: string
    groupSessionId: string
  },
): string | null {
  if (template.includes('[...nextauth]')) {
    return null
  }

  let route = template

  route = route.replace(/\[friendId\]/g, sample.userId)
  route = route.replace(/\[sid\]/g, sample.subtopicId)

  if (route.includes('[id]')) {
    const replacement = pickDynamicIdForRoute(route, sample)
    route = route.replace(/\[id\]/g, replacement)
  }

  route = route.replace(/\[[^\]]+\]/g, sample.questionId)
  return route
}

function parseOptions(optionsRaw: string): string[] | null {
  try {
    const parsed = JSON.parse(optionsRaw)
    if (!Array.isArray(parsed)) return null
    return parsed.map((value) => String(value))
  } catch {
    return null
  }
}

async function runQuestionAudit(): Promise<QuestionAudit> {
  const rows = await prisma.question.findMany({
    select: {
      id: true,
      moduleType: true,
      question: true,
      passage: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      category: true,
      subtopic: true,
      imageData: true,
      imageUrl: true,
      chartData: true,
      visualType: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  let invalidQuestionText = 0
  let invalidOptionsJson = 0
  let invalidOptionCount = 0
  let invalidCorrectAnswerIndex = 0
  let invalidExplanation = 0
  let readingMissingPassageWarning = 0
  let diagramMarkedAny = 0

  const invalidIds: string[] = []
  const categoryCounts: Record<string, number> = {}
  const subtopicCounts: Record<string, number> = {}
  const questionTextMap = new Map<string, string[]>()

  for (const row of rows) {
    const categoryKey = row.category || 'unknown'
    categoryCounts[categoryKey] = (categoryCounts[categoryKey] || 0) + 1

    const subtopicKey = normalizeWhitespace(row.subtopic || 'none') || 'none'
    subtopicCounts[subtopicKey] = (subtopicCounts[subtopicKey] || 0) + 1

    let rowInvalid = false

    if (!normalizeWhitespace(row.question || '')) {
      invalidQuestionText += 1
      rowInvalid = true
    }

    const options = parseOptions(row.options)
    if (!options) {
      invalidOptionsJson += 1
      rowInvalid = true
    } else if (options.length !== 4) {
      invalidOptionCount += 1
      rowInvalid = true
    }

    if (!Number.isInteger(row.correctAnswer) || row.correctAnswer < 0 || row.correctAnswer > 3) {
      invalidCorrectAnswerIndex += 1
      rowInvalid = true
    }

    if (normalizeWhitespace(row.explanation || '').length < 8) {
      invalidExplanation += 1
      rowInvalid = true
    }

    if (row.moduleType === 'reading-writing' && normalizeWhitespace(row.passage || '').length < 30) {
      readingMissingPassageWarning += 1
    }

    const hasDiagramMarker =
      Boolean(row.imageData) ||
      Boolean(row.imageUrl) ||
      Boolean(normalizeWhitespace(row.chartData || '')) ||
      Boolean(row.visualType && row.visualType !== 'none')

    if (hasDiagramMarker) {
      diagramMarkedAny += 1
      rowInvalid = true
    }

    if (rowInvalid && invalidIds.length < 25) {
      invalidIds.push(row.id)
    }

    const normQuestion = normalizeWhitespace((row.question || '').toLowerCase())
    if (normQuestion) {
      const list = questionTextMap.get(normQuestion) || []
      list.push(row.id)
      questionTextMap.set(normQuestion, list)
    }
  }

  const duplicateIdSample: string[] = []
  let duplicateCount = 0
  for (const ids of questionTextMap.values()) {
    if (ids.length > 1) {
      duplicateCount += 1
      if (duplicateIdSample.length < 25) {
        duplicateIdSample.push(...ids.slice(0, Math.min(ids.length, 2)))
      }
    }
  }

  return {
    total: rows.length,
    diagramMarkedAny,
    invalidQuestionText,
    invalidOptionsJson,
    invalidOptionCount,
    invalidCorrectAnswerIndex,
    invalidExplanation,
    readingMissingPassageWarning,
    exactDuplicateQuestionTexts: duplicateCount,
    exactDuplicateQuestionIdsSample: duplicateIdSample.slice(0, 25),
    invalidQuestionIdsSample: invalidIds,
    categoryCounts,
    subtopicCounts,
  }
}

function summarizeHttp(results: HttpCheckResult[]): {
  total: number
  passed: number
  failed: number
  serverErrorCount: number
} {
  const passed = results.filter((result) => result.ok).length
  const failed = results.length - passed
  const serverErrorCount = results.filter((result) => (result.status || 0) >= 500 || !result.status).length

  return {
    total: results.length,
    passed,
    failed,
    serverErrorCount,
  }
}

function buildMarkdownReport(report: ReadinessReport): string {
  const lines: string[] = []

  lines.push('# DuckSAT Go-Live Readiness Report')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Base URL: ${report.baseUrl}`)
  lines.push(`Strict Mode: ${report.strictMode}`)
  lines.push(`Launch Ready: ${report.launchReady ? 'YES' : 'NO'}`)
  lines.push('')

  lines.push('## Gate Results')
  lines.push('')
  for (const gate of report.gates) {
    lines.push(`- [${gate.ok ? 'PASS' : 'FAIL'}] ${gate.severity} ${gate.id}: ${gate.title}`)
    lines.push(`  - ${gate.details}`)
  }
  lines.push('')

  lines.push('## DB + Question Audit')
  lines.push('')
  lines.push(`- Total questions: ${report.questionAudit.total}`)
  lines.push(`- Diagram-marked questions: ${report.questionAudit.diagramMarkedAny}`)
  lines.push(`- Invalid question text: ${report.questionAudit.invalidQuestionText}`)
  lines.push(`- Invalid options JSON: ${report.questionAudit.invalidOptionsJson}`)
  lines.push(`- Invalid option count (!=4): ${report.questionAudit.invalidOptionCount}`)
  lines.push(`- Invalid correctAnswer index: ${report.questionAudit.invalidCorrectAnswerIndex}`)
  lines.push(`- Invalid explanation: ${report.questionAudit.invalidExplanation}`)
  lines.push(`- Reading missing passage warnings: ${report.questionAudit.readingMissingPassageWarning}`)
  lines.push(`- Exact duplicate question texts: ${report.questionAudit.exactDuplicateQuestionTexts}`)
  lines.push('')

  lines.push('## API Smoke')
  lines.push('')
  lines.push(`- Total checked: ${report.apiChecks.total}`)
  lines.push(`- Passed: ${report.apiChecks.passed}`)
  lines.push(`- Failed: ${report.apiChecks.failed}`)
  lines.push(`- Server/network failures: ${report.apiChecks.serverErrorCount}`)
  lines.push('')

  const failedApi = report.apiChecks.results.filter((result) => !result.ok).slice(0, 20)
  if (failedApi.length > 0) {
    lines.push('### Failed API Checks (Top 20)')
    lines.push('')
    for (const result of failedApi) {
      lines.push(`- ${result.path} -> status=${result.status ?? 'ERR'} error=${result.error ?? ''}`)
    }
    lines.push('')
  }

  lines.push('## Route Smoke')
  lines.push('')
  lines.push(`- Total checked: ${report.routeChecks.total}`)
  lines.push(`- Passed: ${report.routeChecks.passed}`)
  lines.push(`- Failed: ${report.routeChecks.failed}`)
  lines.push(`- Server/network failures: ${report.routeChecks.serverErrorCount}`)
  lines.push('')

  const failedRoutes = report.routeChecks.results.filter((result) => !result.ok).slice(0, 20)
  if (failedRoutes.length > 0) {
    lines.push('### Failed Route Checks (Top 20)')
    lines.push('')
    for (const result of failedRoutes) {
      lines.push(`- ${result.path} -> status=${result.status ?? 'ERR'} error=${result.error ?? ''}`)
    }
    lines.push('')
  }

  lines.push('## Command Checks')
  lines.push('')
  for (const check of report.commandChecks) {
    lines.push(`- ${check.name}: ${check.enabled ? (check.ok ? 'PASS' : 'FAIL') : 'SKIPPED'}`)
  }
  lines.push('')

  return lines.join('\n')
}

async function main(): Promise<void> {
  const runAt = new Date().toISOString()
  const runId = runAt.replace(/[:.]/g, '-')

  const commandChecks: CommandCheck[] = [
    runCommandCheck('lint', 'npm run lint', RUN_LINT),
    runCommandCheck('typecheck', 'npx tsc --noEmit', RUN_TYPECHECK),
    runCommandCheck('build', 'npm run build', RUN_BUILD),
  ]

  const healthCheck = await httpCheck('health', '/api/health')

  const questionAudit = await runQuestionAudit()

  const sample = {
    questionId: (await prisma.question.findFirst({ select: { id: true } }))?.id || 'sample-question-id',
    practiceTestId: (await prisma.practiceTest.findFirst({ select: { id: true } }))?.id || 'sample-practice-test-id',
    userId: (await prisma.user.findFirst({ select: { id: true } }))?.id || 'sample-user-id',
    topicId: (await prisma.topic.findFirst({ select: { id: true } }))?.id || 'sample-topic-id',
    subtopicId: (await prisma.subtopic.findFirst({ select: { id: true } }))?.id || 'sample-subtopic-id',
    groupSessionId: (await prisma.groupStudySession.findFirst({ select: { id: true } }))?.id || 'sample-session-id',
  }

  const apiTemplates = discoverApiRouteTemplates()
  const apiResults: HttpCheckResult[] = []
  let apiSkipped = 0

  if (healthCheck.ok) {
    for (const template of apiTemplates) {
      const materialized = materializeApiRoute(template, sample)
      if (!materialized) {
        apiSkipped += 1
        continue
      }

      apiResults.push(await httpCheck(`api:${template}`, materialized))
    }
  }

  const routePaths = discoverAppRoutes()
  const routeResults: HttpCheckResult[] = []

  if (healthCheck.ok) {
    for (const routePath of routePaths) {
      routeResults.push(await httpCheck(`route:${routePath}`, routePath))
    }
  }

  const apiSummary = summarizeHttp(apiResults)
  const routeSummary = summarizeHttp(routeResults)

  const structuralInvalidCount =
    questionAudit.invalidQuestionText +
    questionAudit.invalidOptionsJson +
    questionAudit.invalidOptionCount +
    questionAudit.invalidCorrectAnswerIndex +
    questionAudit.invalidExplanation

  const gates: GateResult[] = [
    {
      id: 'P0-HEALTH',
      title: 'Health endpoint reachable',
      severity: 'P0',
      ok: healthCheck.ok,
      details: healthCheck.ok
        ? `status=${healthCheck.status}`
        : `status=${healthCheck.status ?? 'ERR'} error=${healthCheck.error ?? 'unknown'}`,
    },
    {
      id: 'P0-DIAGRAMLESS',
      title: 'Zero diagram markers in questions',
      severity: 'P0',
      ok: questionAudit.diagramMarkedAny === 0,
      details: `diagramMarkedAny=${questionAudit.diagramMarkedAny}`,
    },
    {
      id: 'P0-QUESTION-STRUCTURE',
      title: 'All questions structurally passable',
      severity: 'P0',
      ok: structuralInvalidCount === 0,
      details: `structuralInvalidCount=${structuralInvalidCount}`,
    },
    {
      id: 'P0-API-5XX',
      title: 'No API 5xx/network failures during smoke',
      severity: 'P0',
      ok: apiSummary.serverErrorCount === 0,
      details: `serverErrorCount=${apiSummary.serverErrorCount} checked=${apiSummary.total} skipped=${apiSkipped}`,
    },
    {
      id: 'P0-ROUTE-5XX',
      title: 'No app route 5xx/network failures during smoke',
      severity: 'P0',
      ok: routeSummary.serverErrorCount === 0,
      details: `serverErrorCount=${routeSummary.serverErrorCount} checked=${routeSummary.total}`,
    },
    {
      id: 'P1-DUPLICATES',
      title: 'No exact duplicate question text clusters',
      severity: 'P1',
      ok: questionAudit.exactDuplicateQuestionTexts === 0,
      details: `exactDuplicateQuestionTexts=${questionAudit.exactDuplicateQuestionTexts}`,
    },
    {
      id: 'P1-READING-PASSAGE',
      title: 'Reading questions include passages (warning gate)',
      severity: 'P1',
      ok: questionAudit.readingMissingPassageWarning === 0,
      details: `readingMissingPassageWarning=${questionAudit.readingMissingPassageWarning}`,
    },
  ]

  if (RUN_LINT || RUN_TYPECHECK || RUN_BUILD) {
    const allEnabledCommandsPassed = commandChecks
      .filter((check) => check.enabled)
      .every((check) => check.ok)

    gates.push({
      id: 'P0-CI-COMMANDS',
      title: 'Enabled lint/typecheck/build checks pass',
      severity: 'P0',
      ok: allEnabledCommandsPassed,
      details: commandChecks
        .filter((check) => check.enabled)
        .map((check) => `${check.name}:${check.ok ? 'PASS' : `FAIL(${check.exitCode})`}`)
        .join(', '),
    })
  }

  const launchReady = gates
    .filter((gate) => gate.severity === 'P0')
    .every((gate) => gate.ok)

  const report: ReadinessReport = {
    generatedAt: runAt,
    baseUrl: BASE_URL,
    strictMode: STRICT_MODE,
    commandChecks,
    healthCheck,
    questionAudit,
    apiChecks: {
      total: apiSummary.total,
      passed: apiSummary.passed,
      failed: apiSummary.failed,
      skipped: apiSkipped,
      serverErrorCount: apiSummary.serverErrorCount,
      results: apiResults,
    },
    routeChecks: {
      total: routeSummary.total,
      passed: routeSummary.passed,
      failed: routeSummary.failed,
      serverErrorCount: routeSummary.serverErrorCount,
      results: routeResults,
    },
    gates,
    launchReady,
  }

  const outDir = path.join(ROOT, 'output', 'go-live')
  ensureDir(outDir)

  const jsonPath = path.join(outDir, `go-live-readiness-${runId}.json`)
  const mdPath = path.join(outDir, `go-live-readiness-${runId}.md`)

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
  fs.writeFileSync(mdPath, buildMarkdownReport(report), 'utf-8')

  console.log('\n=== DuckSAT Go-Live Readiness ===')
  console.log(`Generated: ${runAt}`)
  console.log(`Launch Ready (P0): ${launchReady}`)
  console.log(`Health: ${healthCheck.ok ? 'PASS' : 'FAIL'} (${healthCheck.status ?? 'ERR'})`)
  console.log(`Question Structural Invalid: ${structuralInvalidCount}`)
  console.log(`Diagram Markers: ${questionAudit.diagramMarkedAny}`)
  console.log(`API 5xx/network failures: ${apiSummary.serverErrorCount}`)
  console.log(`Route 5xx/network failures: ${routeSummary.serverErrorCount}`)
  console.log(`Report JSON: ${jsonPath}`)
  console.log(`Report MD: ${mdPath}`)
}

main()
  .catch((error) => {
    console.error('Go-live readiness script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
