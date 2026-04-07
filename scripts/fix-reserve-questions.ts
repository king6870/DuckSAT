import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function run() {
  const rows = await prisma.practiceTestQuestion.findMany({ select: { questionId: true } })
  const ids = [...new Set(rows.map(r => r.questionId))]
  console.log('Marking', ids.length, 'questions as reserved...')
  const CHUNK = 500
  for (let i = 0; i < ids.length; i += CHUNK) {
    await prisma.question.updateMany({ where: { id: { in: ids.slice(i, i + CHUNK) } }, data: { isReserved: true } })
    process.stdout.write('\r  ' + Math.min(i + CHUNK, ids.length) + '/' + ids.length + '  ')
  }
  console.log('\nDone.')
}
run().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
