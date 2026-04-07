import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.practiceTest.findMany({
  select: { name: true, isPublished: true, _count: { select: { questions: true } } },
  orderBy: { createdAt: 'asc' }
}).then(ts => {
  console.log(`Total: ${ts.length}`)
  ts.forEach(t => console.log(`${t.isPublished ? '✓' : '✗'} ${t.name} | ${t._count.questions}q`))
}).finally(() => p.$disconnect())
