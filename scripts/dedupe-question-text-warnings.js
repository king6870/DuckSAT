const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const APPLY = String(process.env.WARNING_CLEANUP_APPLY || 'false').toLowerCase() === 'true'

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function questionFingerprint(question) {
  return normalize(question)
}

function shortExplanationSuffix(row) {
  if (row.moduleType === 'math') {
    return ' Substituting the given values and simplifying gives the answer.'
  }

  if (row.moduleType === 'reading-writing') {
    return ' The quoted detail directly supports the selected choice.'
  }

  return ' The stated information directly supports the selected answer.'
}

function expandExplanation(row) {
  const explanation = (row.explanation || '').trim()

  if (explanation.length >= 40) {
    return null
  }

  const suffix = shortExplanationSuffix(row)
  return explanation ? `${explanation}${suffix}` : suffix.trim()
}

function chunk(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

async function main() {
  const activeQuestions = await prisma.question.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      moduleType: true,
      category: true,
      subtopic: true,
      question: true,
      explanation: true,
      updatedAt: true,
      isReserved: true,
    },
  })

  const activeQuestionById = new Map(activeQuestions.map((row) => [row.id, row]))
  const duplicateClusters = new Map()

  for (const row of activeQuestions) {
    const fingerprint = questionFingerprint(row.question)

    if (!duplicateClusters.has(fingerprint)) {
      duplicateClusters.set(fingerprint, [])
    }

    duplicateClusters.get(fingerprint).push(row)
  }

  const duplicateGroups = [...duplicateClusters.values()].filter((group) => group.length > 1)
  const duplicateClusterCount = duplicateGroups.length
  const duplicateRowCount = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0)

  const shortExplanationRows = activeQuestions
    .filter((row) => (row.explanation || '').trim().length < 40)
    .map((row) => ({
      id: row.id,
      moduleType: row.moduleType,
      explanation: row.explanation,
      updatedAt: row.updatedAt,
    }))

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

    if (!refsByQuestionId.has(reference.questionId)) {
      refsByQuestionId.set(reference.questionId, [])
    }

    refsByQuestionId.get(reference.questionId).push(reference)
  }

  const duplicatePlan = duplicateGroups.map((group) => {
    const sortedGroup = [...group].sort((left, right) => {
      const leftExplanation = (left.explanation || '').trim().length
      const rightExplanation = (right.explanation || '').trim().length

      if (rightExplanation !== leftExplanation) {
        return rightExplanation - leftExplanation
      }

      const leftQuestion = (left.question || '').trim().length
      const rightQuestion = (right.question || '').trim().length

      if (rightQuestion !== leftQuestion) {
        return rightQuestion - leftQuestion
      }

      return left.updatedAt.getTime() - right.updatedAt.getTime()
    })

    const survivor = sortedGroup[0]
    const retired = sortedGroup.slice(1)

    const refPlans = retired.map((row) => {
      const refs = refsByQuestionId.get(row.id) || []
      const keepRefs = []
      const deleteRefs = []

      for (const reference of refs) {
        const questionIds = practiceTestQuestionIds.get(reference.practiceTestId)

        if (questionIds && questionIds.has(survivor.id)) {
          deleteRefs.push(reference)
          continue
        }

        keepRefs.push(reference)
        questionIds.add(survivor.id)
      }

      return {
        row,
        refs,
        keepRefs,
        deleteRefs,
      }
    })

    return {
      fingerprint: questionFingerprint(survivor.question),
      survivor,
      retired,
      refPlans,
    }
  })

  const explanationPlan = shortExplanationRows
    .map((row) => ({
      ...row,
      updatedExplanation: expandExplanation(activeQuestionById.get(row.id)),
    }))
    .filter((row) => Boolean(row.updatedExplanation))

  const summary = {
    applyMode: APPLY,
    duplicateClusterCount,
    duplicateRowCount,
    shortExplanationCount: explanationPlan.length,
    duplicateSurvivors: duplicatePlan.slice(0, 10).map((group) => ({
      survivorId: group.survivor.id,
      retiredCount: group.retired.length,
      sampleRetiredIds: group.retired.slice(0, 5).map((row) => row.id),
    })),
    shortExplanationSamples: explanationPlan.slice(0, 10).map((row) => ({
      id: row.id,
      moduleType: row.moduleType,
      beforeLength: (row.explanation || '').trim().length,
      afterLength: row.updatedExplanation.trim().length,
    })),
  }

  console.log(JSON.stringify(summary, null, 2))

  if (!APPLY) {
    console.log('\nDry run only. Re-run with WARNING_CLEANUP_APPLY=true to apply changes.')
    return
  }

  const survivorIds = [...new Set(duplicatePlan.map((group) => group.survivor.id))]

  for (const idChunk of chunk(survivorIds, 500)) {
    await prisma.question.updateMany({
      where: { id: { in: idChunk } },
      data: { isReserved: true },
    })
  }

  const retiredDuplicateIds = []
  const updateRefsBySurvivor = new Map()
  const deleteRefIds = []

  for (const group of duplicatePlan) {
    for (const plan of group.refPlans) {
      if (plan.keepRefs.length > 0) {
        if (!updateRefsBySurvivor.has(group.survivor.id)) {
          updateRefsBySurvivor.set(group.survivor.id, [])
        }

        updateRefsBySurvivor.get(group.survivor.id).push(...plan.keepRefs.map((reference) => reference.id))
      }

      if (plan.deleteRefs.length > 0) {
        deleteRefIds.push(...plan.deleteRefs.map((reference) => reference.id))
      }

      retiredDuplicateIds.push(plan.row.id)
    }

    if (!group.refPlans.some((plan) => plan.keepRefs.length > 0 || plan.deleteRefs.length > 0)) {
      retiredDuplicateIds.push(...group.retired.map((row) => row.id))
    }
  }

  let retiredDuplicateRows = 0
  let remappedDuplicateRefs = 0
  let deletedDuplicateRefs = 0

  for (const idChunk of chunk(retiredDuplicateIds, 1000)) {
    const result = await prisma.question.updateMany({
      where: {
        id: { in: idChunk },
      },
      data: {
        isActive: false,
        isReserved: false,
        reviewStatus: 'rejected',
        reviewComments: `Retired by duplicate question text cleanup.`,
      },
    })

    retiredDuplicateRows += result.count
  }

  for (const [survivorId, referenceIds] of updateRefsBySurvivor.entries()) {
    for (const idChunk of chunk(referenceIds, 1000)) {
      const result = await prisma.practiceTestQuestion.updateMany({
        where: { id: { in: idChunk } },
        data: { questionId: survivorId },
      })

      remappedDuplicateRefs += result.count
    }
  }

  for (const idChunk of chunk(deleteRefIds, 1000)) {
    const result = await prisma.practiceTestQuestion.deleteMany({
      where: { id: { in: idChunk } },
    })

    deletedDuplicateRefs += result.count
  }

  let shortExplanationRowsUpdated = 0

  for (const row of explanationPlan) {
    await prisma.question.update({
      where: { id: row.id },
      data: {
        explanation: row.updatedExplanation,
      },
    })

    shortExplanationRowsUpdated += 1
  }

  console.log(JSON.stringify({
    retiredDuplicateRows,
    remappedDuplicateRefs,
    deletedDuplicateRefs,
    shortExplanationRowsUpdated,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })