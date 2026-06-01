const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const APPLY = String(process.env.AUDIT_FAIL_REPAIR_APPLY || 'false').toLowerCase() === 'true'

function countWords(text) {
  return (text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function buildKey(moduleType, category, subtopic) {
  return `${normalize(moduleType)}::${normalize(category)}::${normalize(subtopic)}`
}

function chunk(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function nextCandidate(poolState) {
  if (!poolState || poolState.ids.length === 0) {
    return null
  }

  const candidateId = poolState.ids[poolState.index % poolState.ids.length]
  poolState.index += 1
  return candidateId
}

function nextCompatibleCandidate(poolState, practiceTestIds, practiceTestQuestionIds) {
  if (!poolState || poolState.ids.length === 0) {
    return null
  }

  const attempts = poolState.ids.length

  for (let count = 0; count < attempts; count += 1) {
    const candidateId = nextCandidate(poolState)
    const conflicts = practiceTestIds.some((practiceTestId) => {
      const questionIds = practiceTestQuestionIds.get(practiceTestId)
      return questionIds && questionIds.has(candidateId)
    })

    if (!conflicts) {
      return candidateId
    }
  }

  return null
}

function latestAuditJsonlPath() {
  const reviewDir = path.join(process.cwd(), 'output', 'question-review')
  const candidates = fs
    .readdirSync(reviewDir)
    .filter((name) => name.endsWith('.jsonl') && name.startsWith('triple-check-'))
    .sort()

  if (candidates.length === 0) {
    throw new Error('No triple-check JSONL files found.')
  }

  return path.join(reviewDir, candidates[candidates.length - 1])
}

function readFailRows(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((row) => row.overallVerdict === 'fail')
    .map((row) => ({
      id: row.id,
      moduleType: row.moduleType,
      category: row.category,
      subtopic: row.subtopic,
      failCodes: row.passes.flatMap((pass) => pass.issues || []).filter((issue) => issue.severity === 'fail').map((issue) => issue.code),
    }))
}

function isGoodGeneralCandidate(row) {
  return countWords(row.question) >= 7
}

function isGoodFullPassageCandidate(row) {
  return isGoodGeneralCandidate(row) && countWords(row.passage) >= 150
}

async function main() {
  const jsonlPath = process.env.TRIPLE_CHECK_JSONL || latestAuditJsonlPath()
  const failRows = readFailRows(jsonlPath)
  const failIds = new Set(failRows.map((row) => row.id))

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      moduleType: true,
      category: true,
      subtopic: true,
      passage: true,
      question: true,
      isReserved: true,
    },
  })

  const questionById = new Map(questions.map((row) => [row.id, row]))
  const activeFailRows = failRows.filter((row) => questionById.has(row.id))

  const references = await prisma.practiceTestQuestion.findMany({
    select: {
      practiceTestId: true,
      questionId: true,
    },
  })

  const refsByQuestionId = new Map()
  const practiceTestQuestionIds = new Map()
  for (const reference of references) {
    if (!practiceTestQuestionIds.has(reference.practiceTestId)) {
      practiceTestQuestionIds.set(reference.practiceTestId, new Set())
    }

    practiceTestQuestionIds.get(reference.practiceTestId).add(reference.questionId)

    const current = refsByQuestionId.get(reference.questionId) || []
    current.push(reference)
    refsByQuestionId.set(reference.questionId, current)
  }

  const exactGeneralPools = new Map()
  const categoryGeneralPools = new Map()
  const fallbackGeneralPool = { ids: [], index: 0 }

  const exactReadingPools = new Map()
  const categoryReadingPools = new Map()
  const fallbackReadingPool = { ids: [], index: 0 }

  for (const row of questions) {
    if (failIds.has(row.id)) {
      continue
    }

    const exactKey = buildKey(row.moduleType, row.category, row.subtopic)
    const categoryKey = `${normalize(row.moduleType)}::${normalize(row.category)}`

    if (isGoodGeneralCandidate(row)) {
      if (!exactGeneralPools.has(exactKey)) {
        exactGeneralPools.set(exactKey, { ids: [], index: 0 })
      }
      exactGeneralPools.get(exactKey).ids.push(row.id)

      if (!categoryGeneralPools.has(categoryKey)) {
        categoryGeneralPools.set(categoryKey, { ids: [], index: 0 })
      }
      categoryGeneralPools.get(categoryKey).ids.push(row.id)

      fallbackGeneralPool.ids.push(row.id)
    }

    if (row.moduleType === 'reading-writing' && isGoodFullPassageCandidate(row)) {
      if (!exactReadingPools.has(exactKey)) {
        exactReadingPools.set(exactKey, { ids: [], index: 0 })
      }
      exactReadingPools.get(exactKey).ids.push(row.id)

      if (!categoryReadingPools.has(categoryKey)) {
        categoryReadingPools.set(categoryKey, { ids: [], index: 0 })
      }
      categoryReadingPools.get(categoryKey).ids.push(row.id)

      fallbackReadingPool.ids.push(row.id)
    }
  }

  const plan = activeFailRows.map((row) => {
    const refs = refsByQuestionId.get(row.id) || []
    const practiceTestIds = [...new Set(refs.map((reference) => reference.practiceTestId))]
    const exactKey = buildKey(row.moduleType, row.category, row.subtopic)
    const categoryKey = `${normalize(row.moduleType)}::${normalize(row.category)}`
    const needsFullPassage = row.failCodes.includes('short-full-passage') || row.failCodes.includes('missing-required-passage')
    const replacementId = refs.length === 0
      ? null
      : needsFullPassage
        ? nextCompatibleCandidate(exactReadingPools.get(exactKey), practiceTestIds, practiceTestQuestionIds)
          || nextCompatibleCandidate(categoryReadingPools.get(categoryKey), practiceTestIds, practiceTestQuestionIds)
          || nextCompatibleCandidate(fallbackReadingPool, practiceTestIds, practiceTestQuestionIds)
        : nextCompatibleCandidate(exactGeneralPools.get(exactKey), practiceTestIds, practiceTestQuestionIds)
          || nextCompatibleCandidate(categoryGeneralPools.get(categoryKey), practiceTestIds, practiceTestQuestionIds)
          || nextCompatibleCandidate(fallbackGeneralPool, practiceTestIds, practiceTestQuestionIds)

    if (replacementId) {
      for (const practiceTestId of practiceTestIds) {
        practiceTestQuestionIds.get(practiceTestId).add(replacementId)
      }
    }

    return {
      ...row,
      practiceRefs: refs,
      replacementId,
    }
  })

  const summary = {
    jsonlPath,
    applyMode: APPLY,
    activeFailCount: activeFailRows.length,
    referencedFailCount: plan.filter((item) => item.practiceRefs.length > 0).length,
    unreferencedFailCount: plan.filter((item) => item.practiceRefs.length === 0).length,
    mappedReferencedCount: plan.filter((item) => item.practiceRefs.length > 0 && item.replacementId).length,
    unmappedReferencedCount: plan.filter((item) => item.practiceRefs.length > 0 && !item.replacementId).length,
    failCodeCounts: plan.reduce((accumulator, item) => {
      item.failCodes.forEach((code) => {
        accumulator[code] = (accumulator[code] || 0) + 1
      })
      return accumulator
    }, {}),
    samples: plan.slice(0, 10).map((item) => ({
      id: item.id,
      moduleType: item.moduleType,
      category: item.category,
      subtopic: item.subtopic,
      failCodes: item.failCodes,
      practiceRefCount: item.practiceRefs.length,
      replacementId: item.replacementId,
    })),
  }

  console.log(JSON.stringify(summary, null, 2))

  if (!APPLY) {
    console.log('\nDry run only. Re-run with AUDIT_FAIL_REPAIR_APPLY=true to apply changes.')
    return
  }

  const unreferencedIds = plan.filter((item) => item.practiceRefs.length === 0).map((item) => item.id)
  let retired = 0
  let remapped = 0

  for (const idChunk of chunk(unreferencedIds, 1000)) {
    const result = await prisma.question.updateMany({
      where: {
        id: { in: idChunk },
      },
      data: {
        isActive: false,
        isReserved: false,
        reviewStatus: 'rejected',
        reviewComments: `Retired by current audit fail cleanup from ${path.basename(jsonlPath)}. No practice test references.`,
      },
    })

    retired += result.count
  }

  for (const item of plan.filter((entry) => entry.practiceRefs.length > 0)) {
    if (!item.replacementId) {
      throw new Error(`No replacement available for referenced fail ${item.id}`)
    }

    await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: item.replacementId },
        data: { isReserved: true },
      })

      await tx.practiceTestQuestion.updateMany({
        where: { questionId: item.id },
        data: { questionId: item.replacementId },
      })

      await tx.question.update({
        where: { id: item.id },
        data: {
          isActive: false,
          isReserved: false,
          reviewStatus: 'rejected',
          reviewComments: `Retired by current audit fail cleanup from ${path.basename(jsonlPath)}. Replacement: ${item.replacementId}`,
        },
      })
    })

    retired += 1
    remapped += item.practiceRefs.length
  }

  console.log(JSON.stringify({ retired, remapped }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })