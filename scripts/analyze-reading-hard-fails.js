const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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
    },
  })

  const bad = rows.filter((row) => {
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
  })

  const referencedIds = new Set()

  for (const idChunk of chunk(bad.map((row) => row.id), 1000)) {
    const refs = await prisma.practiceTestQuestion.groupBy({
      by: ['questionId'],
      where: {
        questionId: {
          in: idChunk,
        },
      },
      _count: {
        _all: true,
      },
    })

    refs.forEach((row) => referencedIds.add(row.questionId))
  }

  console.log(JSON.stringify({
    badCount: bad.length,
    referencedBadCount: bad.filter((row) => referencedIds.has(row.id)).length,
    unreferencedBadCount: bad.filter((row) => !referencedIds.has(row.id)).length,
    samples: bad.slice(0, 10).map((row) => ({
      id: row.id,
      category: row.category,
      subtopic: row.subtopic,
      passageWordCount: countWords(row.passage),
    })),
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