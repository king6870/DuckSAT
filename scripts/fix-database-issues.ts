import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabaseIssues() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              Fixing Database Quality Issues                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let fixesApplied = 0;

  // Issue 1: Remove mismatched diagrams from questions that don't reference them
  console.log('[1/3] 🔧 Removing mismatched diagrams from questions...');
  
  const questionsWithDiagrams = await prisma.question.findMany({
    where: { imageData: { not: null } },
    select: {
      id: true,
      question: true,
      imageData: true
    }
  });

  for (const q of questionsWithDiagrams) {
    const mentionsDiagram = /diagram|figure|graph|chart|shown|above|below|illustration|picture|image/i.test(q.question);
    
    if (!mentionsDiagram) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          imageData: null,
          imageMimeType: null,
          chartData: null
        }
      });
      fixesApplied++;
      console.log(`  ✓ Removed diagram from question ${q.id.substring(0, 8)}... (no diagram reference)`);
    }
  }

  console.log(`  Removed diagrams from ${fixesApplied} questions\n`);

  // Issue 2: Delete reading questions without passages
  console.log('[2/3] 🔧 Removing reading questions without passages...');
  
  const invalidReadingQuestions = await prisma.question.findMany({
    where: {
      moduleType: 'reading-writing',
      passage: null
    },
    select: {
      id: true,
      question: true
    }
  });

  let deletedCount = 0;
  for (const q of invalidReadingQuestions) {
    await prisma.question.delete({
      where: { id: q.id }
    });
    deletedCount++;
    console.log(`  ✓ Deleted invalid reading question ${q.id.substring(0, 8)}... (missing passage)`);
  }

  console.log(`  Deleted ${deletedCount} invalid reading questions\n`);

  // Issue 3: Ensure all questions have proper formatting
  console.log('[3/3] 🔧 Validating question formatting...');
  
  const allQuestions = await prisma.question.findMany({
    select: {
      id: true,
      question: true,
      options: true,
      correctAnswer: true,
      explanation: true
    }
  });

  let validationFixes = 0;
  for (const q of allQuestions) {
    const updates: any = {};
    let needsUpdate = false;

    // Ensure options is an array of exactly 4 items
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      console.log(`  ⚠️  Warning: Question ${q.id.substring(0, 8)} has ${q.options?.length || 0} options (expected 4)`);
    }

    // Ensure correctAnswer is within bounds
    if (q.correctAnswer < 0 || q.correctAnswer >= (q.options?.length || 4)) {
      console.log(`  ⚠️  Warning: Question ${q.id.substring(0, 8)} has invalid correctAnswer: ${q.correctAnswer}`);
    }

    // Ensure explanation exists
    if (!q.explanation || q.explanation.length < 10) {
      console.log(`  ⚠️  Warning: Question ${q.id.substring(0, 8)} has short/missing explanation`);
    }

    if (needsUpdate) {
      await prisma.question.update({
        where: { id: q.id },
        data: updates
      });
      validationFixes++;
    }
  }

  console.log(`  Validated all questions\n`);

  // Summary
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        Fix Summary                            ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Diagrams removed (mismatched):   ${String(fixesApplied).padStart(3)}                      ║`);
  console.log(`║  Questions deleted (no passage):  ${String(deletedCount).padStart(3)}                      ║`);
  console.log(`║  Validation fixes applied:        ${String(validationFixes).padStart(3)}                      ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Show updated stats
  const totalQuestions = await prisma.question.count();
  const mathQuestions = await prisma.question.count({ where: { moduleType: 'math' } });
  const readingQuestions = await prisma.question.count({ where: { moduleType: 'reading-writing' } });
  const questionsWithValidDiagrams = await prisma.question.count({ where: { imageData: { not: null } } });

  console.log('📊 Updated Database Status:');
  console.log(`  Total Questions: ${totalQuestions}`);
  console.log(`  Math Questions: ${mathQuestions}`);
  console.log(`  Reading Questions: ${readingQuestions}`);
  console.log(`  Questions with Diagrams: ${questionsWithValidDiagrams}`);
  console.log('\n✅ All fixes applied successfully!\n');

  await prisma.$disconnect();
}

fixDatabaseIssues().catch(console.error);
