/**
 * Fix answer-leaking bracket questions
 * 
 * Replaces [answer text] in passages with _______ blanks.
 * Questions that already use [_____] or [____] blanks are left untouched.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const questions = await prisma.question.findMany({
    where: {
      passage: { not: null },
      isActive: true,
    },
    select: {
      id: true,
      passage: true,
      options: true,
      correctAnswer: true,
      question: true,
    },
  });

  const bracketQuestions = questions.filter(q => q.passage && /\[.*?\]/.test(q.passage));

  // Separate into answer-leaking vs. proper blanks
  const blankPattern = /^\[_+\]$/;
  const leakingQuestions = [];
  const safeQuestions = [];

  for (const q of bracketQuestions) {
    const matches = q.passage.match(/\[.*?\]/g) || [];
    const allBlanks = matches.every(m => blankPattern.test(m));
    if (allBlanks) {
      safeQuestions.push(q);
    } else {
      leakingQuestions.push(q);
    }
  }

  console.log(`Total bracket questions: ${bracketQuestions.length}`);
  console.log(`Safe (using [____] blanks): ${safeQuestions.length}`);
  console.log(`Answer-leaking (needs fix): ${leakingQuestions.length}`);
  console.log('');

  let fixed = 0;
  let errors = 0;

  for (const q of leakingQuestions) {
    // Replace all bracket content with _______
    const newPassage = q.passage.replace(/\[.*?\]/g, '_______');
    
    try {
      await prisma.question.update({
        where: { id: q.id },
        data: { passage: newPassage },
      });
      fixed++;
      console.log(`✅ Fixed: ${q.id}`);
      console.log(`   Before: ...${q.passage.substring(q.passage.indexOf('[') - 20, q.passage.indexOf('[') + 50)}...`);
      console.log(`   After:  ...${newPassage.substring(newPassage.indexOf('_______') - 20, newPassage.indexOf('_______') + 30)}...`);
    } catch (e) {
      errors++;
      console.error(`❌ Failed: ${q.id} - ${e.message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Safe (no change needed): ${safeQuestions.length}`);

  // Verify no brackets remain (except [____] blanks)
  const verifyCount = await prisma.question.count({
    where: {
      isActive: true,
      passage: { not: null },
    },
  });
  
  const remaining = await prisma.question.findMany({
    where: {
      isActive: true,
      passage: { not: null },
    },
    select: { id: true, passage: true },
  });
  
  const stillBracketed = remaining.filter(q => {
    const matches = q.passage.match(/\[.*?\]/g) || [];
    return matches.some(m => !blankPattern.test(m));
  });

  console.log(`\nVerification: ${stillBracketed.length} questions still have answer-leaking brackets`);
  if (stillBracketed.length > 0) {
    for (const q of stillBracketed) {
      console.log(`  ⚠️  ${q.id}: ${q.passage.match(/\[.*?\]/g)}`);
    }
  }

  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
