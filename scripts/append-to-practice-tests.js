const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

// Practice test IDs (update with actual IDs from your database or setup script)
const PRACTICE_TEST_IDS = [
  'SAT_PRACTICE_TEST_1_ID',
  'SAT_PRACTICE_TEST_2_ID'
];

// Load all questions from batch files (update path as needed)
const batchDir = path.join(__dirname, '../generated-batches');
const batchFiles = fs.readdirSync(batchDir).filter(f => f.endsWith('.json'));
let uniqueQuestions = [];
for (const file of batchFiles) {
  const questions = JSON.parse(fs.readFileSync(path.join(batchDir, file), 'utf8'));
  uniqueQuestions = uniqueQuestions.concat(questions);
}

// Remove duplicates by question text
uniqueQuestions = uniqueQuestions.filter((q, idx, arr) => arr.findIndex(x => x.question === q.question) === idx);

// Track assigned questions globally
const assignedQuestions = new Set();

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function main() {
  for (const testId of PRACTICE_TEST_IDS) {
    console.log(`[Assignment] Processing practice test: ${testId}`);
    // Remove all previous assignments for this practice test
    await prisma.practiceTestQuestion.deleteMany({ where: { practiceTestId: testId } });
    console.log(`[Assignment] Cleared previous assignments for practice test: ${testId}`);

    // Filter out already assigned questions
    const availableQuestions = uniqueQuestions.filter(q => !assignedQuestions.has(q.question));
    console.log(`[Assignment] Available questions for ${testId}: ${availableQuestions.length}`);
    if (availableQuestions.length < 98) {
      console.error(`[Assignment] Not enough unique questions left for test ${testId}. Needed: 98, Found: ${availableQuestions.length}`);
      throw new Error(`Not enough unique questions left for test ${testId}. Needed: 98, Found: ${availableQuestions.length}`);
    }
    // Separate questions by moduleType and tags
    const mathQuestions = availableQuestions.filter(q => {
      const tags = Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : []);
      return q.moduleType === 'math' && tags.includes('math') && tags.includes(q.category);
    });
    const readingQuestions = availableQuestions.filter(q => {
      const tags = Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : []);
      return q.moduleType === 'reading-writing' && tags.includes('reading-writing') && tags.includes(q.category);
    });

    if (mathQuestions.length < 49 || readingQuestions.length < 49) {
      console.error(`[Assignment] Not enough questions of required type. Math: ${mathQuestions.length}, Reading: ${readingQuestions.length}`);
      throw new Error('Insufficient questions for module-type separation.');
    }

    // Assign 49 math questions to module 1, 49 reading-writing questions to module 2
    const module1Questions = shuffle(mathQuestions).slice(0, 49);
    const module2Questions = shuffle(readingQuestions).slice(0, 49);

    // Validate uniqueness between modules
    const module1Set = new Set(module1Questions.map(q => q.question));
    const module2Set = new Set(module2Questions.map(q => q.question));
    const overlap = [...module1Set].filter(q => module2Set.has(q));
    if (overlap.length > 0) {
      console.error(`[Assignment] ERROR: Duplicate questions found between Module 1 and Module 2 for test ${testId}:`, overlap);
      throw new Error(`Duplicate questions found between modules for test ${testId}`);
    }

    // Assign questions to modules
    for (let i = 0; i < 49; i++) {
      // Module 1 (math)
      try {
        const dbResult = await prisma.$queryRaw`SELECT TOP 1 * FROM [questions] WHERE CAST([question] AS NVARCHAR(MAX)) = ${module1Questions[i].question}`;
        let dbQuestion = null;
        if (!dbResult || dbResult.length === 0) {
          dbQuestion = await prisma.question.create({
            data: {
              question: module1Questions[i].question,
              passage: module1Questions[i].passage,
              options: JSON.stringify(module1Questions[i].options),
              correctAnswer: (() => {
                const ans = module1Questions[i].correctAnswer;
                if (typeof ans === 'number') return ans;
                if (Array.isArray(module1Questions[i].options) && typeof ans === 'string') {
                  const idx = module1Questions[i].options.indexOf(ans);
                  return idx >= 0 ? idx : 0;
                }
                return 0;
              })(),
              explanation: module1Questions[i].explanation ?? "",
              wrongAnswerExplanations: module1Questions[i].wrongAnswerExplanations ? JSON.stringify(module1Questions[i].wrongAnswerExplanations) : null,
              moduleType: 'math',
              category: module1Questions[i].category ?? module1Questions[i].topic ?? "",
              subtopic: module1Questions[i].subtopic,
              difficulty: module1Questions[i].difficulty ?? "",
              difficultyScore: module1Questions[i].difficultyScore,
              visualType: module1Questions[i].visualType,
              timeEstimate: 75,
              tags: JSON.stringify([]),
              isActive: true,
              isReserved: true
            }
          });
        } else {
          dbQuestion = dbResult[0];
        }
        await prisma.practiceTestQuestion.create({
          data: {
            practiceTestId: testId,
            questionId: dbQuestion.id,
            moduleIndex: 0,
            orderIndex: i + 1
          }
        });
      } catch (err) {
        console.error(`[Assignment] Error assigning math question to test ${testId} (module 0, order ${i + 1}):`, err);
      }
      // Module 2 (reading-writing)
      try {
        const dbResult = await prisma.$queryRaw`SELECT TOP 1 * FROM [questions] WHERE CAST([question] AS NVARCHAR(MAX)) = ${module2Questions[i].question}`;
        let dbQuestion = null;
        if (!dbResult || dbResult.length === 0) {
          dbQuestion = await prisma.question.create({
            data: {
              question: module2Questions[i].question,
              passage: module2Questions[i].passage,
              options: JSON.stringify(module2Questions[i].options),
              correctAnswer: (() => {
                const ans = module2Questions[i].correctAnswer;
                if (typeof ans === 'number') return ans;
                if (Array.isArray(module2Questions[i].options) && typeof ans === 'string') {
                  const idx = module2Questions[i].options.indexOf(ans);
                  return idx >= 0 ? idx : 0;
                }
                return 0;
              })(),
              explanation: module2Questions[i].explanation ?? "",
              wrongAnswerExplanations: module2Questions[i].wrongAnswerExplanations ? JSON.stringify(module2Questions[i].wrongAnswerExplanations) : null,
              moduleType: 'reading-writing',
              category: module2Questions[i].category ?? module2Questions[i].topic ?? "",
              subtopic: module2Questions[i].subtopic,
              difficulty: module2Questions[i].difficulty ?? "",
              difficultyScore: module2Questions[i].difficultyScore,
              visualType: module2Questions[i].visualType,
              timeEstimate: 75,
              tags: JSON.stringify([]),
              isActive: true,
              isReserved: true
            }
          });
        } else {
          dbQuestion = dbResult[0];
        }
        await prisma.practiceTestQuestion.create({
          data: {
            practiceTestId: testId,
            questionId: dbQuestion.id,
            moduleIndex: 1,
            orderIndex: i + 1
          }
        });
      } catch (err) {
        console.error(`[Assignment] Error assigning reading-writing question to test ${testId} (module 1, order ${i + 1}):`, err);
      }
    }
    // Mark these questions as assigned globally
    for (const q of module1Questions) assignedQuestions.add(q.question);
    for (const q of module2Questions) assignedQuestions.add(q.question);

    // Post-assignment validation
    // Fetch assigned questions for this test
    const assigned = await prisma.practiceTestQuestion.findMany({
      where: { practiceTestId: testId },
      include: { question: true },
      orderBy: [{ moduleIndex: 'asc' }, { orderIndex: 'asc' }],
    });
    const mathAssigned = assigned.filter(q => q.moduleIndex === 0 && q.question.moduleType !== 'math');
    const readingAssigned = assigned.filter(q => q.moduleIndex === 1 && q.question.moduleType !== 'reading-writing');
    if (mathAssigned.length > 0 || readingAssigned.length > 0) {
      console.error(`[Validation] Module-type mismatch detected for test ${testId}. Math mismatches: ${mathAssigned.length}, Reading mismatches: ${readingAssigned.length}`);
      if (mathAssigned.length > 0) {
        console.error('[Validation] Math module mismatches:', mathAssigned.map(q => q.question.question));
      }
      if (readingAssigned.length > 0) {
        console.error('[Validation] Reading module mismatches:', readingAssigned.map(q => q.question.question));
      }
      throw new Error('Module-type validation failed.');
    } else {
      console.log(`[Validation] Module-type separation passed for test ${testId}.`);
    }
  }
  console.log('[Assignment] Practice tests updated with fully unique questions per module and no repeats across tests.');
}

main().catch(e => { console.error(e); process.exit(1); });
