import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteCorruptedQuestions() {
  console.log('🔍 Finding corrupted questions...\n');

  // Get all active questions
  const questions = await prisma.question.findMany({
    where: { isActive: true },
    select: {
      id: true,
      question: true,
      explanation: true,
      options: true,
      passage: true,
      wrongAnswerExplanations: true,
    },
  });

  const corruptedIds: string[] = [];
  const errors: { id: string; field: string; issue: string }[] = [];

  for (const q of questions) {
    const fields = [
      { name: 'question', value: q.question },
      { name: 'explanation', value: q.explanation },
      { name: 'options', value: q.options },
      { name: 'passage', value: q.passage },
      { name: 'wrongAnswerExplanations', value: q.wrongAnswerExplanations },
    ];

    for (const field of fields) {
      if (!field.value) continue;

      const text = typeof field.value === 'string' ? field.value : JSON.stringify(field.value);

      // Check for control characters
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
        errors.push({ id: q.id, field: field.name, issue: 'Control characters' });
        if (!corruptedIds.includes(q.id)) corruptedIds.push(q.id);
        continue;
      }

      // Check for double backslashes before LaTeX commands
      if (/\\\\[a-zA-Z]/.test(text)) {
        errors.push({ id: q.id, field: field.name, issue: 'Double backslashes' });
        if (!corruptedIds.includes(q.id)) corruptedIds.push(q.id);
        continue;
      }

      // Extract LaTeX expressions
      const dollarMatches = text.match(/\$[^$]+\$/g) || [];
      const doubleDollarMatches = text.match(/\$\$[^$]+\$\$/g) || [];
      const allExpressions = [...dollarMatches, ...doubleDollarMatches];

      if (allExpressions.length === 0) continue;

      // Try to parse with KaTeX
      const katex = await import('katex');
      for (const expr of allExpressions) {
        const latex = expr.replace(/^\$+|\$+$/g, '');
        try {
          katex.renderToString(latex, { throwOnError: true });
        } catch (e: any) {
          errors.push({ 
            id: q.id, 
            field: field.name, 
            issue: `KaTeX error: ${e.message.substring(0, 50)}` 
          });
          if (!corruptedIds.includes(q.id)) corruptedIds.push(q.id);
          break;
        }
      }
    }
  }

  console.log(`Found ${corruptedIds.length} corrupted questions:\n`);
  errors.forEach(e => {
    console.log(`  - ${e.id} (${e.field}): ${e.issue}`);
  });

  if (corruptedIds.length === 0) {
    console.log('\n✅ No corrupted questions found!');
    return;
  }

  console.log(`\n⚠️  About to delete ${corruptedIds.length} questions. Proceed? (Press Ctrl+C to cancel)\n`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Delete corrupted questions
  const result = await prisma.question.deleteMany({
    where: { id: { in: corruptedIds } },
  });

  console.log(`\n✅ Deleted ${result.count} corrupted questions`);
  console.log(`Remaining active questions: ${questions.length - result.count}`);
}

deleteCorruptedQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
