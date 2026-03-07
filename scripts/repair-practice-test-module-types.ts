import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PTQRow {
  id: string
  moduleIndex: number
  orderIndex: number
  question: {
    moduleType: string
  }
}

function splitInHalf<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2)
  return [items.slice(0, mid), items.slice(mid)]
}

async function repairPracticeTest(practiceTestId: string, name: string) {
  const rows = await prisma.practiceTestQuestion.findMany({
    where: { practiceTestId },
    select: {
      id: true,
      moduleIndex: true,
      orderIndex: true,
      question: {
        select: {
          moduleType: true
        }
      }
    },
    orderBy: { orderIndex: 'asc' }
  }) as PTQRow[]

  const readingWriting = rows.filter(r => r.question.moduleType === 'reading-writing')
  const math = rows.filter(r => r.question.moduleType === 'math')
  const unknown = rows.filter(r => r.question.moduleType !== 'reading-writing' && r.question.moduleType !== 'math')

  if (unknown.length > 0) {
    throw new Error(`Practice test ${name} has ${unknown.length} questions with unknown moduleType`) 
  }

  const [rwModule0, rwModule1] = splitInHalf(readingWriting)
  const [mathModule2, mathModule3] = splitInHalf(math)

  const beforeModuleCounts = rows.reduce<Record<number, number>>((acc, row) => {
    acc[row.moduleIndex as number] = (acc[row.moduleIndex as number] || 0) + 1
    return acc
  }, {})

  let nextOrder = 0
  const updates: Array<{ id: string; moduleIndex: number; orderIndex: number }> = []

  for (const row of rwModule0) updates.push({ id: row.id, moduleIndex: 0, orderIndex: nextOrder++ })
  for (const row of rwModule1) updates.push({ id: row.id, moduleIndex: 1, orderIndex: nextOrder++ })
  for (const row of mathModule2) updates.push({ id: row.id, moduleIndex: 2, orderIndex: nextOrder++ })
  for (const row of mathModule3) updates.push({ id: row.id, moduleIndex: 3, orderIndex: nextOrder++ })

  await prisma.$transaction(
    updates.map(u =>
      prisma.practiceTestQuestion.update({
        where: { id: u.id },
        data: {
          moduleIndex: u.moduleIndex,
          orderIndex: u.orderIndex
        }
      })
    )
  )

  const afterModuleCounts = {
    0: rwModule0.length,
    1: rwModule1.length,
    2: mathModule2.length,
    3: mathModule3.length,
  }

  console.log(`[repair] ${name}: total=${rows.length} rw=${readingWriting.length} math=${math.length}`)
  console.log(`[repair] ${name}: beforeModuleCounts=${JSON.stringify(beforeModuleCounts)} afterModuleCounts=${JSON.stringify(afterModuleCounts)}`)
}

async function main() {
  const tests = await prisma.practiceTest.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' }
  })

  if (tests.length === 0) {
    console.log('[repair] No practice tests found.')
    return
  }

  for (const test of tests) {
    await repairPracticeTest(test.id, test.name)
  }

  console.log('[repair] Completed moduleType -> moduleIndex repair for all practice tests.')
}

main()
  .catch((error) => {
    console.error('[repair] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
