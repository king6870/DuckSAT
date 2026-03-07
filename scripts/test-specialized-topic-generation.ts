import { SAT_TOPICS } from '@/data/sat-topics'
import { UnifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

async function main() {
  const generator = new UnifiedQuestionGenerator()
  const failures: string[] = []

  console.log('🧪 Specialized Topic Generation Test')
  console.log(`Testing ${SAT_TOPICS.length} topics...\n`)

  for (const topic of SAT_TOPICS) {
    const plan = generator.buildGenerationPlan({
      specializedMode: true,
      moduleType: topic.moduleType,
      specificTopics: [topic.id],
      mathCount: topic.moduleType === 'math' ? Math.min(3, topic.subtopics.length) : 0,
      readingCount: topic.moduleType === 'reading-writing' ? Math.min(3, topic.subtopics.length) : 0,
      storeInDatabase: false,
      enableRetry: false,
      enableValidation: false
    })

    const selected = topic.moduleType === 'math' ? plan.mathSubtopics : plan.readingSubtopics

    if (selected.length === 0) {
      failures.push(`${topic.id}: no subtopics selected`)
      continue
    }

    const wrongTopic = selected.filter(s => s.topicId !== topic.id)
    if (wrongTopic.length > 0) {
      failures.push(`${topic.id}: selected subtopics outside topic (${wrongTopic.map(s => s.id).join(', ')})`)
    }

    const wrongModule = selected.filter(s => s.moduleType !== topic.moduleType)
    if (wrongModule.length > 0) {
      failures.push(`${topic.id}: selected subtopics with wrong moduleType`)
    }

    console.log(`✅ ${topic.name} (${topic.id}) -> ${selected.length} specialized subtopic(s)`)
  }

  // Subtopic-level specialization checks (sample first 10)
  console.log('\n🔍 Subtopic specialization spot-check...')
  const allSubtopics = SAT_TOPICS.flatMap(t => t.subtopics.map(s => ({ topic: t, subtopic: s })))

  for (const { topic, subtopic } of allSubtopics.slice(0, 10)) {
    const plan = generator.buildGenerationPlan({
      specializedMode: true,
      moduleType: topic.moduleType,
      specificSubtopics: [subtopic.id],
      mathCount: 3,
      readingCount: 3,
      storeInDatabase: false
    })

    const selected = topic.moduleType === 'math' ? plan.mathSubtopics : plan.readingSubtopics
    const allAreExact = selected.every(s => s.id === subtopic.id)
    if (!allAreExact) {
      failures.push(`subtopic ${subtopic.id}: plan included other subtopics`)
    }
  }

  if (failures.length > 0) {
    console.error('\n❌ Specialized generation tests failed:')
    failures.forEach(f => console.error(`  - ${f}`))
    process.exit(1)
  }

  console.log('\n🎉 All specialized generation tests passed.')
}

main().catch((error) => {
  console.error('❌ Test run failed:', error)
  process.exit(1)
})
