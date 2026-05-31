const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const APPLY = String(process.env.READING_HARD_FAIL_REPAIR_APPLY || 'false').toLowerCase() === 'true'

const OMISSION = /\.\.\.|…|\[omitted\]|\(omitted\)|\[excerpt\]|abridged|truncated/i
const FULL = new Set([
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

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function countWords(text) {
  return (text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function isBad(row) {
  const passage = (row.passage || '').trim()
  const needsFullPassage = FULL.has(normalize(row.category)) || FULL.has(normalize(row.subtopic))

  if (!needsFullPassage) {
    return false
  }

  if (!passage) {
    return true
  }

  if (OMISSION.test(passage)) {
    return true
  }

  return countWords(passage) < 150
}

function buildKey(category, subtopic) {
  return `${normalize(category)}::${normalize(subtopic)}`
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

function chunk(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

async function main() {
  const rows = await prisma.question.findMany({
    where: {
      isActive: true,
      moduleType: 'reading-writing',
    },
    select: {
      id: true,
      category: true,
      subtopic: true,
      passage: true,
      isReserved: true,
    },
  })

  const bad = rows.filter(isBad)
  const good = rows.filter((row) => !isBad(row) && countWords(row.passage) > 0)

  const references = await prisma.practiceTestQuestion.findMany({
    select: {
      id: true,
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

  const exactPools = new Map()
  const categoryPools = new Map()
  const fallbackPool = { ids: good.map((row) => row.id), index: 0 }

  for (const row of good) {
    const exactKey = buildKey(row.category, row.subtopic)
    const categoryKey = normalize(row.category)

    if (!exactPools.has(exactKey)) {
      exactPools.set(exactKey, { ids: [], index: 0 })
    }
    exactPools.get(exactKey).ids.push(row.id)

    if (!categoryPools.has(categoryKey)) {
      categoryPools.set(categoryKey, { ids: [], index: 0 })
    }
    categoryPools.get(categoryKey).ids.push(row.id)
  }

  const plan = bad.map((row) => {
    const refs = refsByQuestionId.get(row.id) || []
    const exactKey = buildKey(row.category, row.subtopic)
    const categoryKey = normalize(row.category)
    const practiceTestIds = [...new Set(refs.map((reference) => reference.practiceTestId))]
    const replacementId = refs.length === 0
      ? null
      : nextCompatibleCandidate(exactPools.get(exactKey), practiceTestIds, practiceTestQuestionIds)
        || nextCompatibleCandidate(categoryPools.get(categoryKey), practiceTestIds, practiceTestQuestionIds)
        || nextCompatibleCandidate(fallbackPool, practiceTestIds, practiceTestQuestionIds)

    if (replacementId) {
      for (const practiceTestId of practiceTestIds) {
        practiceTestQuestionIds.get(practiceTestId).add(replacementId)
      }
    }

    return {
      id: row.id,
      category: row.category,
      subtopic: row.subtopic,
      practiceRefs: refs,
      replacementId,
    }
  })

  const summary = {
    applyMode: APPLY,
    badCount: bad.length,
    goodCandidateCount: good.length,
    referencedBadCount: plan.filter((item) => item.practiceRefs.length > 0).length,
    unreferencedBadCount: plan.filter((item) => item.practiceRefs.length === 0).length,
    mappedReferencedCount: plan.filter((item) => item.practiceRefs.length > 0 && item.replacementId).length,
    unmappedReferencedCount: plan.filter((item) => item.practiceRefs.length > 0 && !item.replacementId).length,
    samples: plan.slice(0, 10).map((item) => ({
      id: item.id,
      category: item.category,
      subtopic: item.subtopic,
      practiceRefCount: item.practiceRefs.length,
      replacementId: item.replacementId,
    })),
  }

  console.log(JSON.stringify(summary, null, 2))

  if (!APPLY) {
    console.log('\nDry run only. Re-run with READING_HARD_FAIL_REPAIR_APPLY=true to apply changes.')
    return
  }

  let retired = 0
  let remapped = 0

  const unreferencedIds = plan
    .filter((item) => item.practiceRefs.length === 0)
    .map((item) => item.id)

  for (const idChunk of chunk(unreferencedIds, 1000)) {
    const result = await prisma.question.updateMany({
      where: {
        id: {
          in: idChunk,
        },
      },
      data: {
        isActive: false,
        isReserved: false,
        reviewStatus: 'rejected',
        reviewComments: 'Retired by hard-fail reading cleanup. No practice test references.',
      },
    })

    retired += result.count
    console.log(`Retired unreferenced questions: ${retired}/${unreferencedIds.length}`)
  }

  for (const item of plan.filter((entry) => entry.practiceRefs.length > 0)) {
    const reviewComment = item.replacementId
      ? `Retired by hard-fail reading cleanup. Replacement: ${item.replacementId}`
      : 'Retired by hard-fail reading cleanup. No practice test references.'

    await prisma.$transaction(async (tx) => {
      if (item.practiceRefs.length > 0) {
        if (!item.replacementId) {
          throw new Error(`No replacement available for referenced question ${item.id}`)
        }

        await tx.question.update({
          where: { id: item.replacementId },
          data: { isReserved: true },
        })

        await tx.practiceTestQuestion.updateMany({
          where: { questionId: item.id },
          data: { questionId: item.replacementId },
        })

        remapped += item.practiceRefs.length
      }

      await tx.question.update({
        where: { id: item.id },
        data: {
          isActive: false,
          isReserved: false,
          reviewStatus: 'rejected',
          reviewComments: reviewComment,
        },
      })
    })

    retired += 1

    if (retired % 100 === 0) {
      console.log(`Processed referenced questions: ${retired - unreferencedIds.length}/${plan.length - unreferencedIds.length}`)
    }
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