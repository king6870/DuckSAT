import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const tests = await p.practiceTest.findMany({ orderBy: { name: 'asc' } })
  const testQs: Map<string, Set<string>> = new Map()

  for (const t of tests) {
    const qs = await p.practiceTestQuestion.findMany({ where: { practiceTestId: t.id }, select: { questionId: true } })
    testQs.set(t.name, new Set(qs.map(q => q.questionId)))
  }

  // Cross-check every pair
  const names = [...testQs.keys()]
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = testQs.get(names[i])!
      const b = testQs.get(names[j])!
      const overlap = [...a].filter(id => b.has(id)).length
      if (overlap > 0) {
        console.log(`${names[i]} ↔ ${names[j]}: ${overlap} shared questions`)
      }
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect())
