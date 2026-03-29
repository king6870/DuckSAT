import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const all = await p.practiceTestQuestion.findMany({ select: { practiceTestId: true, questionId: true } })
  const byQ = new Map<string, string[]>()
  for (const a of all) {
    if (!byQ.has(a.questionId)) byQ.set(a.questionId, [])
    byQ.get(a.questionId)!.push(a.practiceTestId)
  }
  let dupes = 0
  for (const [, tests] of byQ) {
    if (tests.length > 1) dupes++
  }
  console.log('Questions appearing in multiple tests:', dupes)

  const tests = await p.practiceTest.findMany({ orderBy: { name: 'asc' } })
  for (const t of tests) {
    const qs = await p.practiceTestQuestion.findMany({ where: { practiceTestId: t.id }, select: { questionId: true } })
    const ids = new Set(qs.map(q => q.questionId))
    console.log(`${t.name}: ${qs.length} rows, ${ids.size} unique`)
  }
}

main().catch(console.error).finally(() => p.$disconnect())
