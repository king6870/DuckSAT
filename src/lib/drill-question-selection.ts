import 'server-only'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export interface DrillNoRepeatSelectionResult {
  questionIds: string[]
  scopeKey: string
  cycleNumber: number
  rolledCycle: boolean
  totalCandidates: number
}

interface SelectNoRepeatQuestionsInput {
  userId: string
  scopeKey: string
  where: Prisma.QuestionWhereInput
  count: number
  orderBy?: Prisma.QuestionOrderByWithRelationInput | Prisma.QuestionOrderByWithRelationInput[]
}

function normalizeScopeValue(value: string | null | undefined): string {
  return (value || 'any').toLowerCase().trim() || 'any'
}

export function buildDrillScopeKey(input: {
  moduleType?: string | null
  category?: string | null
  difficulty?: string | null
}): string {
  return [
    normalizeScopeValue(input.moduleType),
    normalizeScopeValue(input.category),
    normalizeScopeValue(input.difficulty),
  ].join('|')
}

export async function selectNoRepeatDrillQuestions(
  input: SelectNoRepeatQuestionsInput,
): Promise<DrillNoRepeatSelectionResult> {
  return prisma.$transaction(async (tx) => {
    const scopeState = await tx.drillScopeState.upsert({
      where: {
        userId_scopeKey: {
          userId: input.userId,
          scopeKey: input.scopeKey,
        },
      },
      update: {},
      create: {
        userId: input.userId,
        scopeKey: input.scopeKey,
        cycleNumber: 1,
      },
      select: {
        cycleNumber: true,
      },
    })

    const candidateRows = await tx.question.findMany({
      where: input.where,
      select: { id: true },
      orderBy: input.orderBy || { createdAt: 'desc' },
    })

    const candidateIds = candidateRows.map((row) => row.id)
    if (candidateIds.length === 0) {
      return {
        questionIds: [],
        scopeKey: input.scopeKey,
        cycleNumber: scopeState.cycleNumber,
        rolledCycle: false,
        totalCandidates: 0,
      }
    }

    const exposureRows = await tx.drillQuestionExposure.findMany({
      where: {
        userId: input.userId,
        scopeKey: input.scopeKey,
        cycleNumber: scopeState.cycleNumber,
        questionId: { in: candidateIds },
      },
      select: {
        questionId: true,
      },
    })

    const seenIds = new Set(exposureRows.map((row) => row.questionId))
    const unseenIds = candidateIds.filter((id) => !seenIds.has(id))

    const selectedCurrentCycleIds = unseenIds.slice(0, input.count)
    let selectedIds = [...selectedCurrentCycleIds]
    let cycleNumber = scopeState.cycleNumber
    let rolledCycle = false

    if (selectedIds.length < input.count) {
      cycleNumber = scopeState.cycleNumber + 1
      rolledCycle = true

      await tx.drillScopeState.update({
        where: {
          userId_scopeKey: {
            userId: input.userId,
            scopeKey: input.scopeKey,
          },
        },
        data: {
          cycleNumber,
          lastCompletedCycleAt: new Date(),
        },
      })

      const alreadySelected = new Set(selectedIds)
      const refillCandidates = candidateIds.filter((id) => !alreadySelected.has(id))
      const remaining = input.count - selectedIds.length
      selectedIds = [...selectedIds, ...refillCandidates.slice(0, remaining)]
    }

    if (selectedCurrentCycleIds.length > 0) {
      await tx.drillQuestionExposure.createMany({
        data: selectedCurrentCycleIds.map((questionId) => ({
          userId: input.userId,
          questionId,
          scopeKey: input.scopeKey,
          cycleNumber: scopeState.cycleNumber,
          source: 'drill',
        })),
      })
    }

    if (rolledCycle) {
      const selectedNextCycleIds = selectedIds.slice(selectedCurrentCycleIds.length)
      if (selectedNextCycleIds.length > 0) {
        await tx.drillQuestionExposure.createMany({
          data: selectedNextCycleIds.map((questionId) => ({
            userId: input.userId,
            questionId,
            scopeKey: input.scopeKey,
            cycleNumber,
            source: 'drill',
          })),
        })
      }
    }

    return {
      questionIds: selectedIds,
      scopeKey: input.scopeKey,
      cycleNumber,
      rolledCycle,
      totalCandidates: candidateIds.length,
    }
  })
}
