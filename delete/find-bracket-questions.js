const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Find all questions with passages containing square brackets
  const questions = await prisma.question.findMany({
    where: {
      passage: { not: null },
      isActive: true,
    },
    select: {
      id: true,
      question: true,
      passage: true,
      options: true,
      correctAnswer: true,
      moduleType: true,
      category: true,
      subtopic: true,
      difficulty: true,
    },
  });

  const bracketQuestions = questions.filter(q => q.passage && /\[.*?\]/.test(q.passage));
  
  console.log(`Total active questions with passages: ${questions.length}`);
  console.log(`Questions with square brackets in passages: ${bracketQuestions.length}`);
  console.log('\n--- Questions with brackets ---\n');

  for (const q of bracketQuestions) {
    const matches = q.passage.match(/\[.*?\]/g);
    const options = JSON.parse(q.options);
    const correctOption = options[q.correctAnswer];
    
    console.log(`ID: ${q.id}`);
    console.log(`Category: ${q.category} | Subtopic: ${q.subtopic} | Difficulty: ${q.difficulty}`);
    console.log(`Module: ${q.moduleType}`);
    console.log(`Bracket text: ${matches.join(' | ')}`);
    console.log(`Correct answer (index ${q.correctAnswer}): ${correctOption}`);
    
    // Check if bracket text matches or contains the correct answer
    const bracketText = matches.map(m => m.replace(/[\[\]]/g, '').trim().toLowerCase());
    const correctLower = correctOption.toLowerCase().replace(/^[a-d]\)\s*/, '');
    const leaks = bracketText.some(bt => 
      bt === correctLower || 
      correctLower.includes(bt) || 
      bt.includes(correctLower)
    );
    console.log(`ANSWER LEAKED: ${leaks ? 'YES ⚠️' : 'no'}`);
    console.log(`Passage (first 200): ${q.passage.substring(0, 200)}...`);
    console.log('---');
  }

  // Also check practice test questions specifically
  const ptQuestions = await prisma.$queryRawUnsafe(`
    SELECT q.id, q.passage, q.options, q.correctAnswer, q.category, q.subtopic, ptq.practiceTestId, ptq.moduleIndex
    FROM practice_test_questions ptq
    JOIN questions q ON ptq.questionId = q.id
    WHERE q.passage IS NOT NULL AND q.passage LIKE '%[%]%'
    ORDER BY ptq.practiceTestId, ptq.moduleIndex, ptq.orderIndex
  `);
  
  console.log(`\n\n=== Practice test questions with brackets: ${ptQuestions.length} ===`);
  for (const q of ptQuestions) {
    const matches = q.passage.match(/\[.*?\]/g);
    console.log(`PT: ${q.practiceTestId} | Module: ${q.moduleIndex} | ID: ${q.id} | Bracket: ${matches ? matches.join(' | ') : 'none'}`);
  }

  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
