
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Map of batch files to topics
const batchFiles = [
  { file: 'batch-1771807531266-algebra.json', topic: 'algebra', moduleType: 'math' },
  { file: 'batch-1771809622480-statistics.json', topic: 'statistics', moduleType: 'math' },
  { file: 'batch-1771808696759-vocabulary.json', topic: 'vocabulary', moduleType: 'reading-writing' },
  { file: 'batch-1771809088893-rhetoric.json', topic: 'rhetoric', moduleType: 'reading-writing' },
  { file: 'batch-1771809367161-synthesis.json', topic: 'synthesis', moduleType: 'reading-writing' },
  { file: 'batch-1771808440071-reading-comp.json', topic: 'reading-comp', moduleType: 'reading-writing' }
];

// Practice Test IDs (replace with actual IDs from your DB)
const PRACTICE_TEST_IDS = [
  'SAT_PRACTICE_TEST_1_ID',
  'SAT_PRACTICE_TEST_2_ID'
];

async function main() {
  // Gather all available questions from batches
  const allQuestions: { [key: string]: any }[] = [];
  for (const { file, topic, moduleType } of batchFiles) {
    const filePath = path.join(__dirname, '../../generated-batches', file);
    if (!fs.existsSync(filePath)) continue;
    const batch = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const q of batch.questions) {
      allQuestions.push({ ...q, topic, moduleType });
    }
  }

  // Remove duplicates by question text
  const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.question, q])).values());

  if (uniqueQuestions.length < 98 * PRACTICE_TEST_IDS.length) {
    throw new Error(`Not enough unique questions to fill both practice tests. Needed: ${98 * PRACTICE_TEST_IDS.length}, Found: ${uniqueQuestions.length}`);
  }

  // Shuffle for randomness
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // For each practice test, assign 98 unique questions, 49 per module, no overlap
  for (const testId of PRACTICE_TEST_IDS) {
    // Remove all existing questions for this test
    await prisma.practiceTestQuestion.deleteMany({ where: { practiceTestId: testId } });

    // Select 98 unique questions for this test
    const testQuestions = shuffle(uniqueQuestions).slice(0, 98);
    const module1Questions = testQuestions.slice(0, 49);
    const module2Questions = testQuestions.slice(49, 98);

    // Insert questions and assign to modules
    for (let i = 0; i < 49; i++) {
      for (const [moduleIndex, q] of [[0, module1Questions[i]], [1, module2Questions[i]]]) {
        // Insert question if not already in DB
        let dbQuestion = await prisma.question.findFirst({ where: { question: q.question } });
        if (!dbQuestion) {
          dbQuestion = await prisma.question.create({
            data: {
              question: q.question,
              passage: q.passage,
              options: JSON.stringify(q.options),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              wrongAnswerExplanations: q.wrongAnswerExplanations ? JSON.stringify(q.wrongAnswerExplanations) : null,
              moduleType: q.moduleType,
              category: q.category || q.topic,
              subtopic: q.subtopic,
              difficulty: q.difficulty,
              difficultyScore: q.difficultyScore,
              visualType: q.visualType,
              timeEstimate: 75,
              tags: JSON.stringify([]),
              isActive: true,
              isReserved: true
            }
          });
        }
        await prisma.practiceTestQuestion.create({
          data: {
            practiceTestId: testId,
            questionId: dbQuestion.id,
            moduleIndex,
            orderIndex: i + 1
          }
        });
      }
    }
    console.log(`Practice Test ${testId}: 49 questions assigned to each module, all unique.`);
  }
  console.log('Practice tests updated with fully unique questions per module.');
}

main().catch(e => { console.error(e); process.exit(1); });
